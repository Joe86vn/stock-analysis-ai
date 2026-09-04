import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routers.crawl import router as crawl_router
from routers.parser import router as parser_router

app = FastAPI(
    title="Valuex Analysis Worker",
    description="Dedicated Python worker for stock data crawling & PDF parsing",
    version="1.0.0"
)

# Cấu hình CORS để cho phép Next.js Frontend từ Netlify / Vercel / Localhost gọi tới
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hoặc giới hạn domain frontend khi production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WORKER_SECRET = os.environ.get("WORKER_SECRET", "")

@app.middleware("http")
async def verify_secret(request: Request, call_next):
    # Nếu có cấu hình WORKER_SECRET trong Environment Variables của HF Space
    # Cho phép bypass với /health và docs
    if WORKER_SECRET and request.url.path not in ["/health", "/", "/docs", "/openapi.json"]:
        provided_secret = request.headers.get("X-Worker-Secret", "")
        if provided_secret != WORKER_SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid X-Worker-Secret header")
    response = await call_next(request)
    return response

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "Valuex Analysis Worker",
        "features": ["crawl_service", "pdf_parser"]
    }

@app.get("/")
async def root():
    return {
        "message": "Valuex Analysis Worker is running",
        "docs": "/docs",
        "health": "/health"
    }

# Mount các routers
app.include_router(crawl_router)
app.include_router(parser_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=True)
