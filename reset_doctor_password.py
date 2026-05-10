from passlib.context import CryptContext
import sqlite3
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db_path = os.path.join(os.getcwd(), 'backend', 'medlink.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'mohamadssss999@gmail.com'
new_password = '123456'
hashed_password = pwd_context.hash(new_password)

cursor.execute("UPDATE users SET password=? WHERE email=?", (hashed_password, email))
conn.commit()

if cursor.rowcount > 0:
    print(f"SUCCESS: Password for {email} updated and hashed.")
else:
    print(f"FAILURE: User {email} not found.")

conn.close()
