import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()
# Debug mode settings (True on default)
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"

# Basic app settings
APP_NAME = os.environ.get("APP_NAME", "Fast Task Tracker")
API_LINK = "/api"

# Database settings
DATABASE = "sqlite:///db.sqlite3" if DEBUG else os.environ.get("DATABASE")

# Security settings
SECRET_KEY = "69secret69" if DEBUG else os.environ.get("SECRET_KEY")
COOKIE_NAME = "fast-task-tracker-session"
COOKIE_AGE = 60 * 60 * 24 * 30
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 30

# Static files directory settings
THIS_DIR = Path(__file__).resolve().parent
STATIC_DIR = str(THIS_DIR) + "/static"
TEMPLATES_DIR = str(THIS_DIR) + "/templates"

# Uvicorn server creds
HOST = "0.0.0.0"
PORT = 6969
