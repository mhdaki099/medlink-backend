from auth_utils import verify_password
import sqlite3

def test():
    conn = sqlite3.connect('backend/medlink.db')
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE email='admin@medlink.sy'")
    hashed = c.fetchone()[0]
    conn.close()
    
    print(f"Hashed: {hashed}")
    result = verify_password("123456", hashed)
    print(f"Match: {result}")

if __name__ == "__main__":
    test()
