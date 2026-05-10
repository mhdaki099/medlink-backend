from passlib.context import CryptContext
import sqlite3
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db_path = os.path.join(os.getcwd(), 'backend', 'medlink.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'mohamadssss999@gmail.com'
password_to_check = '123456'

cursor.execute("SELECT password FROM users WHERE email=?", (email,))
stored_hash = cursor.fetchone()[0]

if pwd_context.verify(password_to_check, stored_hash):
    print("SUCCESS: Password matches hash.")
else:
    print("FAILURE: Password DOES NOT match hash.")

conn.close()
