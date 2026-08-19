import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import upload, match, download

app = FastAPI(
    title="Name & Email Matching Tool API",
    version="1.0.0",
    description="Backend service for dual-file upload, column detection, and name-email matching.",
)

# Configure CORS for Vite frontend development servers
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Allow custom frontend URL from environment if provided
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not os.getenv("VERCEL") else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(match.router, prefix="/api", tags=["match"])
app.include_router(download.router, prefix="/api", tags=["download"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Name & Email Matching Tool API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
