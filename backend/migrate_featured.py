import sys
import os
# Add the 'backend' directory to sys.path so we can import from 'db'
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from db import SQLALCHEMY_DATABASE_URL

# For the script to work locally, we need to adjust the path if medlink.db is inside backend/
db_path = "backend/medlink.db"
# Since we are running from the root, we need to make sure SQLALCHEMY_DATABASE_URL points correctly.
# SQLALCHEMY_DATABASE_URL is "sqlite:///./medlink.db" in db.py
# If we run from root, we want "sqlite:///backend/medlink.db"

actual_url = SQLALCHEMY_DATABASE_URL.replace("./", "backend/")
engine = create_engine(actual_url)

with engine.connect() as conn:
    print(f"Connecting to {actual_url}...")
    print("Running migration for is_featured column...")
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN is_featured BOOLEAN DEFAULT 0"))
        conn.commit()
        print("Column is_featured added successfully.")
    except Exception as e:
        print(f"Note: Column might already exist or tables not ready: {e}")
    
    # Mark Top 3 Doctors
    conn.execute(text("UPDATE users SET is_featured = 1 WHERE id IN ('d1', 'd2', 'd3')"))
    # Mark Top 2 Pharmacies (we'll add more in seed)
    conn.execute(text("UPDATE users SET is_featured = 1 WHERE id IN ('ph1', 'ph2')"))
    conn.commit()
    print("Featured entities updated successfully.")
