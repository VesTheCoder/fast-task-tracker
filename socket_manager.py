from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

async def timer_websocket_endpoint(websocket: WebSocket, timer_seconds: int):
    '''
    Handles websocket connection for timer updates. Sends the remaining time every second.
    '''
    await manager.connect(websocket)
    try:
        remaining = timer_seconds
        while remaining > 0:
            await manager.send_personal_message(str(remaining), websocket)
            await asyncio.sleep(1)
            remaining -= 1
        # Timer finished, send notification
        await manager.send_personal_message("TIMER_FINISHED", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
