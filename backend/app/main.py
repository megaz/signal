from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.api.v1.routers import ads, auth, brands, canvas, radar, review, trends
from app.websockets.collaboration import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="PULSE API",
    description="Creative intelligence backend for brand ad fatigue detection and refresh",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(brands.router, prefix="/api/v1/brands", tags=["brands"])
app.include_router(ads.router, prefix="/api/v1/ads", tags=["ads"])
app.include_router(canvas.router, prefix="/api/v1/canvas", tags=["canvas"])
app.include_router(review.router, prefix="/api/v1/review", tags=["review"])
app.include_router(trends.router, prefix="/api/v1/trends", tags=["trends"])
app.include_router(radar.router, prefix="/api/v1/radar", tags=["radar"])
app.include_router(ws_router, prefix="/ws", tags=["websockets"])


@app.get("/health")
async def health():
    return {"status": "ok"}
