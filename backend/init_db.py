from db import engine, Base
import models

# This will create all tables in models.py that don't exist yet
Base.metadata.create_all(bind=engine)
print("All database tables initialized successfully!")
