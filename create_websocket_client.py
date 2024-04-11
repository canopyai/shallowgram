import asyncio
import websockets

async def websocket_client():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as websocket:
        # Sending a message
        await websocket.send("Hello, Server!")

        # Receiving a response
        response = await websocket.recv()
        asyncio.run(websocket_client())
        print(f"Received from server: {response}")

# Run the client

