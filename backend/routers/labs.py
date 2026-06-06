from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone

from db import get_db
from models import User, LabTest, LabBooking, LabResult, ServiceBooking, Notification
from auth_utils import get_current_user, require_role
from utils.helpers import model_to_dict
from utils.homepage_featured import query_homepage_providers

router = APIRouter()

VALID_TEST_AVAILABILITY = {
    "available", "limited", "unavailable", "out_of_stock", "out_of_service",
}
BOOKABLE_TEST_AVAILABILITY = {"available", "limited"}

@router.get("")
def list_labs(q: str = None, province: str = None, district: str = None, homepage: bool = False, db: Session = Depends(get_db)):
    if homepage:
        return [model_to_dict(l, ["password"]) for l in query_homepage_providers(db, "lab")]
    query = db.query(User).filter(User.role == "lab", User.is_active == True)
    if q:
        query = query.filter(User.name.ilike(f"%{q}%"))
    if province:
        query = query.filter(User.province.ilike(f"%{province}%"))
    if district:
        query = query.filter(User.district.ilike(f"%{district}%"))
    labs = query.all()
    return [model_to_dict(l, ["password"]) for l in labs]


@router.get("/radiology")
def list_radiology_centers(q: str = None, province: str = None, district: str = None, homepage: bool = False, db: Session = Depends(get_db)):
    if homepage:
        return [model_to_dict(c, ["password"]) for c in query_homepage_providers(db, "radiology")]
    query = db.query(User).filter(User.role == "radiology", User.is_active == True)
    if q:
        query = query.filter(User.name.ilike(f"%{q}%"))
    if province:
        query = query.filter(User.province.ilike(f"%{province}%"))
    if district:
        query = query.filter(User.district.ilike(f"%{district}%"))
    centers = query.all()
    return [model_to_dict(c, ["password"]) for c in centers]


