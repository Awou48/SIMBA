import os

class Settings:
    PROJECT_NAME: str = "SIMBA API"
    SECRET_KEY: str = "simba-super-secret-key-that-is-very-long-and-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(BASE_DIR, 'data')

settings = Settings()