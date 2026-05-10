import sqlite3

def dump_all_users():
    conn = sqlite3.connect('backend/medlink.db')
    c = conn.cursor()
    
    with open('db_all_users.txt', 'w', encoding='utf-8') as f:
        f.write("--- ALL USERS ---\n")
        c.execute("SELECT id, role, name, email, password FROM users")
        for u in c.fetchall():
            pwd_hint = u[4][:10] + "..." if u[4] else "NONE"
            is_hashed = u[4].startswith("$2b$") if u[4] else False
            f.write(f"ID: {u[0]}, Role: {u[1]}, Name: {u[2]}, Email: {u[3]}, PwdHint: {pwd_hint}, Hashed: {is_hashed}\n")
            
    conn.close()
    print("Dump complete -> db_all_users.txt")

if __name__ == "__main__":
    dump_all_users()
