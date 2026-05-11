# init_db.py
from app.db.database import engine, Base
from app.db.models import *

print("Building new tables in PostgreSQL...")
Base.metadata.create_all(bind=engine)
print("✅ Tables built successfully!")