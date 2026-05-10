from sqlalchemy.orm import Session
from db import SessionLocal
from models import User
from auth_utils import hash_password

def migrate_passwords():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        count = 0
        for user in users:
            # Simple check: bcrypt hashes usually start with $2b$
            if not user.password.startswith("$2b$"):
                print(f"Hashing password for user: {user.email}")
                user.password = hash_password(user.password)
                count += 1
        
        db.commit()
        print(f"✅ Successfully hashed {count} passwords.")
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_passwords()
