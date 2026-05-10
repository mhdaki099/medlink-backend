import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from sqlalchemy import create_engine, text
from db import SQLALCHEMY_DATABASE_URL

actual_url = SQLALCHEMY_DATABASE_URL.replace("./", "backend/")
engine = create_engine(actual_url)

meds = [
    {
        "id": "m1", 
        "name": "أموكسيسيلين", 
        "dosage": "500 mg", 
        "image": "/assets/items_sample/item 1.png",
        "price": 4500,
        "old_price": 5200
    },
    {
        "id": "m2", 
        "name": "باراسيتامول", 
        "dosage": "500 mg", 
        "image": "/assets/items_sample/item 0.png",
        "price": 1200,
        "old_price": 1500
    },
    {
        "id": "m3", 
        "name": "أوميبرازول", 
        "dosage": "20 mg", 
        "image": "/assets/items_sample/item 2.png",
        "price": 6000,
        "old_price": 7500
    },
    {
        "id": "m4", 
        "name": "ازيثروميسين", 
        "dosage": "250 mg", 
        "image": "/assets/items_sample/item 3.png",
        "price": 8500,
        "old_price": 10000
    },
    {
        "id": "m5", 
        "name": "سيبروفلوكساسين", 
        "dosage": "500 mg", 
        "image": "/assets/items_sample/item 4.png",
        "price": 7200,
        "old_price": 8000
    },
]

with engine.connect() as conn:
    print("Updating medicines in database...")
    for m in meds:
        conn.execute(text("""
            UPDATE medicines 
            SET name = :name, 
                dosage = :dosage, 
                image = :image, 
                price = :price, 
                old_price = :old_price 
            WHERE id = :id
        """), m)
    conn.commit()
    print("Medicines updated with new assets, dosages, and prices.")
