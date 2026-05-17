"""
MedLink v3 Migration - Add new columns for all enhancements
Run once: python migrate_v3.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "medlink.db")

MIGRATIONS = [
    # Medicine details (Req #13)
    "ALTER TABLE medicines ADD COLUMN active_ingredients TEXT",
    "ALTER TABLE medicines ADD COLUMN usage_info TEXT",
    "ALTER TABLE medicines ADD COLUMN side_effects TEXT",
    # Appointment reschedule/cancel/rejection (Req #3, #15)
    "ALTER TABLE appointments ADD COLUMN rejection_note TEXT",
    "ALTER TABLE appointments ADD COLUMN reschedule_requested BOOLEAN DEFAULT 0",
    "ALTER TABLE appointments ADD COLUMN cancel_requested BOOLEAN DEFAULT 0",
    "ALTER TABLE appointments ADD COLUMN requested_date TEXT",
    "ALTER TABLE appointments ADD COLUMN requested_time TEXT",
    # Medical record owner (Req #6)
    "ALTER TABLE medical_records ADD COLUMN record_owner TEXT DEFAULT 'self'",
]

def run():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for sql in MIGRATIONS:
        col_name = sql.split("ADD COLUMN ")[1].split(" ")[0]
        table_name = sql.split("TABLE ")[1].split(" ")[0]
        try:
            cursor.execute(sql)
            print(f"  ✅ Added {table_name}.{col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"  ⏭️  {table_name}.{col_name} already exists")
            else:
                print(f"  ❌ Error: {e}")
    
    conn.commit()
    conn.close()
    print("\n✅ Migration v3 complete!")

if __name__ == "__main__":
    run()
