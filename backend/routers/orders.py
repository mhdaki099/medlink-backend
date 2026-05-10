from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from db import get_db
from models import Order, WarehouseOrder, User, Medicine, AuditLog

router = APIRouter()

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

@router.get("")
def list_orders(patient_id: str = Query(None), pharmacy_id: str = Query(None), db: Session = Depends(get_db)):
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
            
        # Enrich items with medicine info
        enriched_items = []
        for item in (odict.get("items") or []):
            med = db.query(Medicine).filter(Medicine.id == item.get("medicine_id")).first()
            if med:
                item["medicine"] = model_to_dict(med)
            enriched_items.append(item)
        odict["items"] = enriched_items
            
        results.append(odict)
    return results

@router.post("")
def create_order(order: dict, db: Session = Depends(get_db)):
    order_id = f"ord_{uuid.uuid4().hex[:8]}"
    new_order = Order(
        id=order_id,
        patient_id=order.get("patient_id"),
        pharmacy_id=order.get("pharmacy_id"),
        items=order.get("items", []),
        total=order.get("total", 0),
        status="pending",
        delivery_address=order.get("delivery_address", ""),
        created_at=datetime.utcnow().isoformat(),
        delivered_at=None
    )
    db.add(new_order)
    
    # Audit log
    if new_order.patient_id:
        log_id = f"al_{uuid.uuid4().hex[:8]}"
        new_log = AuditLog(
            id=log_id,
            user_id=new_order.patient_id,
            action="order_medicine",
            details="طلب أدوية جديد",
            timestamp=new_order.created_at
        )
        db.add(new_log)
        
    db.commit()
    db.refresh(new_order)
    return model_to_dict(new_order)

@router.put("/{order_id}/status")
def update_order_status(order_id: str, status_update: dict, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
        
    new_status = status_update.get("status", order.status)
    order.status = new_status
    if new_status == "delivered":
        order.delivered_at = datetime.utcnow().isoformat()
        
    db.commit()
    db.refresh(order)
    return model_to_dict(order)

@router.get("/warehouse")
def list_warehouse_orders(warehouse_id: str = Query(None), pharmacy_id: str = Query(None), db: Session = Depends(get_db)):
    query = db.query(WarehouseOrder)
    if warehouse_id:
        query = query.filter(WarehouseOrder.warehouse_id == warehouse_id)
    if pharmacy_id:
        query = query.filter(WarehouseOrder.pharmacy_id == pharmacy_id)
    return [model_to_dict(wo) for wo in query.all()]

@router.post("/warehouse")
def create_warehouse_order(order: dict, db: Session = Depends(get_db)):
    wo_id = f"wo_{uuid.uuid4().hex[:8]}"
    new_wo = WarehouseOrder(
        id=wo_id,
        pharmacy_id=order.get("pharmacy_id"),
        warehouse_id=order.get("warehouse_id"),
        items=order.get("items", []),
        total=order.get("total", 0),
        status="pending",
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_wo)
    db.commit()
    db.refresh(new_wo)
    return model_to_dict(new_wo)
