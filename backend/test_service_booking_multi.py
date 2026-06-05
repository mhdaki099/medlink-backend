import os
import sys
import tempfile
import unittest


TMP_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
TMP_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{TMP_DB.name}"
sys.path.insert(0, os.path.dirname(__file__))

from db import Base, SessionLocal, engine, ensure_sqlite_columns  # noqa: E402
from models import LabTest, User  # noqa: E402
from routers.labs import create_service_booking  # noqa: E402


class ServiceBookingMultiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        ensure_sqlite_columns()

    @classmethod
    def tearDownClass(cls):
        try:
            os.unlink(TMP_DB.name)
        except OSError:
            pass

    def setUp(self):
        self.db = SessionLocal()
        self.db.add_all([
            User(id="p_test", role="patient", name="Patient", email="p@test.local", password="x", is_active=True),
            User(id="lab_test", role="lab", name="Lab", email="lab@test.local", password="x", is_active=True),
            LabTest(id="lt_cbc", lab_id="lab_test", name="صورة دم كاملة CBC", price=10000, duration_hours=2),
            LabTest(id="lt_glucose", lab_id="lab_test", name="سكر الدم الصائم", price=15000, duration_hours=1),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_service_booking_saves_multiple_selected_services(self):
        selected_services = [
            {"id": "lt_cbc", "name": "صورة دم كاملة CBC", "price": 10000},
            {"id": "lt_glucose", "name": "سكر الدم الصائم", "price": 15000},
        ]

        booking = create_service_booking(
            {
                "patient_id": "p_test",
                "provider_id": "lab_test",
                "provider_role": "lab",
                "service_items": selected_services,
                "services_total": 25000,
                "date": "2026-06-10",
                "time": "09:00",
                "visit_type": "home_service",
                "home_service_fee": 5000,
            },
            current_user={"sub": "p_test", "role": "patient", "email": "p@test.local"},
            db=self.db,
        )

        self.assertEqual(
            booking["service_items"],
            [
                {"id": "lt_cbc", "name": "صورة دم كاملة CBC", "price": 10000.0, "duration_hours": 2, "preparation": None},
                {"id": "lt_glucose", "name": "سكر الدم الصائم", "price": 15000.0, "duration_hours": 1, "preparation": None},
            ],
        )
        self.assertEqual(booking["services_total"], 25000)
        self.assertEqual(booking["service_id"], "lt_cbc,lt_glucose")
        self.assertEqual(booking["service_name"], "صورة دم كاملة CBC، سكر الدم الصائم")


if __name__ == "__main__":
    unittest.main()
