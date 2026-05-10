import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Medicine
from db import SQLALCHEMY_DATABASE_URL

actual_url = SQLALCHEMY_DATABASE_URL.replace("./", "backend/")
engine = create_engine(actual_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Available premium items
IMAGES = [
    "/assets/items_sample/item 0.png",
    "/assets/items_sample/item 1.png",
    "/assets/items_sample/item 2.png",
    "/assets/items_sample/item 3.png",
    "/assets/items_sample/item 4.png",
]

try:
    meds = db.query(Medicine).all()
    print(f"Updating {len(meds)} medicines...")
    for i, med in enumerate(meds):
        med.image = IMAGES[i % len(IMAGES)]
    db.commit()
    print("Done! All medicines now use authorized sample assets.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
