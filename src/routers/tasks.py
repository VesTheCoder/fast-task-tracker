from fastapi import APIRouter, Request, Response, Depends, status, HTTPException
from sqlalchemy.orm import Session
from schemas import TaskCreate, TaskUpdate, TaskResponce
from models import Task
from datetime import datetime, timedelta
from typing import Optional
from database import get_db, SchedulerSession
from routers.auth import is_user_or_is_guest, create_guest_session_and_set_cookie
from apscheduler.schedulers.background import BackgroundScheduler

task_timer_scheduler = BackgroundScheduler()
task_timer_scheduler.start()
router = APIRouter(tags=["tasks"])

def create_task(
    db: Session, 
    task_info: TaskCreate, 
    guest_id: Optional[str] = None, 
    user_id: Optional[int] = None):
    """
    Creates a new task in the database for a user or guest.
    """
    if not guest_id and not user_id:
        raise ValueError("Provide user_id or guest_id - at least one field is mandatory")

    new_task = Task(
        title = task_info.title, 
        description = task_info.description,
        timer_lenght = task_info.timer_lenght,
        user_id = user_id,
        guest_id = guest_id)
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task
        

def get_tasks_list(db: Session, user_id: Optional[int] = None, guest_id: Optional[str] = None):
    """
    Retrieves a list of tasks for a user or guest from the database.
    """
    if guest_id:
        return db.query(Task).filter(Task.guest_id == guest_id).all()
    elif user_id:
        return db.query(Task).filter(Task.user_id == user_id).all()
    else:
        raise ValueError("Provide user_id or guest_id - at least one field is mandatory")
    
def get_task_by_id(
    db: Session, 
    task_id, 
    user_id: Optional[int] = None, 
    guest_id: Optional[str] = None):
    """
    Retrieves a specific task by ID for a user or guest from the database.
    """
    current_task = db.query(Task).filter(Task.id == task_id)

    if guest_id:
        return current_task.filter(Task.guest_id == guest_id).first()
    elif user_id:
        return current_task.filter(Task.user_id == user_id).first()
    else:
        raise ValueError("Provide user_id or guest_id - at least one field is mandatory")
    

def _catch_user_task(task_id: int, request: Request, db: Session):
    """
    The helper function to validate the fact of existance of
    exact task that user wants to interact with.
    No touching is recommended.
    """
    current_user = is_user_or_is_guest(request, db)

    if current_user["is_guest"]:
        if current_user["needs_cookie"]:
            raise FileNotFoundError("Auth cookie not found. Reload the page")
        task = get_task_by_id(db, task_id, guest_id = current_user["guest_id"])
    else:
        task = get_task_by_id(db, task_id, user_id = current_user["user_id"])

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="This task was not found, please reload the page")
    
    return task



@router.get("/", response_model=list[TaskResponce])
async def get_tasks(
    request: Request,
    db: Session = Depends(get_db)):
    
    current_user = is_user_or_is_guest(request, db)
    print(f"GET tasks - Current user state: {current_user}")  # Debug log
    
    if current_user["is_guest"]:
        if current_user["needs_cookie"]:
            return []
        else:
            tasks = get_tasks_list(db, guest_id=current_user["guest_id"])
            print(f"Retrieved {len(tasks)} tasks for guest ID: {current_user['guest_id']}")  # Debug log
            return tasks
    else:
        tasks = get_tasks_list(db, user_id=current_user["user_id"])
        print(f"Retrieved {len(tasks)} tasks for user ID: {current_user['user_id']}")  # Debug log
        return tasks

@router.post("/", response_model=TaskResponce)    
async def add_task(
    task_data: TaskCreate, 
    request: Request,
    response: Response,
    db: Session = Depends(get_db)):

    current_user = is_user_or_is_guest(request, db)
    print(f"Current user state: {current_user}")  # Debug log

    if current_user["is_guest"]:
        if current_user["needs_cookie"]:
            print("Creating new guest session and setting cookie")  # Debug log
            new_guest_session = create_guest_session_and_set_cookie(db, response)
            print(f"Created guest session with ID: {new_guest_session.id}")  # Debug log
            result = create_task(db, task_data, guest_id=new_guest_session.id)
            print(f"Created task with guest_id: {new_guest_session.id}")  # Debug log
            return result
        else:
            guest_id = current_user["guest_id"]
            print(f"Using existing guest session: {guest_id}")  # Debug log
            result = create_task(db, task_data, guest_id=guest_id)
            print(f"Created task with existing guest_id: {guest_id}")  # Debug log
            return result
    
    user_id = current_user["user_id"]
    print(f"Creating task for logged in user with ID: {user_id}")  # Debug log
    return create_task(db, task_data, user_id=user_id)

@router.delete("/", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    request: Request,
    db: Session = Depends(get_db)):

    task = _catch_user_task(task_id, request, db)

    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_200_OK)

@router.put("/{task_id}", response_model=TaskResponce)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    request: Request,
    db: Session = Depends(get_db)):

    task = _catch_user_task(task_id, request, db)
    
    if task_update.title:
        task.title = task_update.title
    if task_update.description:
        task.description = task_update.description
    if task_update.is_completed is not None:
        task.is_completed = task_update.is_completed
    if task_update.timer_lenght:
        task.timer_lenght = task_update.timer_lenght

    db.commit()
    db.refresh(task)

    return task



def timer_status_change(task_id: int):
    db_scheduler = SchedulerSession()
    try:
        task = db_scheduler.query(Task).filter(Task.id == task_id).first()
        if task and task.timer_active:
            task.timer_active = False
            db_scheduler.commit()
    finally:
        db_scheduler.close()

    return None

@router.put("/{task_id}/timer_start", response_model=TaskResponce)
def start_timer(
    task_id: int,
    request: Request,
    db: Session = Depends(get_db)):

    task = _catch_user_task(task_id, request, db)
    
    time_now = datetime.now()
    task.timer_start = time_now
    task.timer_stop = time_now + timedelta(seconds=task.timer_lenght)
    task.timer_active = True

    db.commit()
    db.refresh(task)

    task_timer_scheduler.add_job(timer_status_change, 'date', run_date=task.timer_stop, args=[task_id])

    return task

@router.put("/{task_id}/timer_stop", response_model=TaskResponce)
def stop_timer(
    task_id: int,
    request: Request,
    db: Session = Depends(get_db)):
    """
    Func that stops the timer on user's manual request
    """
    task = _catch_user_task(task_id, request, db)
    
    task.timer_active = False

    db.commit()
    db.refresh(task)

    return task
