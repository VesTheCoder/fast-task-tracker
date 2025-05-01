from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid

class User(Base):
    """
    DB model that stores user profile info
    """
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, unique=True)
    pasword_hash = Column(String)
    created_at = Column(DateTime(timezone=True), default=func.now())
    tasks = relationship("Task", back_populates="users")


class Task(Base):
    """
    DB model that stores all the info about tasks
    """
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    timer_lenght = Column(Integer, nullable=True)
    timer_status = Column(Boolean, default=False)
    timer_start = Column(DateTime(timezone=True), nullable=True)
    timer_stop = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="tasks")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    guest_id = Column(String, nullable=True)

class GuestSession(Base):
    """
    DB model that stores temporary sessions info for guest users
    """
    __tablename__ = "guest_sessions"
    id = Column(String, primary_key=True, index=True, default=str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
