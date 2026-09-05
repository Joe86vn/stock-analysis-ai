import os
import sys
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Đảm bảo đường dẫn module luôn chính xác dù chạy từ root hay worker dir
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from routers.crawl import router as crawl_router
from routers.parser import router as parser_router

app = FastAPI(
    title="Valuex Analysis Worker",
    description="Dedicated Python worker for stock data crawling & PDF parsing on Render",
    version="1.0.0"
)

# Cấu hình CORS để cho phép Next.js Frontend từ Netlify / Vercel / Localhost gọi tới
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WORKER_SECRET = os.environ.get("WORKER_SECRET", "")

@app.middleware("http")
async def verify_secret(request: Request, call_next):
    # Nếu có cấu hình WORKER_SECRET trong Environment Variables
    # Cho phép bypass với /health, /, /docs, /openapi.json
    if WORKER_SECRET and request.url.path not in ["/health", "/", "/docs", "/openapi.json"]:
        provided_secret = request.headers.get("X-Worker-Secret", "")
        if provided_secret != WORKER_SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid X-Worker-Secret header")
    response = await call_next(request)
    return response

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Valuex Analysis Worker",
        "platform": "Render",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "Valuex Analysis Worker",
        "features": ["crawl_service", "pdf_parser"]
    }

# Mount các routers
app.include_router(crawl_router)
app.include_router(parser_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
