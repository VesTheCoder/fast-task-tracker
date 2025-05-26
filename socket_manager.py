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
    # Ensure timer_seconds is a valid positive integer
    try:
        timer_seconds = int(timer_seconds)
        if timer_seconds <= 0:
            print(f"Invalid timer value: {timer_seconds}")
            await websocket.close(code=1003, reason="Invalid timer duration (must be > 0)")
            return
    except ValueError as e:
        print(f"Invalid timer value: {timer_seconds}, error: {e}")
        await websocket.close(code=1003, reason=f"Invalid timer format: {e}")
        return
        
    print(f"Starting timer WebSocket with {timer_seconds} seconds")
    await manager.connect(websocket)
    
    try:
        # Send initial timer value immediately
        await manager.send_personal_message(str(timer_seconds), websocket)
        
        remaining = timer_seconds
        while remaining > 0:
            await asyncio.sleep(1)
            remaining -= 1
            # Only send updates if there's still a connection
            if websocket in manager.active_connections:
                await manager.send_personal_message(str(remaining), websocket)
            else:
                print("WebSocket disconnected, stopping timer")
                break
                
        # Timer finished, send notification if still connected
        if websocket in manager.active_connections:
            print("Timer completed, sending notification")
            await manager.send_personal_message("TIMER_FINISHED", websocket)
    except WebSocketDisconnect:
        print("WebSocket disconnect detected")
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Error in timer WebSocket: {e}")
        if websocket in manager.active_connections:
            try:
                await manager.send_personal_message("ERROR", websocket)
            except:
                pass
            manager.disconnect(websocket)
