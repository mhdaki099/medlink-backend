from sqlalchemy.orm import Session
from db import SessionLocal
from models import User

def cleanup():
    db = SessionLocal()
    try:
        # Delete specific users
        targets = ["محمد", "دكتور محمد العاني"]
        for t in targets:
            user = db.query(User).filter(User.name == t).first()
            if user:
                print(f"Deleting user: {user.name} (ID: {user.id})")
                db.delete(user)
            else:
                print(f"User not found: {t}")
        
        db.commit()
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
