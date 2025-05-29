from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from settings import TEMPLATES_DIR

router = APIRouter(tags=["site_pages"])
templates = Jinja2Templates(directory=TEMPLATES_DIR)

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """
    Renders the home page (index.html) with the given request context.
    """
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/tasks", response_class=HTMLResponse)
async def tasks_page(request: Request):
    """
    Renders the tasks page (tasks.html) with the given request context.
    """
    return templates.TemplateResponse("tasks.html", {"request": request})

@router.get("/auth", response_class=HTMLResponse)
async def auth_page(request: Request):
    """
    Renders the authentication page (auth.html) with the given request context.
    """
    return templates.TemplateResponse("auth.html", {"request": request})