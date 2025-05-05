from fastapi import FastAPI
from database import engine, Base, get_db


from routers import auth, tasks
import settings

import uvicorn

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fast Task Tracker", description="I'm Batman")
app.include_router(router=auth.router, prefix=f"{settings.API_LINK}/auth")
app.include_router(router=tasks.router, prefix=f"{settings.API_LINK}/tasks")


if __name__ == "__main__":
    uvicorn.run(app="main:app", host="127.0.0.1", port=8000, reload=settings.DEBUG)
