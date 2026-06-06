from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import User, WarehouseInventory, WarehouseOrder, Notification
from auth_utils import get_current_user, require_role
from utils.helpers import model_to_dict

router = APIRouter()


def _order_item_qty(item: dict) -> int:
    return max(1, int(item.get("qty") or item.get("quantity") or 1))


def _deduct_warehouse_inventory(db: Session, raw_items: list) -> None:
    enriched = _enrich_warehouse_order_items(db, raw_items)
    for item in enriched:
        item_id = item.get("item_id")
        if not item_id:
            continue
        inv = db.query(WarehouseInventory).filter(WarehouseInventory.id == item_id).first()
        if not inv:
            continue
        qty = _order_item_qty(item)
        available = inv.stock or 0
        if available < qty:
            raise HTTPException(400, f"مخزون غير كافٍ للصنف {inv.name} (متوفر: {available})")
        inv.stock = available - qty


def _restore_warehouse_inventory(db: Session, raw_items: list) -> None:
    enriched = _enrich_warehouse_order_items(db, raw_items)
    for item in enriched:
        item_id = item.get("item_id")
        if not item_id:
            continue
        inv = db.query(WarehouseInventory).filter(WarehouseInventory.id == item_id).first()
        if not inv:
            continue
        inv.stock = (inv.stock or 0) + _order_item_qty(item)


def _enrich_warehouse_order_items(db: Session, raw_items: list) -> list:
    enriched = []
    for item in raw_items or []:
        row = dict(item)
        inv = None
        if row.get("item_id"):
            inv = db.query(WarehouseInventory).filter(WarehouseInventory.id == row["item_id"]).first()
        if inv:
            if not row.get("name"):
                row["name"] = inv.name
            row["unit"] = inv.unit
            if row.get("bulk_price") is None:
                row["bulk_price"] = inv.bulk_price
        enriched.append(row)
    return enriched


@router.get("")
def list_warehouses(db: Session = Depends(get_db)):
    warehouses = db.query(User).filter(User.role == "warehouse").all()
    return [model_to_dict(w, ["password"]) for w in warehouses]

@router.put("/orders/{order_id}/status")
def update_order_status(order_id: str, status_update: dict, current_user: dict = Depends(require_role("warehouse", "admin")), db: Session = Depends(get_db)):
    order = db.query(WarehouseOrder).filter(WarehouseOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
    if current_user.get("role") == "warehouse" and current_user.get("sub") != order.warehouse_id:
        raise HTTPException(403, "غير مصرح لك بتحديث هذا الطلب")
    new_status = status_update.get("status", order.status)
    if new_status == "delivered":
        raise HTTPException(403, "تأكيد الاستلام يتم من الصيدلية فقط")
    allowed = {"processing", "shipped", "cancelled"}
    if new_status not in allowed:
        raise HTTPException(400, "حالة غير صالحة للمستودع")
    if new_status == "processing" and order.status not in ("pending",):
        raise HTTPException(400, "لا يمكن قبول هذا الطلب")
    if new_status == "shipped" and order.status not in ("processing",):
        raise HTTPException(400, "يجب تجهيز الطلب قبل الشحن")
    if new_status == "cancelled" and order.status not in ("pending", "processing"):
        raise HTTPException(400, "لا يمكن إلغاء هذا الطلب")
    now = datetime.now(timezone.utc).isoformat()
    old_status = order.status
    if new_status == "shipped" and old_status == "processing":
        _deduct_warehouse_inventory(db, order.items or [])
    if new_status == "cancelled" and old_status == "processing":
        _restore_warehouse_inventory(db, order.items or [])
    order.status = new_status
    if "delivery_time" in status_update:
        order.delivery_time = status_update["delivery_time"]
    if new_status == "shipped":
        pharmacy = db.query(User).filter(User.id == order.pharmacy_id).first()
        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=order.pharmacy_id,
            title="شحنة من المستودع 🚚",
            message=f"تم شحن طلبك من المستودع — يرجى تأكيد الاستلام عند الوصول",
            type="warehouse_order",
            created_at=now,
        ))
    db.commit(); db.refresh(order)
    return model_to_dict(order)

