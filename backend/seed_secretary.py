import sqlite3
import os
from datetime import datetime
from auth_utils import hash_password

def seed_secretary():
    db_path = os.path.join('backend', 'medlink.db')
    if not os.path.exists(db_path):
        db_path = 'medlink.db'
        
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Check if already exists
    c.execute("SELECT id FROM users WHERE email='sec.amal@medlink.sy'")
    if c.fetchone():
        print("Secretary already exists.")
        conn.close()
        return

    hashed_pwd = hash_password("123456")
    
    c.execute("""
        INSERT INTO users (id, role, name, email, password, phone, city, supervisor_id, is_active, verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'sec_amal', 'secretary', 'أمل السكرتيرة', 'sec.amal@medlink.sy', 
        hashed_pwd, '0999888777', 'دمشق', 'd1', 1, 1, datetime.utcnow().isoformat()
    ))
    
    conn.commit()
    conn.close()
    print("Secretary 'sec.amal@medlink.sy' seeded with hashed password.")

if __name__ == "__main__":
    seed_secretary()
