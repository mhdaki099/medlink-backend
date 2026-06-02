import uuid
from sqlalchemy import Boolean, Column, Integer, String, Float, Text, JSON, ForeignKey
from db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    role = Column(String, index=True)
    name = Column(String)
    name_en = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    phone = Column(String)
    dob = Column(String, nullable=True) 
    gender = Column(String, nullable=True)
    city = Column(String)
    address = Column(String)
    photo = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    verified = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    created_at = Column(String) 

    # Patient specific
    blood_type = Column(String, nullable=True)
    allergies = Column(JSON, nullable=True)
    drug_allergies = Column(JSON, nullable=True)
    chronic_conditions = Column(JSON, nullable=True)
    patient_unique_id = Column(String, unique=True, nullable=True, index=True)
    qr_code_url = Column(String, nullable=True)
    is_provisional = Column(Boolean, default=False)  # Unregistered patient placeholder

    # Doctor specific
    specialization = Column(String, nullable=True)
    specialization_en = Column(String, nullable=True)  # English name for filtering
    clinic_name = Column(String, nullable=True)
    clinic_address = Column(String, nullable=True)
    price_per_session = Column(Float, nullable=True)
    experience_years = Column(Integer, nullable=True)
    rating = Column(Float, nullable=True)
    total_reviews = Column(Integer, nullable=True)
    education = Column(JSON, nullable=True)
    languages = Column(JSON, nullable=True)
    available_days = Column(JSON, nullable=True)
    available_hours = Column(String, nullable=True)
    working_hours = Column(JSON, nullable=True)
    total_sessions = Column(Integer, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    # Pharmacy / Lab / Warehouse specific
    license_no = Column(String, nullable=True)
    association_no = Column(String, nullable=True)  # Medical association registration number
    open_hours = Column(String, nullable=True)
    home_service_fee = Column(Float, nullable=True, default=0)
    has_home_service = Column(Boolean, default=False)
    documents = Column(JSON, nullable=True)  # Uploaded document URLs

    # Location hierarchy (pharmacy / lab / radiology)
    province = Column(String, nullable=True)
    district = Column(String, nullable=True)
    area = Column(String, nullable=True)

    # Provider settings
    consultation_duration = Column(Integer, nullable=True, default=30)
    buffer_minutes = Column(Integer, nullable=True, default=10)
    facility_gallery = Column(JSON, nullable=True)

    # Patient emergency contact (API-ready for future alerts)
    emergency_contact = Column(JSON, nullable=True)

    # General / Corporate
    services = Column(JSON, nullable=True) # List of services offered
    supervisor_id = Column(String, ForeignKey("users.id"), nullable=True) # For Secretary -> Doctor link


class MedicalHistoryRequest(Base):
    __tablename__ = "medical_history_requests"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("users.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(String)


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"
    id = Column(String, primary_key=True, index=True, default=lambda: uuid.uuid4().hex)
    role = Column(String)
    email = Column(String, index=True)
    data = Column(JSON) # Full registration payload
    status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(String)


class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(String, primary_key=True, index=True)
    pharmacy_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    name_en = Column(String)
    category = Column(String, nullable=True)
    price = Column(Float)
    old_price = Column(Float, nullable=True)
    description = Column(String)
    manufacturer = Column(String)
    stock_status = Column(String)
    quantity = Column(Integer)
    dosage = Column(String, nullable=True) # e.g. 500mg, 10ml
    strength = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    image = Column(String, nullable=True)
    alternatives = Column(JSON, nullable=True)
    requires_prescription = Column(Boolean, default=False)
    active_ingredients = Column(Text, nullable=True)
    usage_info = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)
    contraindications = Column(Text, nullable=True)


class LabTest(Base):
    __tablename__ = "lab_tests"
    id = Column(String, primary_key=True, index=True)
    lab_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    name_en = Column(String)
    category = Column(String)
    price = Column(Float)
    duration_hours = Column(Integer)
    description = Column(String)
    preparation = Column(String, nullable=True)


class WarehouseInventory(Base):
    __tablename__ = "warehouse_inventory"
    id = Column(String, primary_key=True, index=True)
    warehouse_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    category = Column(String, nullable=True)
    strength = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    bulk_price = Column(Float)
    unit = Column(String)
    stock = Column(Integer)
    min_order = Column(Integer)


class FamilyLink(Base):
    __tablename__ = "family_links"
    id = Column(String, primary_key=True, index=True)
    main_patient_id = Column(String, ForeignKey("users.id"))
    linked_patient_id = Column(String, ForeignKey("users.id"), nullable=True)
    relation = Column(String)
    name = Column(String)
    phone = Column(String, nullable=True)
    consent_status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(String)


class ServiceBooking(Base):
    __tablename__ = "service_bookings"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("users.id"))
    provider_id = Column(String, ForeignKey("users.id"))
    provider_role = Column(String) # lab, radiology
    service_id = Column(String, nullable=True)
    service_name = Column(String, nullable=True)
    date = Column(String)
    time = Column(String)
    visit_type = Column(String, default="visit_center") # visit_center, home_service
    home_service_fee = Column(Float, default=0)
    status = Column(String, default="pending")  # pending, confirmed, rejected, completed
    reason = Column(Text, nullable=True)  # Patient's reason for booking
    rejection_note = Column(Text, nullable=True)
    rejection_reason_type = Column(String, nullable=True)  # test_unavailable | service_unavailable | other
    recommended_provider_id = Column(String, nullable=True)
    created_at = Column(String)


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("users.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    date = Column(String)
    time = Column(String)
    status = Column(String)
    notes = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)  # وصف الحالة / سبب الزيارة
    price = Column(Float)
    record_access_granted = Column(Boolean, default=False)
    created_at = Column(String)
    rejection_note = Column(Text, nullable=True)
    rejection_reason_type = Column(String, nullable=True)  # booked_by_phone | wrong_specialty | other
    recommended_specialty = Column(String, nullable=True)
    recommended_doctor_id = Column(String, nullable=True)
    reschedule_requested = Column(Boolean, default=False)
    cancel_requested = Column(Boolean, default=False)
    requested_date = Column(String, nullable=True)
    requested_time = Column(String, nullable=True)
    status_before_change = Column(String, nullable=True)  # restored if patient rejects doctor reschedule


