import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from db import SQLALCHEMY_DATABASE_URL

actual_url = SQLALCHEMY_DATABASE_URL.replace("./", "backend/")
engine = create_engine(actual_url)

with engine.connect() as conn:
    print(f"Connecting to {actual_url}...")
    print("Running migration for dosage column in medicines table...")
    try:
        conn.execute(text("ALTER TABLE medicines ADD COLUMN dosage VARCHAR"))
        conn.commit()
        print("Column dosage added successfully.")
    except Exception as e:
        print(f"Note: Column might already exist or tables not ready: {e}")
    
    print("Migration complete.")
