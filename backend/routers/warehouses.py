from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from db import get_db
from models import User, WarehouseInventory, WarehouseOrder

router = APIRouter()

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

@router.get("")
def list_warehouses(db: Session = Depends(get_db)):
    warehouses = db.query(User).filter(User.role == "warehouse").all()
    return [model_to_dict(w, ["password"]) for w in warehouses]

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

@router.get("/{warehouse_id}/orders")
def get_orders(warehouse_id: str, db: Session = Depends(get_db)):
    orders = db.query(WarehouseOrder).filter(WarehouseOrder.warehouse_id == warehouse_id).all()
    results = []
    for o in orders:
        odict = model_to_dict(o)
        ph = db.query(User).filter(User.id == o.pharmacy_id).first()
        if ph:
            odict["pharmacy"] = model_to_dict(ph, ["password"])
        results.append(odict)
    return results

@router.put("/orders/{order_id}/status")
def update_order_status(order_id: str, status_update: dict, db: Session = Depends(get_db)):
    order = db.query(WarehouseOrder).filter(WarehouseOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "الطلب غير موجود")
        
    order.status = status_update.get("status", order.status)
    if "delivery_time" in status_update:
        order.delivery_time = status_update["delivery_time"]
        
    db.commit()
    db.refresh(order)
    return model_to_dict(order)

@router.post("/orders")
def create_order(order: dict, db: Session = Depends(get_db)):
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