class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("users.id"))
    pharmacy_id = Column(String, ForeignKey("users.id"))
    items = Column(JSON)
    total = Column(Float)
    status = Column(String)
    delivery_address = Column(String)
    created_at = Column(String)
    delivered_at = Column(String, nullable=True)


class WarehouseOrder(Base):
    __tablename__ = "warehouse_orders"
    id = Column(String, primary_key=True, index=True)
    pharmacy_id = Column(String, ForeignKey("users.id"))
    warehouse_id = Column(String, ForeignKey("users.id"))
    items = Column(JSON)
    total = Column(Float)
    status = Column(String)
    delivery_time = Column(String, nullable=True)
    created_at = Column(String)


class LabBooking(Base):
    __tablename__ = "lab_bookings"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("users.id"))
    lab_id = Column(String, ForeignKey("users.id"))
    test_id = Column(String, ForeignKey("lab_tests.id"))
    date = Column(String)
    time = Column(String)
    status = Column(String)
    created_at = Column(String)


class LabResult(Base):
    __tablename__ = "lab_results"
    id = Column(String, primary_key=True, index=True)
    booking_id = Column(String, ForeignKey("lab_bookings.id"))
    patient_id = Column(String, ForeignKey("users.id"))
    lab_id = Column(String, ForeignKey("users.id"))
    test_id = Column(String, ForeignKey("lab_tests.id"))
    uploaded_by = Column(String)
    date = Column(String)
    values = Column(JSON)
    notes = Column(Text, nullable=True)
    doctor_note = Column(Text, nullable=True)


