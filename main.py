from typing import Union
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def start_test():
    return f"Test MSG BOIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII"