@router.get("/service-bookings")
def list_service_bookings(
    patient_id: str = None,
    provider_id: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi import Query as Q
    query = db.query(ServiceBooking)
    if patient_id:
        query = query.filter(ServiceBooking.patient_id == patient_id)
    if provider_id:
        query = query.filter(ServiceBooking.provider_id == provider_id)
    results = []
    for b in query.order_by(ServiceBooking.created_at.desc()).all():
        bdict = model_to_dict(b)
        patient = db.query(User).filter(User.id == b.patient_id).first()
        provider = db.query(User).filter(User.id == b.provider_id).first()
        if patient:
            bdict["patient"] = model_to_dict(patient, ["password"])
        if provider:
            bdict["provider"] = model_to_dict(provider, ["password"])
        results.append(bdict)
    return results


@router.post("/service-bookings")
def create_service_booking(data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    provider_role = data.get("provider_role", "lab")
    if provider_role not in {"lab", "radiology"}:
        raise HTTPException(400, "نوع الخدمة غير مدعوم")
    visit_type = data.get("visit_type", "visit_center")
    if visit_type not in {"visit_center", "home_service"}:
        raise HTTPException(400, "نوع الزيارة غير صحيح")

    provider_id = data.get("provider_id")
    raw_items = data.get("service_items") or []
    service_items = None
    services_total = float(data.get("services_total", 0) or 0)
    service_id = data.get("service_id")
    service_name = data.get("service_name")

    if raw_items:
        if not isinstance(raw_items, list):
            raise HTTPException(400, "قائمة التحاليل غير صحيحة")
        requested_ids = [str(item.get("id")) for item in raw_items if item.get("id")]
        requested_ids = list(dict.fromkeys(requested_ids))
        if not requested_ids:
            raise HTTPException(400, "يرجى اختيار تحليل واحد على الأقل")

        tests = db.query(LabTest).filter(
            LabTest.lab_id == provider_id,
            LabTest.id.in_(requested_ids),
        ).all()
        tests_by_id = {test.id: test for test in tests}
        if len(tests_by_id) != len(requested_ids):
            raise HTTPException(400, "بعض التحاليل المختارة غير متوفرة في هذا المركز")

        ordered_tests = [tests_by_id[test_id] for test_id in requested_ids]
        unavailable = [
            test.name
            for test in ordered_tests
            if (test.availability_status or "available") not in BOOKABLE_TEST_AVAILABILITY
        ]
        if unavailable:
            raise HTTPException(400, f"بعض الخدمات غير متاحة للحجز: {', '.join(unavailable)}")
        service_items = [
            {
                "id": test.id,
                "name": test.name,
                "price": float(test.price or 0),
                "duration_hours": test.duration_hours,
                "preparation": test.preparation,
            }
            for test in ordered_tests
        ]
        services_total = sum(item["price"] for item in service_items)
        service_id = ",".join(item["id"] for item in service_items)
        service_name = "، ".join(item["name"] for item in service_items)

    # Check slot availability
    date = data.get("date")
    time = data.get("time")
    if provider_id and date and time:
        existing = db.query(ServiceBooking).filter(
            ServiceBooking.provider_id == provider_id,
            ServiceBooking.date == date,
            ServiceBooking.time == time,
            ServiceBooking.status.in_(["pending", "confirmed"]),
        ).first()
        if existing:
            raise HTTPException(409, "هذا الموعد محجوز بالفعل")

    now = datetime.now(timezone.utc).isoformat()
    booking = ServiceBooking(
        id=f"sb_{uuid.uuid4().hex[:8]}",
        patient_id=data.get("patient_id"),
        provider_id=provider_id,
        provider_role=provider_role,
        service_id=service_id,
        service_name=service_name,
        service_items=service_items,
        services_total=services_total,
        date=date,
        time=time,
        visit_type=visit_type,
        home_service_fee=float(data.get("home_service_fee", 0) or 0),
        reason=data.get("reason", ""),
        status="pending",
        created_at=now,
    )
    db.add(booking)
    db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=booking.provider_id, title="حجز خدمة جديد", message=f"تم إنشاء حجز {booking.service_name or ''} بتاريخ {booking.date} الساعة {booking.time}", type="service_booking", created_at=now))
    db.commit()
    db.refresh(booking)
    return model_to_dict(booking)


def _assert_provider_owns_booking(booking: ServiceBooking, current_user: dict):
    if current_user.get("role") == "admin":
        return
    if current_user.get("sub") != booking.provider_id:
        raise HTTPException(403, "ليس لديك صلاحية على هذا الحجز")