class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("users.id"))
    uploaded_by = Column(String)
    type = Column(String)
    title = Column(String)
    content = Column(Text)
    date = Column(String)
    shared_with = Column(JSON, nullable=True)
    created_at = Column(String)
    record_owner = Column(String, nullable=True, default="self")  # self, child, father, mother, wife


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String)
    details = Column(String)
    timestamp = Column(String)


class Review(Base):
    __tablename__ = "reviews"
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("users.id"))
    target_id = Column(String, ForeignKey("users.id"))
    rating = Column(Float)
    comment = Column(Text, nullable=True)
    created_at = Column(String)


class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(String, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("users.id"))
    patient_id = Column(String, ForeignKey("users.id"))
    pharmacy_id = Column(String, ForeignKey("users.id"), nullable=True)
    prescription_code = Column(String, unique=True, index=True, nullable=True)
    medications = Column(JSON)
    fulfillment_items = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, partially_dispensed, fully_dispensed
    is_dispensed = Column(Boolean, default=False)
    created_at = Column(String)
    closed_at = Column(String, nullable=True)


class AppointmentAuditLog(Base):
    __tablename__ = "appointment_audit_logs"
    id = Column(String, primary_key=True, index=True)
    appointment_id = Column(String, ForeignKey("appointments.id"))
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(String)


class Payment(Base):
    __tablename__ = "payments"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    amount = Column(Float)
    currency = Column(String, default="SYP")
    status = Column(String)  # pending, completed, failed
    type = Column(String)  # appointment, order, lab
    reference_id = Column(String, nullable=True) # ID of appointment or order
    created_at = Column(String)

class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    target_id = Column(String, ForeignKey("users.id")) # doctor_id or pharmacy_id etc
    created_at = Column(String)

class FavoriteMedicine(Base):
    __tablename__ = "favorite_medicines"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    medicine_id = Column(String, ForeignKey("medicines.id"))
    created_at = Column(String)

class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    medicine_id = Column(String, ForeignKey("medicines.id"))
    quantity = Column(Integer, default=1)
    created_at = Column(String)

class PatientNote(Base):
    __tablename__ = "patient_notes"
    id = Column(String, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("users.id"))
    patient_id = Column(String, ForeignKey("users.id"))
    note_text = Column(Text)
    created_at = Column(String)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    type = Column(String) # e.g. "prescription", "appointment"
    is_read = Column(Boolean, default=False)
    created_at = Column(String)


class DrugCatalog(Base):
    __tablename__ = "drug_catalog"
    id = Column(String, primary_key=True, index=True)
    trade_name = Column(String, index=True)
    trade_name_en = Column(String, nullable=True)
    active_ingredient = Column(String, nullable=True)
    strength = Column(String, nullable=True)
    dosage_form = Column(String, nullable=True)  # tablet, syrup, injection, etc.
    manufacturer = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    category = Column(String, nullable=True)
    usage_info = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)
    requires_prescription = Column(Boolean, default=False)


class ConsultationReport(Base):
    __tablename__ = "consultation_reports"
    id = Column(String, primary_key=True, index=True)
    appointment_id = Column(String, ForeignKey("appointments.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    patient_id = Column(String, ForeignKey("users.id"))
    condition_summary = Column(Text, nullable=True)
    is_healthy = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    follow_up = Column(Text, nullable=True)
    created_at = Column(String)


class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id = Column(String, primary_key=True, index=True)
    consultation_report_id = Column(String, ForeignKey("consultation_reports.id"), nullable=True)
    doctor_id = Column(String, ForeignKey("users.id"))
    patient_id = Column(String, ForeignKey("users.id"))
    request_type = Column(String)  # lab, radiology
    service_name = Column(String, nullable=True)
    reference_code = Column(String, unique=True, nullable=True, index=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(String)
