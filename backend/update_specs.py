from db import SessionLocal
from models import User

def update_specializations():
    db = SessionLocal()
    try:
        # Mapping old names to new names
        mapping = {
            "قلبية وأوعية دموية": "قلبية",
            "أمراض الجهاز الهضمي": "هضمية",
            "طب الرئة والجهاز التنفسي": "الجهاز التنفسي",
            "أنف وأذن وحنجرة": "بلعوم",
            "الرئة": "الجهاز التنفسي"
        }
        
        doctors = db.query(User).filter(User.role == "doctor").all()
        count = 0
        for doctor in doctors:
            if doctor.specialization in mapping:
                doctor.specialization = mapping[doctor.specialization]
                count += 1
        
        db.commit()
        print(f"Successfully updated {count} doctor specialization names!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_specializations()