@router.put("/service-bookings/{booking_id}/status")
def update_service_booking_status(booking_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Approve, reject, or complete a service booking."""
    booking = db.query(ServiceBooking).filter(ServiceBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "الحجز غير موجود")
    if current_user.get("role") in ("lab", "radiology"):
        _assert_provider_owns_booking(booking, current_user)

    new_status = data.get("status", booking.status)
    if new_status not in ("pending", "confirmed", "rejected", "completed", "cancelled"):
        raise HTTPException(400, "حالة غير صحيحة")

    if new_status == "rejected":
        reason_type = data.get("rejection_reason_type")
        if not reason_type:
            raise HTTPException(400, "يجب تحديد سبب الرفض")
        booking.rejection_reason_type = reason_type
        booking.rejection_note = data.get("rejection_note", "")
        booking.recommended_provider_id = data.get("recommended_provider_id")

        # Notify patient
        now = datetime.now(timezone.utc).isoformat()
        reason_text = booking.rejection_note or ""
        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=booking.patient_id,
            title="تم رفض الحجز",
            message=f"تم رفض حجزك. {reason_text}",
            type="service_booking_rejected",
            created_at=now,
        ))
    elif new_status == "confirmed":
        now = datetime.now(timezone.utc).isoformat()
        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=booking.patient_id,
            title="تم تأكيد الحجز",
            message=f"تم تأكيد حجزك بتاريخ {booking.date} الساعة {booking.time}",
            type="service_booking_confirmed",
            created_at=now,
        ))

    booking.status = new_status
    db.commit()
    db.refresh(booking)
    return model_to_dict(booking)


@router.get("/service-bookings/{booking_id}/availability")
def get_provider_availability(booking_id: str, db: Session = Depends(get_db)):
    """Get booked slots for a provider on a given date."""
    booking = db.query(ServiceBooking).filter(ServiceBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "الحجز غير موجود")
    return model_to_dict(booking)


@router.get("/providers/{provider_id}/availability")
def get_provider_slots(provider_id: str, date: str = None, db: Session = Depends(get_db)):
    """Return available time slots and booked slots for a lab/radiology provider."""
    provider = db.query(User).filter(User.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "المزود غير موجود")

    booked = db.query(ServiceBooking).filter(
        ServiceBooking.provider_id == provider_id,
        ServiceBooking.status.in_(["pending", "confirmed"]),
    ).all()

    from routers.doctors import _resolve_doctor_time_slots
    # Reuse doctor slot logic; open_hours maps to available_hours on User
    if provider.open_hours and not provider.available_hours:
        provider.available_hours = provider.open_hours
    generated_slots = _resolve_doctor_time_slots(provider)

    wh = provider.working_hours or provider.open_hours or ""
    booked_filtered = [b for b in booked if not date or b.date == date]
    return {
        "time_slots": generated_slots,
        "booked_slots": [{"date": b.date, "time": b.time} for b in booked_filtered],
        "working_hours": wh,
    }

@router.get("/{provider_id}/analytics")
def get_provider_analytics(provider_id: str, db: Session = Depends(get_db)):
    from models import Favorite, ServiceBooking
    from datetime import timedelta
    provider = db.query(User).filter(User.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "المزود غير موجود")
    fav_count = db.query(Favorite).filter(Favorite.target_id == provider_id).count()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    bookings = db.query(ServiceBooking).filter(ServiceBooking.provider_id == provider_id).all()
    weekly = monthly = 0
    for b in bookings:
        if b.created_at >= week_ago:
            weekly += 1
        if b.created_at >= month_ago:
            monthly += 1
    return {
        "favorites_count": fav_count,
        "weekly_bookings": weekly,
        "monthly_bookings": monthly,
        "total_bookings": len(bookings),
    }


@router.get("/tests/all")
def all_tests(db: Session = Depends(get_db)):
    tests = db.query(LabTest).all()
    return [model_to_dict(t) for t in tests]

@router.get("/tests/{test_id}")
def get_test(test_id: str, db: Session = Depends(get_db)):
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "الفحص غير موجود")
    return model_to_dict(test)

@router.put("/bookings/{booking_id}/status")
def update_booking_status(booking_id: str, status_update: dict, current_user: dict = Depends(require_role("lab", "admin")), db: Session = Depends(get_db)):
    booking = db.query(LabBooking).filter(LabBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "الحجز غير موجود")
    booking.status = status_update.get("status", booking.status)
    db.commit(); db.refresh(booking)
    return model_to_dict(booking)

@router.get("/{lab_id}")
def get_lab(lab_id: str, db: Session = Depends(get_db)):
    provider = db.query(User).filter(
        User.id == lab_id,
        User.role.in_(["lab", "radiology"]),
    ).first()
    if not provider:
        raise HTTPException(404, "المزود غير موجود")
    return model_to_dict(provider, ["password"])

@router.get("/{lab_id}/tests")
def get_lab_tests(lab_id: str, db: Session = Depends(get_db)):
    tests = db.query(LabTest).filter(LabTest.lab_id == lab_id).all()
    return [model_to_dict(t) for t in tests]


@router.post("/{provider_id}/tests")
def add_provider_test(
    provider_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.get("role") not in ("admin", "lab", "radiology"):
        raise HTTPException(403, "ليس لديك صلاحية")
    if current_user.get("role") != "admin" and current_user.get("sub") != provider_id:
        raise HTTPException(403, "لا يمكنك إضافة فحوصات لمركز آخر")
    provider = db.query(User).filter(
        User.id == provider_id,
        User.role.in_(["lab", "radiology"]),
    ).first()
    if not provider:
        raise HTTPException(404, "المزود غير موجود")
    if not (data.get("name") or "").strip():
        raise HTTPException(400, "اسم الفحص مطلوب")
    availability = data.get("availability_status", "available")
    if availability not in VALID_TEST_AVAILABILITY:
        raise HTTPException(400, "حالة التوفر غير صحيحة")
    test = LabTest(
        id=f"lt_{uuid.uuid4().hex[:8]}",
        lab_id=provider_id,
        name=data.get("name", "").strip(),
        name_en=data.get("name_en", ""),
        category=data.get("category", "عام"),
        price=float(data.get("price", 0) or 0),
        duration_hours=int(data.get("duration_hours", 24) or 24),
        description=data.get("description", ""),
        preparation=data.get("preparation", ""),
        availability_status=availability,
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return model_to_dict(test)


@router.put("/tests/{test_id}")
def update_provider_test(
    test_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "الفحص غير موجود")
    if current_user.get("role") not in ("admin", "lab", "radiology"):
        raise HTTPException(403, "ليس لديك صلاحية")
    if current_user.get("role") != "admin" and current_user.get("sub") != test.lab_id:
        raise HTTPException(403, "لا يمكنك تعديل فحوصات مركز آخر")
    if "name" in data and data["name"]:
        test.name = data["name"].strip()
    if "name_en" in data:
        test.name_en = data["name_en"]
    if "category" in data:
        test.category = data["category"]
    if "price" in data:
        test.price = float(data["price"] or 0)
    if "duration_hours" in data:
        test.duration_hours = int(data["duration_hours"] or 24)
    if "description" in data:
        test.description = data["description"]
    if "preparation" in data:
        test.preparation = data["preparation"]
    if "availability_status" in data:
        status = data["availability_status"]
        if status not in VALID_TEST_AVAILABILITY:
            raise HTTPException(400, "حالة التوفر غير صحيحة")
        test.availability_status = status
    db.commit()
    db.refresh(test)
    return model_to_dict(test)


@router.delete("/tests/{test_id}")
def delete_provider_test(
    test_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "الفحص غير موجود")
    if current_user.get("role") not in ("admin", "lab", "radiology"):
        raise HTTPException(403, "ليس لديك صلاحية")
    if current_user.get("role") != "admin" and current_user.get("sub") != test.lab_id:
        raise HTTPException(403, "لا يمكنك حذف فحوصات مركز آخر")
    db.delete(test)
    db.commit()
    return {"message": "تم حذف الفحص"}


@router.get("/{lab_id}/bookings")
def get_bookings(lab_id: str, current_user: dict = Depends(require_role("lab", "radiology", "admin")), db: Session = Depends(get_db)):
    bookings = db.query(LabBooking).filter(LabBooking.lab_id == lab_id).all()
    results = []
    for b in bookings:
        bdict = model_to_dict(b)
        patient = db.query(User).filter(User.id == b.patient_id).first()
        test = db.query(LabTest).filter(LabTest.id == b.test_id).first()
        if patient:
            bdict["patient"] = model_to_dict(patient, ["password"])
        if test:
            bdict["test"] = model_to_dict(test)
        results.append(bdict)
    return results

@router.post("/{lab_id}/results")
def upload_result(lab_id: str, result: dict, current_user: dict = Depends(require_role("lab", "radiology", "admin")), db: Session = Depends(get_db)):
    result_id = f"lr_{uuid.uuid4().hex[:8]}"
    new_result = LabResult(id=result_id, booking_id=result.get("booking_id"), patient_id=result.get("patient_id"), lab_id=lab_id, test_id=result.get("test_id"), uploaded_by=result.get("uploaded_by"), date=result.get("date"), values=result.get("values", []), notes=result.get("notes"), doctor_note=result.get("doctor_note"))
    db.add(new_result); db.commit(); db.refresh(new_result)
    return model_to_dict(new_result)
