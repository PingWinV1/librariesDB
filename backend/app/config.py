import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL', 
        'postgresql://postgres:student@localhost:5432/libraries'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    SQLALCHEMY_POOL_SIZE = 5
    SQLALCHEMY_POOL_TIMEOUT = 30
    SQLALCHEMY_MAX_OVERFLOW = 10
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
    }