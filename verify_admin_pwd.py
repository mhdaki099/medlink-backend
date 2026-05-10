from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

admin_hash = "$2b$12$GzFY/sQMNvcQemgmBF9exuveG4wCVQw81dwFyzW8FhV/0k4kg3e7e"
print(f"Password '123456' verify: {verify_password('123456', admin_hash)}")
