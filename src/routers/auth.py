from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from schemas import UserCreate, UserLogin, Token, UserResponce
from models import User, GuestSession
from database import get_db
import settings

import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

router = APIRouter(tags=["auth"])


def verify_password(plain_password: str, hashed_password: str):
    """
    User pasword verification
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str):
    """
    User pasword hashing
    """
    return pwd_context.hash(password)

def get_user(db: Session, email: str):
    """
    Retrieves a user from the database by email.
    """
    return db.query(User).filter(User.email == email).first()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """
    Creates a JWT access token with the provided data and expiration delta.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_guest_session_and_set_cookie(db: Session, response: Response):
    """
    Creates a new guest session, adds it to the database, and sets the session cookie in the response.
    """
    new_guest_session = GuestSession()
    db.add(new_guest_session)
    db.commit()
    db.refresh(new_guest_session)

    response.set_cookie(
        key=settings.COOKIE_NAME, 
        value=new_guest_session.id, 
        max_age=settings.COOKIE_AGE,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="lax"
        )
 
    return new_guest_session

def is_user_or_is_guest(request: Request, db: Session = Depends(get_db)):
    """
    Determines if the current request is from a logged-in user or a guest, based on JWT or guest session cookie.
    """
    user_header = request.headers.get("Authorization")
    if user_header and user_header.startswith("Bearer"):
        try:
            user_token = user_header.replace("Bearer ", "")
            payload = jwt.decode(user_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_email = payload.get("sub")
            user = get_user(db, user_email)
            if user:
                return {"user_id": user.id, "is_guest": False, "needs_cookie": False}
        except (InvalidTokenError, AttributeError) as e:
            print(f"Token validation error: {e}")
    
    user_cookie = request.cookies.get(settings.COOKIE_NAME)
    if user_cookie:
        try:
            payload = jwt.decode(user_cookie, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_email = payload.get("sub")
            user = get_user(db, user_email)
            if user:
                return {"user_id": user.id, "is_guest": False, "needs_cookie": False}
        except Exception:
            guest_session = db.query(GuestSession).filter(GuestSession.id == user_cookie).first()
            if guest_session:
                return {"guest_id": user_cookie, "is_guest": True, "needs_cookie": False}
    
    return {"is_guest": True, "needs_cookie": True}
        


@router.post("/token", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)):
    """
    Authenticates a user and creates an access token using OAuth2 password flow.
    Verifies user credentials and sets a secure HTTP-only cookie with the JWT token.
    Returns the access token in the response body.
    """
    user = get_user(db, form_data.username)

    if not user or not verify_password(form_data.password, user.pasword_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This email is not registered or pasword is incorrect",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)

    response.set_cookie(
        key=settings.COOKIE_NAME, 
        value=access_token, 
        max_age=settings.COOKIE_AGE,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="lax"
        )

    return Token(access_token=access_token, token_type="bearer")



@router.post("/register", response_model=UserResponce)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Creates a new user account in the database.
    Checks for existing users with the same email to prevent duplicates.
    Returns the created user information.
    """
    user_in_db = get_user(db, user_data.email)
    if user_in_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists")
    
    user_in_db = User(
        email = user_data.email,
        pasword_hash = get_password_hash(user_data.password)
    )

    db.add(user_in_db)
    db.commit()
    db.refresh(user_in_db)

    return user_in_db



@router.post("/login")
async def login_user(response: Response, user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates a user with email and password.
    Creates a JWT access token and sets it as a secure HTTP-only cookie.
    Returns the access token in the response body.
    """
    user = get_user(db, user_data.email)

    if not user or not verify_password(user_data.pasword, user.pasword_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This email is not registered or pasword is incorrect",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key=settings.COOKIE_NAME, 
        value=access_token, 
        max_age=settings.COOKIE_AGE,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="lax"
        )
    
    return Token(access_token=access_token, token_type="bearer")



@router.post("/my-account")
async def logout_user(response: Response):
    """
    Logs out the current user by removing the authentication cookie.
    Returns a success message upon successful logout.
    """
    response.delete_cookie(settings.COOKIE_NAME)
    return {"message": "logout successfull"}



@router.get("/status")
async def auth_status(request: Request, db: Session = Depends(get_db)):
    """
    Returns the current authentication status and user info if logged in.
    """
    user_header = request.headers.get("Authorization")
    if user_header and user_header.startswith("Bearer"):
        try:
            user_token = user_header.replace("Bearer ", "")
            payload = jwt.decode(user_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_email = payload.get("sub")
            user = get_user(db, user_email)
            if user:
                return {"is_guest": False, "user_email": user.email}
        except (InvalidTokenError, AttributeError) as e:
            raise f"auth_status problem: {e}"

    user_cookie = request.cookies.get(settings.COOKIE_NAME)
    if user_cookie:
        try:
            payload = jwt.decode(user_cookie, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_email = payload.get("sub")
            user = get_user(db, user_email)
            if user:
                return {"is_guest": False, "user_email": user.email}
        except Exception:
            guest_session = db.query(GuestSession).filter(GuestSession.id == user_cookie).first()
            if guest_session:
                return {"is_guest": True}
    return {"is_guest": True}




