"""
MedLink Backend - Main Application Entry Point
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import auth, patients, doctors, pharmacies, labs, warehouses, admin, appointments, orders, records, history_requests, prescriptions
from routers import drugs
from db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    init_db()  # Create tables once at startup
    yield


app = FastAPI(
    title="MedLink API",
    description="Healthcare Super App - Syria",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production set ALLOWED_ORIGINS env var, e.g. "https://myapp.com,https://admin.myapp.com"
_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()] if _origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=bool(_origins_env),  # Only allow credentials when origins are explicit
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
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
app.include_router(drugs.router, prefix="/api/drugs", tags=["Drug Catalog"])

# ── Static files ──────────────────────────────────────────────────────────────
assets_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))
if os.path.isdir(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


@app.get("/")
def root():
    return {"message": "MedLink API is running", "version": "1.0.0", "country": "Syria"}


@app.get("/health")
def health():
    """Lightweight health-check — verifies the DB is reachable."""
    from sqlalchemy import text
    from db import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
