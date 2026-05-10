import sqlite3
import os

db_path = 'backend/medlink.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role, password, is_active FROM users")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    conn.close()
