from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime



class BasicUser(BaseModel):
    email: EmailStr

class UserCreate(BasicUser):
    password: str

    @field_validator
    def pasword_strenght(cls, v: str):
        if len(v) < 9:
            raise ValueError("Pasword must be at least 9 characters")
        return v
    
class UserLogin(BasicUser):
    pasword: str



class TaskBase(BaseModel):
    """
    Basic task schema
    """
    title: Optional[str] = "never gonna give you up"
    description: Optional[str] = None
    timer_lenght: Optional[str] = None

class TaskUpdate(TaskBase):
    """
    Schema to update task
    """
    is_completed: Optional[str]

class TaskResponce(TaskBase):
    """
    Task responce schema
    """
    id: int
    is_completed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    timer_status: bool
    timer_start: Optional[datetime] = None
    timer_stop: Optional[datetime] = None
    user_id: Optional[int]
    guest_id: Optional[str]

class TimerStart(BaseModel):
    task_id: int

class TimerEnd(BaseModel):
    task_id: int
    time_remaining: int
    is_completed: bool



class Token(BaseModel):
    """
    JWT token schema
    """
    access_token: str
    token_type: str
