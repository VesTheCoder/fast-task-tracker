from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, routing
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from schemas import UserCreate, UserLogin, Token, UserResponce
from models import User
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
    return db.query(User).filter(User.email == email).first()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt



@router.post("/token", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
    ):

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
        secure=True,
        httponly=True,
        samesite="strict"
        )

    return Token(access_token=access_token, token_type="bearer")

@router.post("/register", response_model=UserResponce)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
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
        secure=True,
        httponly=True,
        samesite="strict"
        )
    
    return Token(access_token=access_token, token_type="bearer")

@router.post("/logout")
async def logout_user(response: Response):
    response.delete_cookie(settings.COOKIE_NAME)
    return {"message": "logout successfull"}




