from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import Order, WarehouseOrder, User, Medicine, WarehouseInventory, AuditLog, Notification, Prescription
from auth_utils import get_current_user
from utils.helpers import model_to_dict

router = APIRouter()


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


def _order_item_qty(item: dict) -> int:
    return max(1, int(item.get("qty") or item.get("quantity") or 1))


def _sync_medicine_stock_status(med: Medicine) -> None:
    qty = med.quantity or 0
    if qty <= 0:
        med.stock_status = "out_of_stock"
    elif med.stock_status == "out_of_stock":
        med.stock_status = "in_stock"


def _deduct_pharmacy_stock(db: Session, items: list, pharmacy_id: str) -> None:
    for item in items or []:
        med_id = item.get("medicine_id")
        if not med_id:
            continue
        med = db.query(Medicine).filter(Medicine.id == med_id).first()
        if not med or med.pharmacy_id != pharmacy_id:
            continue
        qty = _order_item_qty(item)
        available = med.quantity or 0
        if available < qty:
            raise HTTPException(400, f"الكمية غير كافية للدواء {med.name} (متوفر: {available})")
        med.quantity = available - qty
        _sync_medicine_stock_status(med)


def _restore_pharmacy_stock(db: Session, items: list, pharmacy_id: str) -> None:
    for item in items or []:
        med_id = item.get("medicine_id")
        if not med_id:
            continue
        med = db.query(Medicine).filter(Medicine.id == med_id).first()
        if not med or med.pharmacy_id != pharmacy_id:
            continue
        med.quantity = (med.quantity or 0) + _order_item_qty(item)
        _sync_medicine_stock_status(med)


def _enrich_order_items(db: Session, raw_items: list) -> list:
    enriched = []
    for item in raw_items or []:
        row = dict(item)
        med = None
        if row.get("medicine_id"):
            med = db.query(Medicine).filter(Medicine.id == row["medicine_id"]).first()
        if med:
            row["medicine"] = model_to_dict(med)
            if not row.get("name"):
                row["name"] = med.name
        enriched.append(row)
    return enriched


def _attach_prescription(db: Session, odict: dict) -> dict:
    presc = None
    if odict.get("prescription_id"):
        presc = db.query(Prescription).filter(Prescription.id == odict["prescription_id"]).first()
    elif odict.get("prescription_code"):
        presc = db.query(Prescription).filter(Prescription.prescription_code == odict["prescription_code"]).first()
    if presc:
        odict["prescription"] = model_to_dict(presc)
        doctor = db.query(User).filter(User.id == presc.doctor_id).first()
        if doctor:
            odict["prescription"]["doctor"] = model_to_dict(doctor, ["password"])
    return odict


@router.get("")
def list_orders(patient_id: str = Query(None), pharmacy_id: str = Query(None), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Order)
    if patient_id:
        query = query.filter(Order.patient_id == patient_id)
    if pharmacy_id:
        query = query.filter(Order.pharmacy_id == pharmacy_id)
    orders = query.all()
    results = []
    for o in orders:
        odict = model_to_dict(o)
        patient = db.query(User).filter(User.id == o.patient_id).first()
        pharmacy = db.query(User).filter(User.id == o.pharmacy_id).first()
        if patient:
            odict["patient"] = model_to_dict(patient, ["password"])
        if pharmacy:
            odict["pharmacy"] = model_to_dict(pharmacy, ["password"])
        odict["items"] = _enrich_order_items(db, odict.get("items") or [])
        results.append(_attach_prescription(db, odict))
    return results

