from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from schemas import TaskCreate, TaskResponce
from models import Task
from datetime import datetime
from typing import Optional
from database import get_db
from routers.auth import is_user_or_is_guest


router = APIRouter(tags=["tasks"])

def create_task(db: Session, task_info: TaskCreate):
    if not task_info.user_id and not task_info.guest_id:
        raise ValueError("Provide user_id or guest_id - at least one field is mandatory")

    new_task = Task(
        title = task_info.title, 
        description = task_info.description,
        timer_lenght = task_info.timer_lenght,
        user_id = task_info.user_id,
        guest_id = task_info.guest_id,
        )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task

def timer_status_change(db: Session, task_id: int):
    catched_task = db.query(Task).filter(Task.id == task_id).first()
    if catched_task and catched_task.timer_status and catched_task.timer_stop <= datetime.now():
        catched_task.timer_status == False
        db.commit()

def get_tasks_list(db: Session, user_id: Optional[int], guest_id: Optional[str]):
    if guest_id:
        return db.query(Task).filter(Task.guest_id == guest_id).all()
    elif user_id:
        return db.query(Task).filter(Task.user_id == user_id).all()
    else:
        raise ValueError("Provide user_id or guest_id - at least one field is mandatory")



@router.post("/add", response_model=TaskResponce)    
async def add_task(task_data: TaskCreate, request: Request, db: Session = Depends(get_db)):
    user_type = is_user_or_is_guest(request, db)

    if user_type["is_guest"]:
        task_data.guest_id = user_type["guest_id"]
        task_data.user_id = None
        return create_task(db, task_data)
    else:
        task_data.user_id = user_type["user_id"]
        task_data.guest_id = None
        return create_task(db, task_data)
    
