from db import engine
from models import Base

def sync_db():
    print("Synchronizing database schema...")
    Base.metadata.create_all(bind=engine)
    print("All tables synchronized successfully!")

if __name__ == "__main__":
    sync_db()