@router.post("")
def create_order(order: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_id = order.get("patient_id")
    pharmacy_id = order.get("pharmacy_id")
    raw_items = order.get("items", []) or []
    if not patient_id or not pharmacy_id:
        raise HTTPException(400, "بيانات الطلب غير مكتملة")
    if not raw_items:
        raise HTTPException(400, "السلة فارغة")

    prescription_id = order.get("prescription_id")
    prescription_code = (order.get("prescription_code") or "").strip()
    presc = None
    if prescription_code:
        presc = db.query(Prescription).filter(Prescription.prescription_code == prescription_code).first()
        if not presc:
            raise HTTPException(400, "رمز الوصفة غير صحيح")
        if presc.patient_id != patient_id:
            raise HTTPException(403, "هذه الوصفة لا تخصك")
        prescription_id = presc.id
    elif prescription_id:
        presc = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not presc:
            raise HTTPException(400, "الوصفة غير موجودة")
        if presc.patient_id != patient_id:
            raise HTTPException(403, "هذه الوصفة لا تخصك")
        prescription_code = presc.prescription_code

    stored_items = []
    needs_prescription = False
    for item in raw_items:
        row = dict(item)
        med = db.query(Medicine).filter(Medicine.id == row.get("medicine_id")).first() if row.get("medicine_id") else None
        if med:
            if med.pharmacy_id != pharmacy_id:
                raise HTTPException(400, f"الدواء {med.name} لا يتبع هذه الصيدلية")
            if not row.get("name"):
                row["name"] = med.name
            if med.requires_prescription:
                needs_prescription = True
        stored_items.append(row)

    if needs_prescription and not prescription_id:
        raise HTTPException(400, "يرجى إدخال رمز الوصفة الطبية لهذا الطلب")

    now = datetime.now(timezone.utc).isoformat()
    order_id = f"ord_{uuid.uuid4().hex[:8]}"
    new_order = Order(
        id=order_id,
        patient_id=patient_id,
        pharmacy_id=pharmacy_id,
        prescription_id=prescription_id,
        prescription_code=prescription_code or None,
        items=stored_items,
        total=order.get("total", 0),
        status="pending_confirmation",
        delivery_address=order.get("delivery_address", ""),
        created_at=now,
        delivered_at=None,
    )
    _deduct_pharmacy_stock(db, stored_items, pharmacy_id)
    db.add(new_order)
    if new_order.patient_id:
        db.add(AuditLog(id=f"al_{uuid.uuid4().hex[:8]}", user_id=new_order.patient_id, action="order_medicine", details="طلب أدوية جديد", timestamp=now))
    patient = db.query(User).filter(User.id == patient_id).first()
    if pharmacy_id:
        item_names = "، ".join((i.get("name") or "دواء") for i in stored_items[:4])
        if len(stored_items) > 4:
            item_names += f" (+{len(stored_items) - 4})"
        rx_part = f" | وصفة: {prescription_code}" if prescription_code else ""
        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=pharmacy_id,
            title="طلب جديد 🛒",
            message=f"طلب من {patient.name if patient else 'مريض'}: {item_names}{rx_part}",
            type="new_order",
            created_at=now,
        ))
    db.commit()
    db.refresh(new_order)
    result = model_to_dict(new_order)
    result["items"] = _enrich_order_items(db, result.get("items") or [])
    return _attach_prescription(db, result)

@router.put("/{order_id}/status")
def update_order_status(order_id: str, status_update: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
    aliases = {"pending": "pending_confirmation", "processing": "preparing"}
    old_status = order.status
    new_status = aliases.get(status_update.get("status", order.status), status_update.get("status", order.status))
    if new_status == "cancelled" and old_status != "cancelled":
        _restore_pharmacy_stock(db, order.items or [], order.pharmacy_id)
    order.status = new_status
    if new_status == "delivered":
        order.delivered_at = datetime.now(timezone.utc).isoformat()
    STATUS_MSG = {"preparing": "تم قبول طلبك وجاري التجهيز", "delivered": "تم توصيل طلبك بنجاح", "cancelled": "تم إلغاء طلبك"}
    if new_status in STATUS_MSG and order.patient_id:
        db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=order.patient_id, title="تحديث الطلب", message=STATUS_MSG[new_status], type="order_update", created_at=datetime.now(timezone.utc).isoformat()))
    db.commit(); db.refresh(order)
    return model_to_dict(order)

