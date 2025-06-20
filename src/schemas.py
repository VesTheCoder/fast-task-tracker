from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime



class BasicUser(BaseModel):
    email: EmailStr

class UserCreate(BasicUser):
    password: str

    @field_validator("password")
    def pasword_strenght(cls, v: str):
        if len(v) < 9:
            raise ValueError("Pasword must be at least 9 characters")
        return v
    
class UserResponce(BasicUser):
    id: int
    created_at: datetime
    
class UserLogin(BasicUser):
    pasword: str



class TaskBase(BaseModel):
    """
    Basic task schema
    """
    title: Optional[str] = "never gonna give you up"
    description: Optional[str] = None
    timer_lenght: Optional[int] = None

class TaskCreate(TaskBase):
    """
    Schema to create a task
    """
    pass

class TaskUpdate(TaskBase):
    """
    Schema to update a task
    """
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    timer_lenght: Optional[int] = None

class TaskResponce(TaskBase):
    """
    Task responce schema
    """
    id: int
    is_completed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    timer_active: bool
    timer_start: Optional[datetime] = None
    timer_stop: Optional[datetime] = None
    user_id: Optional[int] = None
    guest_id: Optional[str] = None
    



class Token(BaseModel):
    """
    JWT token schema
    """
    access_token: str
    token_type: str
