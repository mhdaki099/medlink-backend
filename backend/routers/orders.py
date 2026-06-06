from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
import uuid
import re

from db import get_db
from models import Order, WarehouseOrder, User, Medicine, WarehouseInventory, AuditLog, Notification, Prescription, PharmacyStockLog, WarehousePromoter
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
            if not row.get("category"):
                row["category"] = inv.category
            if not row.get("strength"):
                row["strength"] = inv.strength
        full_name = row.get("name") or ""
        if full_name and not row.get("base_name"):
            row["base_name"] = _normalize_warehouse_med_name(full_name) or full_name
        if full_name and not row.get("units_per_pack"):
            row["units_per_pack"] = _units_per_bulk_pack(full_name, row.get("unit") or "")
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


def _normalize_warehouse_med_name(name: str) -> str:
    return (name or "").split("(")[0].strip()


def _units_per_bulk_pack(name: str, unit: str) -> int:
    pack_match = re.search(r"حزم\s*(\d+)", name or "")
    if pack_match:
        return max(1, int(pack_match.group(1)))
    unit_match = re.search(r"(\d+)", unit or "")
    if unit_match:
        return max(1, int(unit_match.group(1)))
    return 1


def _find_pharmacy_medicine(db: Session, pharmacy_id: str, base_name: str):
    med = db.query(Medicine).filter(
        Medicine.pharmacy_id == pharmacy_id,
        Medicine.name == base_name,
    ).first()
    if med:
        return med
    for candidate in db.query(Medicine).filter(Medicine.pharmacy_id == pharmacy_id).all():
        cand_base = _normalize_warehouse_med_name(candidate.name)
        if cand_base == base_name or base_name in candidate.name or candidate.name in base_name:
            return candidate
    return None


def _invoice_line_map(order: WarehouseOrder) -> dict:
    inv = order.invoice if isinstance(order.invoice, dict) else {}
    mapping = {}
    for row in inv.get("items") or []:
        for key in (row.get("item_id"), row.get("name"), row.get("base_name")):
            if key:
                mapping[key] = row
    return mapping


