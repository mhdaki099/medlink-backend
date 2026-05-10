import sqlite3
def check():
    conn = sqlite3.connect('backend/medlink.db')
    c = conn.cursor()
    c.execute("SELECT email, password FROM users WHERE email='admin@medlink.sy'")
    user = c.fetchone()
    if user:
        with open('pwd_debug.txt', 'w') as f:
            f.write(f"Email: {user[0]}\nPassword Content: {user[1]}\nLength: {len(user[1])}")
    else:
        with open('pwd_debug.txt', 'w') as f:
            f.write("User not found")
    conn.close()

if __name__ == "__main__":
    check()
