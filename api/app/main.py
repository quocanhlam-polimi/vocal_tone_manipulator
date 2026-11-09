from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.websocket import router as websocket_router

app = FastAPI(
    title="Audio Processing API",
    version="1.0.0"
)

# Allow Next.js frontend to communicate with Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Audio Processing API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(websocket_router)