def _log_pharmacy_stock(
    db: Session,
    *,
    pharmacy_id: str,
    medicine_id: str,
    quantity_before: int,
    quantity_after: int,
    quantity_added: int,
    invoice_number: Optional[str] = None,
    unit_price: Optional[float] = None,
    warehouse_order_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> None:
    db.add(PharmacyStockLog(
        id=f"psl_{uuid.uuid4().hex[:8]}",
        pharmacy_id=pharmacy_id,
        medicine_id=medicine_id,
        warehouse_order_id=warehouse_order_id,
        invoice_number=invoice_number,
        quantity_added=quantity_added,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        unit_price=unit_price,
        notes=notes,
        created_at=datetime.now(timezone.utc).isoformat(),
    ))


def _purchase_order_number(order: WarehouseOrder) -> str:
    if order.purchase_order_number:
        return order.purchase_order_number
    short = order.id.replace("wo_", "").upper()
    date_part = (order.created_at or datetime.now(timezone.utc).isoformat())[:10].replace("-", "")
    return f"PO-{date_part}-{short}"


def _generate_purchase_order_number(wo_id: str, created_at: str) -> str:
    date_part = (created_at or "")[:10].replace("-", "")
    short = wo_id.replace("wo_", "").upper()
    return f"PO-{date_part}-{short}"


def _promoter_invoice_payload(promoter: WarehousePromoter, pct: float, total: float) -> dict:
    return {
        "id": promoter.id,
        "code": promoter.code,
        "name": promoter.name,
        "phone": promoter.phone,
        "commission_percent": pct,
        "commission_amount": round(total * pct / 100, 2),
    }


def _apply_promoter_to_invoice(db: Session, invoice: dict, body: dict, warehouse_id: str) -> None:
    promoter = None
    promoter_id = body.get("promoter_id")
    promoter_code = str(body.get("promoter_code") or "").strip().upper().replace(" ", "-")
    if promoter_id:
        promoter = db.query(WarehousePromoter).filter(
            WarehousePromoter.id == promoter_id,
            WarehousePromoter.warehouse_id == warehouse_id,
        ).first()
        if not promoter:
            raise HTTPException(400, "المندوب غير موجود")
    elif promoter_code:
        promoter = db.query(WarehousePromoter).filter(
            WarehousePromoter.warehouse_id == warehouse_id,
            WarehousePromoter.code == promoter_code,
        ).first()
        if not promoter:
            raise HTTPException(400, "كود المندوب غير موجود")
    elif body.get("promoter_name"):
        pct = float(body.get("commission_percent") or 0)
        invoice["promoter"] = {
            "id": None,
            "code": promoter_code or None,
            "name": str(body.get("promoter_name")).strip(),
            "commission_percent": pct,
            "commission_amount": round(float(invoice.get("total") or 0) * pct / 100, 2),
        }
        return
    else:
        return
    if not promoter.code:
        from routers.warehouses import _ensure_promoter_code
        _ensure_promoter_code(db, promoter)
    pct = float(body["commission_percent"]) if body.get("commission_percent") is not None else float(promoter.commission_percent or 0)
    total = float(invoice.get("total") or 0)
    invoice["promoter"] = _promoter_invoice_payload(promoter, pct, total)


def _pharmacy_safe_invoice(invoice: dict) -> dict:
    """Strip internal warehouse fields (promoter commission) from invoices shown to pharmacies."""
    if not isinstance(invoice, dict):
        return invoice
    safe = dict(invoice)
    safe.pop("promoter", None)
    return safe


def build_warehouse_invoice(db: Session, order: WarehouseOrder) -> dict:
    wh = db.query(User).filter(User.id == order.warehouse_id).first()
    ph = db.query(User).filter(User.id == order.pharmacy_id).first()
    enriched = _enrich_warehouse_order_items(db, order.items or [])
    existing = order.invoice if isinstance(order.invoice, dict) else {}
    existing_items = {row.get("item_id"): dict(row) for row in (existing.get("items") or []) if row.get("item_id")}
    invoice_items = []
    subtotal = 0.0
    for item in enriched:
        qty = _order_item_qty(item)
        saved = existing_items.get(item.get("item_id"), {})
        unit_price = float(saved.get("unit_price") if saved.get("unit_price") is not None else (item.get("bulk_price") or 0))
        line_total = float(saved.get("line_total") if saved.get("line_total") is not None else unit_price * qty)
        subtotal += line_total
        invoice_items.append({
            "item_id": item.get("item_id"),
            "name": item.get("name"),
            "base_name": item.get("base_name"),
            "qty": qty,
            "unit": item.get("unit"),
            "unit_price": unit_price,
            "line_total": line_total,
            "retail_unit_price": saved.get("retail_unit_price"),
        })
    total = float(existing.get("total") if existing.get("total") is not None else (order.total or subtotal))
    po_number = _purchase_order_number(order)
    promoter = existing.get("promoter") or {}
    if promoter and promoter.get("commission_percent") is not None and not promoter.get("commission_amount"):
        promoter["commission_amount"] = round(total * float(promoter["commission_percent"]) / 100, 2)
    return {
        "number": existing.get("number") or f"INV-{order.id.replace('wo_', '').upper()}",
        "date": existing.get("date") or (order.created_at or "")[:10] or datetime.now(timezone.utc).isoformat()[:10],
        "order_id": order.id,
        "purchase_order_number": po_number,
        "order_status": order.status,
        "warehouse": model_to_dict(wh, ["password"]) if wh else {},
        "pharmacy": model_to_dict(ph, ["password"]) if ph else {},
        "items": invoice_items,
        "subtotal": round(subtotal, 2),
        "total": round(total, 2),
        "promoter": promoter,
        "notes": existing.get("notes") or "",
    }


def ensure_warehouse_invoice(db: Session, order: WarehouseOrder) -> dict:
    invoice = build_warehouse_invoice(db, order)
    order.invoice = invoice
    order.total = invoice.get("total") or order.total
    return invoice


def _apply_warehouse_delivery_to_pharmacy(db: Session, order: WarehouseOrder) -> list:
    """Add received warehouse items to the pharmacy medicine stock on confirm."""
    stock_updates = []
    enriched_items = _enrich_warehouse_order_items(db, order.items or [])
    price_map = _invoice_line_map(order)
    invoice_number = (order.invoice or {}).get("number") if isinstance(order.invoice, dict) else None
    for item in enriched_items:
        qty_packs = _order_item_qty(item)
        full_name = item.get("name") or ""
        base_name = item.get("base_name") or _normalize_warehouse_med_name(full_name) or full_name
        pack_units = int(item.get("units_per_pack") or _units_per_bulk_pack(full_name, item.get("unit") or "") or 1)
        units = qty_packs * max(1, pack_units)
        line = price_map.get(item.get("item_id")) or price_map.get(full_name) or price_map.get(base_name) or {}
        retail_price = line.get("retail_unit_price")
        if retail_price is None and line.get("unit_price"):
            retail_price = round(float(line["unit_price"]) / max(1, pack_units))
        med = _find_pharmacy_medicine(db, order.pharmacy_id, base_name)
        if med:
            before = med.quantity or 0
            med.quantity = before + units
            if retail_price is not None:
                med.price = float(retail_price)
            _sync_medicine_stock_status(med)
            _log_pharmacy_stock(
                db,
                pharmacy_id=order.pharmacy_id,
                medicine_id=med.id,
                quantity_before=before,
                quantity_after=med.quantity,
                quantity_added=units,
                invoice_number=invoice_number,
                unit_price=float(retail_price) if retail_price is not None else med.price,
                warehouse_order_id=order.id,
                notes="توريد من المستودع",
            )
            stock_updates.append({
                "medicine_id": med.id,
                "name": med.name,
                "added": units,
                "total": med.quantity,
                "price": med.price,
                "invoice_number": invoice_number,
                "created": False,
            })
            continue
        inv = None
        if item.get("item_id"):
            inv = db.query(WarehouseInventory).filter(WarehouseInventory.id == item["item_id"]).first()
        bulk_price = float(item.get("bulk_price") or (inv.bulk_price if inv else 0) or 0)
        pack_units = _units_per_bulk_pack(full_name, item.get("unit") or "")
        if retail_price is None:
            retail_price = round(bulk_price / pack_units) if bulk_price and pack_units else 0
        else:
            retail_price = float(retail_price)
        med_id = f"m_{uuid.uuid4().hex[:8]}"
        new_med = Medicine(
            id=med_id,
            pharmacy_id=order.pharmacy_id,
            name=base_name,
            name_en="",
            category=(inv.category if inv else None),
            price=retail_price,
            description="",
            manufacturer="",
            stock_status="in_stock" if units > 0 else "out_of_stock",
            quantity=units,
            dosage=(inv.strength if inv else None),
            strength=(inv.strength if inv else None),
            requires_prescription=False,
            alternatives=[],
        )
        db.add(new_med)
        _log_pharmacy_stock(
            db,
            pharmacy_id=order.pharmacy_id,
            medicine_id=med_id,
            quantity_before=0,
            quantity_after=units,
            quantity_added=units,
            invoice_number=invoice_number,
            unit_price=retail_price,
            warehouse_order_id=order.id,
            notes="توريد جديد من المستودع",
        )
        stock_updates.append({
            "medicine_id": med_id,
            "name": base_name,
            "added": units,
            "total": units,
            "price": retail_price,
            "invoice_number": invoice_number,
            "created": True,
        })
    return stock_updates


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
    role = current_user.get("role")
    if role == "pharmacy":
        pharmacy_id = current_user.get("sub")
    elif role == "warehouse":
        warehouse_id = current_user.get("sub")
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
        if role == "pharmacy" and isinstance(odict.get("invoice"), dict):
            odict["invoice"] = _pharmacy_safe_invoice(odict["invoice"])
        results.append(odict)
    return results


@router.get("/warehouse/{order_id}/invoice")
def get_warehouse_order_invoice(order_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(WarehouseOrder).filter(WarehouseOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
    role = current_user.get("role")
    if role == "pharmacy" and current_user.get("sub") != order.pharmacy_id:
        raise HTTPException(403, "غير مصرح")
    if role == "warehouse" and current_user.get("sub") != order.warehouse_id:
        raise HTTPException(403, "غير مصرح")
    invoice = build_warehouse_invoice(db, order)
    if role == "pharmacy":
        return _pharmacy_safe_invoice(invoice)
    return invoice


@router.put("/warehouse/{order_id}/invoice")
def update_warehouse_order_invoice(order_id: str, body: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.get("role") not in ("warehouse", "admin"):
        raise HTTPException(403, "تعديل الفاتورة للمستودع فقط")
    order = db.query(WarehouseOrder).filter(WarehouseOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
    if current_user.get("role") == "warehouse" and current_user.get("sub") != order.warehouse_id:
        raise HTTPException(403, "غير مصرح")
    current = build_warehouse_invoice(db, order)
    if body.get("number"):
        current["number"] = str(body["number"]).strip()
    if body.get("date"):
        current["date"] = str(body["date"]).strip()
    if body.get("notes") is not None:
        current["notes"] = str(body.get("notes") or "")
    if body.get("items"):
        by_id = {row.get("item_id"): row for row in current.get("items") or []}
        for upd in body["items"]:
            item_id = upd.get("item_id")
            if not item_id or item_id not in by_id:
                continue
            row = by_id[item_id]
            if "unit_price" in upd:
                row["unit_price"] = float(upd["unit_price"] or 0)
            if "qty" in upd:
                row["qty"] = max(1, int(upd["qty"] or 1))
            if "retail_unit_price" in upd:
                row["retail_unit_price"] = float(upd["retail_unit_price"] or 0)
            row["line_total"] = float(row.get("unit_price") or 0) * int(row.get("qty") or 1)
        current["items"] = list(by_id.values())
        current["subtotal"] = round(sum(float(i.get("line_total") or 0) for i in current["items"]), 2)
    if body.get("total") is not None:
        current["total"] = float(body.get("total") or 0)
    else:
        current["total"] = current.get("subtotal") or order.total
    if "promoter_id" in body or "promoter_code" in body or "promoter_name" in body or "commission_percent" in body:
        _apply_promoter_to_invoice(db, current, body, order.warehouse_id)
    elif body.get("clear_promoter"):
        current["promoter"] = {}
    order.invoice = current
    order.total = current["total"]
    db.commit()
    db.refresh(order)
    return build_warehouse_invoice(db, order)


@router.put("/warehouse/{order_id}/confirm")
def pharmacy_confirm_warehouse_order(order_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.get("role") not in ("pharmacy", "admin"):
        raise HTTPException(403, "تأكيد الاستلام للصيدلية فقط")
    order = db.query(WarehouseOrder).filter(WarehouseOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
    if current_user.get("role") == "pharmacy" and current_user.get("sub") != order.pharmacy_id:
        raise HTTPException(403, "هذا الطلب لا يخص صيدليتك")
    if order.status == "delivered":
        raise HTTPException(400, "تم تأكيد استلام هذا الطلب مسبقاً")
    if order.status != "shipped":
        raise HTTPException(400, "لا يمكن التأكيد إلا بعد شحن المستودع للطلب")
    now = datetime.now(timezone.utc).isoformat()
    stock_updates = _apply_warehouse_delivery_to_pharmacy(db, order)
    order.status = "delivered"
    order.delivery_time = now
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
    result["stock_updates"] = stock_updates
    result["invoice"] = _pharmacy_safe_invoice(build_warehouse_invoice(db, order))
    wh = db.query(User).filter(User.id == order.warehouse_id).first()
    if wh:
        result["warehouse"] = model_to_dict(wh, ["password"])
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
    po_number = _generate_purchase_order_number(wo_id, now)
    new_wo = WarehouseOrder(
        id=wo_id, pharmacy_id=pharmacy_id, warehouse_id=warehouse_id,
        purchase_order_number=po_number,
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
        message=f"طلب شراء {po_number} من {pharmacy.name if pharmacy else 'صيدلية'}: {item_names}",
        type="warehouse_order",
        created_at=now,
    ))
    db.commit()
    db.refresh(new_wo)
    result = model_to_dict(new_wo)
    result["items"] = _enrich_warehouse_order_items(db, result.get("items") or [])
    return result
