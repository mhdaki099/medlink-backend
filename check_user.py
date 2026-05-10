import sqlite3
import os

db_path = os.path.join(os.getcwd(), 'backend', 'medlink.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'mohamadssss999@gmail.com'
cursor.execute("SELECT id, email, password, role FROM users WHERE email=?", (email,))
user = cursor.fetchone()

if user:
    print(f"User Found: ID={user[0]}, Email={user[1]}, Password={user[2][:20]}..., Role={user[3]}")
    # Check if it looks like a bcrypt hash (starts with $2b$)
    if user[2].startswith('$2b$'):
        print("Password looks HASHED.")
    else:
        print("Password is PLAINTEXT.")
else:
    print("User NOT FOUND.")

conn.close()
