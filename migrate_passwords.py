import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def needs_hashing(password: str) -> bool:
    # Bcrypt hashes usually start with $2b$ or $2a$
    return not (password.startswith("$2b$") or password.startswith("$2a$"))

def migrate():
    conn = sqlite3.connect('backend/medlink.db')
    c = conn.cursor()
    
    c.execute("SELECT id, email, password FROM users")
    users = c.fetchall()
    
    print(f"Checking {len(users)} users...")
    migrated = 0
    for user_id, email, password in users:
        if needs_hashing(password):
            hashed = pwd_context.hash(password)
            c.execute("UPDATE users SET password = ? WHERE id = ?", (hashed, user_id))
            print(f"Hashed password for: {email}")
            migrated += 1
            
    conn.commit()
    conn.close()
    print(f"Successfully migrated {migrated} passwords.")

if __name__ == "__main__":
    migrate()