@router.get("/warehouse")
def list_warehouse_orders(warehouse_id: str = Query(None), pharmacy_id: str = Query(None), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(WarehouseOrder)
    if warehouse_id:
        query = query.filter(WarehouseOrder.warehouse_id == warehouse_id)
    if pharmacy_id:
        query = query.filter(WarehouseOrder.pharmacy_id == pharmacy_id)
    results = []
    for wo in query.all():
        odict = model_to_dict(wo)
        odict["items"] = _enrich_warehouse_order_items(db, odict.get("items") or [])
        ph = db.query(User).filter(User.id == wo.pharmacy_id).first()
        wh = db.query(User).filter(User.id == wo.warehouse_id).first()
        if ph:
            odict["pharmacy"] = model_to_dict(ph, ["password"])
        if wh:
            odict["warehouse"] = model_to_dict(wh, ["password"])
        results.append(odict)
    return results


@router.put("/warehouse/{order_id}/confirm")
def pharmacy_confirm_warehouse_order(order_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.get("role") not in ("pharmacy", "admin"):
        raise HTTPException(403, "تأكيد الاستلام للصيدلية فقط")
    order = db.query(WarehouseOrder).filter(WarehouseOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
    if current_user.get("role") == "pharmacy" and current_user.get("sub") != order.pharmacy_id:
        raise HTTPException(403, "هذا الطلب لا يخص صيدليتك")
    if order.status != "shipped":
        raise HTTPException(400, "لا يمكن التأكيد إلا بعد شحن المستودع للطلب")
    now = datetime.now(timezone.utc).isoformat()
    order.status = "delivered"
    pharmacy = db.query(User).filter(User.id == order.pharmacy_id).first()
    db.add(Notification(
        id=f"ntf_{uuid.uuid4().hex[:8]}",
        user_id=order.warehouse_id,
        title="تم استلام الشحنة ✅",
        message=f"أكدت {pharmacy.name if pharmacy else 'الصيدلية'} استلام الطلب",
        type="warehouse_order",
        created_at=now,
    ))
    db.commit()
    db.refresh(order)
    result = model_to_dict(order)
    result["items"] = _enrich_warehouse_order_items(db, result.get("items") or [])
    return result

@router.post("/warehouse")
def create_warehouse_order(order: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    pharmacy_id = order.get("pharmacy_id")
    warehouse_id = order.get("warehouse_id")
    raw_items = order.get("items", []) or []
    if not pharmacy_id or not warehouse_id:
        raise HTTPException(400, "بيانات الطلب غير مكتملة")
    if not raw_items:
        raise HTTPException(400, "السلة فارغة")
    if current_user.get("role") == "pharmacy" and current_user.get("sub") != pharmacy_id:
        raise HTTPException(403, "غير مصرح لك بإنشاء هذا الطلب")

    stored_items = _enrich_warehouse_order_items(db, raw_items)
    now = datetime.now(timezone.utc).isoformat()
    wo_id = f"wo_{uuid.uuid4().hex[:8]}"
    new_wo = WarehouseOrder(
        id=wo_id, pharmacy_id=pharmacy_id, warehouse_id=warehouse_id,
        items=stored_items, total=order.get("total", 0), status="pending", created_at=now,
    )
    db.add(new_wo)

    pharmacy = db.query(User).filter(User.id == pharmacy_id).first()
    item_names = ", ".join((i.get("name") or i.get("item_id") or "صنف") for i in stored_items[:3])
    if len(stored_items) > 3:
        item_names += f" (+{len(stored_items) - 3})"
    db.add(Notification(
        id=f"ntf_{uuid.uuid4().hex[:8]}",
        user_id=warehouse_id,
        title="طلب جديد من صيدلية 🏭",
        message=f"طلب من {pharmacy.name if pharmacy else 'صيدلية'}: {item_names}",
        type="warehouse_order",
        created_at=now,
    ))
    db.commit()
    db.refresh(new_wo)
    result = model_to_dict(new_wo)
    result["items"] = _enrich_warehouse_order_items(db, result.get("items") or [])
    return result
