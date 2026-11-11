import json
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
from scipy.signal import butter, sosfilt, sosfilt_zi

from app.services.audio import AudioFilter

router = APIRouter()

@router.websocket("/ws/audio")
async def audio_stream(websocket: WebSocket):
    # origin = websocket.headers.get("origin")

    # if origin not in ALLOWED_ORIGINS:
    #     await websocket.close(code=1008)
    #     return

    await websocket.accept()

    matlab_service = websocket.app.state.matlab

    try:
        while True:
            message = await websocket.receive()

            # JSON configuration message
            if message.get("text"):
                data = json.loads(message["text"])

                if data["type"] == "init":
                    sample_rate = int(data["sampleRate"])
                    audio_filter = AudioFilter(sample_rate, matlab_service)

                elif data["type"] == "filter_config":
                    if audio_filter is None:
                        continue

                    audio_filter.configure(data["config"])

                    await websocket.send_json({
                        "type": "config_updated",
                        "status": "success",
                    })

            # Binary audio message
            elif message.get("bytes"):
                if audio_filter is None:
                    continue

                audio = np.frombuffer(
                    message["bytes"],
                    dtype=np.float32,
                )

                processed = await audio_filter.process(audio)

                await websocket.send_bytes(
                    processed.tobytes()
                )


    except WebSocketDisconnect:
        print("Audio client disconnected")