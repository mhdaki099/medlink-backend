from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
import os
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import User, RegistrationRequest
from auth_utils import create_access_token, verify_password, hash_password, get_current_user
from utils.helpers import model_to_dict

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str
    phone: str = ""
    city: str = ""
    address: str = ""
    photo: str = ""
    clinic_name: str = ""
    clinic_address: str = ""
    price_per_session: float = 0.0
    experience_years: int = 0
    available_hours: str = ""
    working_hours: dict | None = None
    specialization: str = ""
    drug_allergies: list[str] = []
    open_hours: str = ""
    home_service_fee: float = 0.0
    documents: list[str] = []


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="الحساب معطّل. تواصل مع الإدارة.")

    # Exclude password from response
    user_data = model_to_dict(user, ["password"])
    
    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user_data}


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    role_aliases = {
        "laboratory": "lab",
        "radiology_center": "radiology",
        "radiology center": "radiology",
    }
    req.role = role_aliases.get(req.role, req.role)
    if req.role not in {"patient", "doctor", "pharmacy", "lab", "radiology", "warehouse"}:
        raise HTTPException(status_code=400, detail="نوع الحساب غير مدعوم")

    # Check email in users
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم مسبقاً")

    # Check email in pending requests
    if db.query(RegistrationRequest).filter(RegistrationRequest.email == req.email).first():
        raise HTTPException(status_code=400, detail="يوجد طلب تسجيل معلق لهذا البريد الإلكتروني. يرجى انتظار موافقة الإدارة.")
    
    # Check phone
    if req.phone:
        if db.query(User).filter(User.phone == req.phone).first():
            raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم مسبقاً")
    
    # Validate doctor registration requires the medical profile fields shown in the UI.
    if req.role == 'doctor':
        if not req.specialization:
            raise HTTPException(status_code=400, detail="يرجى اختيار التخصص الطبي")
        if req.price_per_session <= 0:
            raise HTTPException(status_code=400, detail="يرجى إدخال كشفية الاستشارة")
        if not (req.available_hours or req.working_hours):
            raise HTTPException(status_code=400, detail="يرجى إدخال ساعات العمل")
    
    # If Patient, create immediately
    if req.role == 'patient':
        new_id = f"p_{uuid.uuid4().hex[:8]}"
        full_name = f"{req.first_name} {req.last_name}".strip()
        new_user = User(
            id=new_id,
            role=req.role,
            name=full_name,
            email=req.email,
            password=hash_password(req.password),
            phone=req.phone,
            city=req.city,
            address=req.address,
            drug_allergies=req.drug_allergies,
            is_active=True,
            verified=False,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        user_data = model_to_dict(new_user, ["password"])
        token = create_access_token({"sub": new_id, "role": req.role, "email": req.email})
        return {"access_token": token, "token_type": "bearer", "user": user_data}
    
    # Otherwise, create registration request (doctor, pharmacy, lab, warehouse)
    request_id = f"req_{uuid.uuid4().hex[:8]}"
    pending_request = RegistrationRequest(
        id=request_id,
        role=req.role,
        email=req.email,
        data=req.dict(),
        created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(pending_request)
    db.commit()
    
    return {
        "status": "pending",
        "message": "تم استلام طلب التسجيل بنجاح. سيتم مراجعة الطلب من قبل الإدارة وتفعيله قريباً."
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    type: str = "document", # 'photo' or 'document'
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from utils.image_utils import save_upload_file, remove_white_background
    
    folder = "photos" if type == "photo" else "documents"
    relative_path, full_path = await save_upload_file(file, folder)
    
    if type == "photo":
        # Process image to remove background
        output_filename = f"processed_{os.path.basename(full_path).split('.')[0]}.png"
        output_path = os.path.join(os.path.dirname(full_path), output_filename)
        if await remove_white_background(full_path, output_path):
            # Update relative path to point to processed image
            relative_path = f"/assets/uploads/{folder}/{output_filename}"
            
    return {"url": relative_path}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the authenticated user's full profile."""
    user = db.query(User).filter(User.id == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return model_to_dict(user, ["password"])
