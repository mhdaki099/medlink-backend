from auth_utils import verify_password
import sqlite3
import os

def test():
    # Use absolute path to DB or relative to current dir (backend)
    db_path = 'medlink.db'
    if not os.path.exists(db_path):
        db_path = os.path.join('..', 'backend', 'medlink.db')
        
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE email='admin@medlink.sy'")
    row = c.fetchone()
    conn.close()
    
    if not row:
        print("User not found")
        return
        
    hashed = row[0]
    print(f"Hashed: {hashed}")
    result = verify_password("123456", hashed)
    print(f"Match: {result}")

if __name__ == "__main__":
    test()
