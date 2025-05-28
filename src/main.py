import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routers import auth, tasks, site_pages
import settings
import socket_manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fast Task Tracker", description="I'm Batman")
app.mount("/static", StaticFiles(directory="src/static"), name="static")
app.include_router(router=auth.router, prefix=f"{settings.API_LINK}/auth")
app.include_router(router=tasks.router, prefix=f"{settings.API_LINK}/tasks")
app.include_router(router=site_pages.router)
app.include_router(router=socket_manager.router)


def main():
    """
    Starts the FastAPI application using uvicorn on main.py file run.
    """
    uvicorn.run(app="main:app", host="0.0.0.0", port=6969, reload=settings.DEBUG)

if __name__ == "__main__":
    main()