@router.post("/orders")
def create_order(order: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    wo_id = f"wo_{uuid.uuid4().hex[:8]}"
    new_wo = WarehouseOrder(id=wo_id, pharmacy_id=order.get("pharmacy_id"), warehouse_id=order.get("warehouse_id"), items=order.get("items", []), total=order.get("total", 0), status="pending", created_at=datetime.now(timezone.utc).isoformat())
    db.add(new_wo); db.commit(); db.refresh(new_wo)
    return model_to_dict(new_wo)

@router.get("/{warehouse_id}")
def get_warehouse(warehouse_id: str, db: Session = Depends(get_db)):
    w = db.query(User).filter(User.id == warehouse_id, User.role == "warehouse").first()
    if not w:
        raise HTTPException(404, "المستودع غير موجود")
    return model_to_dict(w, ["password"])

@router.get("/{warehouse_id}/inventory")
def get_inventory(warehouse_id: str, db: Session = Depends(get_db)):
    items = db.query(WarehouseInventory).filter(WarehouseInventory.warehouse_id == warehouse_id).all()
    return [model_to_dict(i) for i in items]


@router.post("/{warehouse_id}/inventory")
def add_inventory_item(warehouse_id: str, item: dict, current_user: dict = Depends(require_role("warehouse", "admin")), db: Session = Depends(get_db)):
    if current_user.get("role") == "warehouse" and current_user.get("sub") != warehouse_id:
        raise HTTPException(403, "غير مصرح لك بإضافة مخزون لهذا المستودع")
    new_item = WarehouseInventory(
        id=f"wi_{uuid.uuid4().hex[:8]}",
        warehouse_id=warehouse_id,
        name=item.get("name", ""),
        category=item.get("category") or None,
        strength=item.get("strength"),
        barcode=item.get("barcode"),
        bulk_price=float(item.get("bulk_price", item.get("price", 0)) or 0),
        unit=item.get("unit", "علبة"),
        stock=int(item.get("stock", item.get("quantity", 0)) or 0),
        min_order=int(item.get("min_order", 1) or 1),
    )
    if not new_item.name:
        raise HTTPException(400, "اسم الصنف مطلوب")
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return model_to_dict(new_item)


@router.put("/inventory/{item_id}")
def update_inventory_item(item_id: str, updates: dict, current_user: dict = Depends(require_role("warehouse", "admin")), db: Session = Depends(get_db)):
    item = db.query(WarehouseInventory).filter(WarehouseInventory.id == item_id).first()
    if not item:
        raise HTTPException(404, "الصنف غير موجود")
    for key in ["name", "category", "strength", "barcode", "bulk_price", "unit", "stock", "min_order"]:
        if key in updates:
            setattr(item, key, updates[key])
    db.commit()
    db.refresh(item)
    return model_to_dict(item)

@router.get("/{warehouse_id}/orders")
def get_orders(warehouse_id: str, current_user: dict = Depends(require_role("warehouse", "pharmacy", "admin")), db: Session = Depends(get_db)):
    orders = db.query(WarehouseOrder).filter(WarehouseOrder.warehouse_id == warehouse_id).all()
    results = []
    for o in orders:
        odict = model_to_dict(o)
        odict["items"] = _enrich_warehouse_order_items(db, odict.get("items") or [])
        ph = db.query(User).filter(User.id == o.pharmacy_id).first()
        if ph:
            odict["pharmacy"] = model_to_dict(ph, ["password"])
        results.append(odict)
    return results

@router.post("/{warehouse_id}/bulk-upload")
async def bulk_upload_inventory(warehouse_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_role("warehouse", "admin")), db: Session = Depends(get_db)):
    import openpyxl, io
    content = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active
    headers = [str(c.value or "").strip().lower() for c in ws[1]]
    added = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        data = dict(zip(headers, row))
        if not data.get("name"):
            continue
        item = WarehouseInventory(
            id=f"wi_{uuid.uuid4().hex[:8]}", warehouse_id=warehouse_id,
            name=str(data.get("name", "")), category=str(data.get("category", "") or ""),
            strength=str(data.get("strength", "") or ""),
            barcode=str(data.get("barcode", "") or ""),
            bulk_price=float(data.get("bulk_price", 0) or data.get("price", 0) or 0),  # FIX: use bulk_price column
            stock=int(data.get("stock", 0) or data.get("quantity", 0) or 0),
            unit=str(data.get("unit", "") or ""),
            min_order=int(data.get("min_order", 1) or 1),
        )
        db.add(item); added += 1
    db.commit()
    return {"message": f"تم إضافة {added} عنصر بنجاح", "count": added}


@router.post("/{warehouse_id}/inventory/upload-excel")
async def upload_inventory_excel_alias(warehouse_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_role("warehouse", "admin")), db: Session = Depends(get_db)):
    return await bulk_upload_inventory(warehouse_id, file, current_user, db)
