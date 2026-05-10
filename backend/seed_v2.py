import sqlite3
import json

def seed_services():
    conn = sqlite3.connect('medlink.db')
    cursor = conn.cursor()
    
    services = [
        {"id": "s1", "name": "كشفية عامة", "price": 25000},
        {"id": "s2", "name": "استشارة تخصصية", "price": 40000},
        {"id": "s3", "name": "متابعة دورية", "price": 15000}
    ]
    
    cursor.execute("UPDATE users SET services = ? WHERE role = 'doctor'", (json.dumps(services),))
    conn.commit()
    conn.close()
    print("Doctor services seeded!")

if __name__ == "__main__":
    seed_services()
