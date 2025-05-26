from fastapi import FastAPI, Request, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

from database import engine, Base
from routers import auth, tasks
import settings
from socket_manager import timer_websocket_endpoint

import uvicorn

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fast Task Tracker", description="I'm Batman")

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Include API routers
app.include_router(router=auth.router, prefix=f"{settings.API_LINK}/auth")
app.include_router(router=tasks.router, prefix=f"{settings.API_LINK}/tasks")

# Routes for HTML pages
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/tasks", response_class=HTMLResponse)
async def tasks_page(request: Request):
    return templates.TemplateResponse("tasks.html", {"request": request})

@app.get("/auth", response_class=HTMLResponse)
async def auth_page(request: Request):
    return templates.TemplateResponse("auth.html", {"request": request})

# WebSocket endpoint for timer
@app.websocket("/ws/timer/{timer_seconds}")
async def websocket_endpoint(websocket: WebSocket, timer_seconds: int):
    try:
        # Validate timer seconds
        if timer_seconds <= 0:
            await websocket.close(code=1003, reason="Invalid timer duration")
            return
        
        # Process the timer
        await timer_websocket_endpoint(websocket, timer_seconds)
    except ValueError as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1003, reason=str(e))
        except Exception:
            pass

if __name__ == "__main__":
    uvicorn.run(app="main:app", host="127.0.0.1", port=6969, reload=settings.DEBUG)
