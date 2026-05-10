"""
MedLink Backend - Main Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import auth, patients, doctors, pharmacies, labs, warehouses, admin, appointments, orders, records, history_requests, prescriptions
import os

app = FastAPI(
    title="MedLink API",
    description="Healthcare Super App - Syria",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(doctors.router, prefix="/api/doctors", tags=["Doctors"])
app.include_router(pharmacies.router, prefix="/api/pharmacies", tags=["Pharmacies"])
app.include_router(labs.router, prefix="/api/labs", tags=["Laboratories"])
app.include_router(warehouses.router, prefix="/api/warehouses", tags=["Warehouses"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(records.router, prefix="/api/records", tags=["Medical Records"])
app.include_router(history_requests.router, prefix="/api/history-requests", tags=["Medical History Requests"])
app.include_router(prescriptions.router, prefix="/api/prescriptions", tags=["Prescriptions"])

# Serve static files (doctor photos, logo, etc.)
assets_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))
if os.path.isdir(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


@app.get("/")
def root():
    return {"message": "MedLink API is running", "version": "1.0.0", "country": "Syria"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/debug")
def debug():
    from db import SessionLocal
    from models import User
    try:
        db = SessionLocal()
        user_count = db.query(User).count()
        users = [{"id": u.id, "email": u.email, "role": u.role} for u in db.query(User).limit(5).all()]
        db.close()
        return {"user_count": user_count, "sample_users": users, "status": "ok"}
    except Exception as e:
        return {"error": str(e), "status": "failed"}
