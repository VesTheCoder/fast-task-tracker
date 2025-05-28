from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import List
import asyncio

router = APIRouter(tags=["socket_manager"])

class ConnectionManager:
    def __init__(self):
        """
        Initializes the ConnectionManager with an empty list of active WebSocket connections.
        """
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        Accepts a new WebSocket connection and adds it to the list of active connections.
        """
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """
        Removes a WebSocket connection from the list of active connections.
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """
        Sends a personal message to a specific WebSocket connection.
        """
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        """
        Sends a message to all active WebSocket connections.
        """
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

async def timer_websocket_endpoint(websocket: WebSocket, timer_seconds: int):
    """
    Handles websocket connection for timer updates. Sends the remaining time every second.
    """
    try:
        timer_seconds = int(timer_seconds)
        if timer_seconds <= 0:
            await websocket.close(code=1003, reason="Invalid timer duration (must be > 0)")
            return
    except ValueError as e:
        await websocket.close(code=1003, reason=f"Invalid timer format: {e}")
        return
        
    await manager.connect(websocket)
    
    try:
        await manager.send_personal_message(str(timer_seconds), websocket)
        remaining = timer_seconds
        while remaining > 0:
            await asyncio.sleep(1)
            remaining -= 1
            if websocket in manager.active_connections:
                await manager.send_personal_message(str(remaining), websocket)
            else:
                break
                
        if websocket in manager.active_connections:
            await manager.send_personal_message("TIMER_FINISHED", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        if websocket in manager.active_connections:
            await manager.send_personal_message("ERROR", websocket)
            manager.disconnect(websocket)


@router.websocket("/ws/timer/{timer_seconds}")
async def websocket_endpoint(websocket: WebSocket, timer_seconds: int):
    """
    WebSocket endpoint for timer. Validates the timer and delegates to the timer handler.
    """
    try:
        if timer_seconds <= 0:
            await websocket.close(code=1003, reason="Invalid timer duration")
            return

        await timer_websocket_endpoint(websocket, timer_seconds)
    except ValueError as e:
        try:
            await websocket.close(code=1003, reason=str(e))
        except Exception:
            pass
