from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.websocket import router as websocket_router
from app.services.matlab_service import MatlabService

@asynccontextmanager
async def lifespan(app: FastAPI):
    matlab_service = MatlabService()

    # Start MATLAB
    matlab_service.start()

    app.state.matlab = matlab_service

    yield

    # Stop MATLAB when FastAPI shuts down
    matlab_service.stop()

app = FastAPI(
    title="Audio Processing API",
    version="1.0.0",
    lifespan=lifespan
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