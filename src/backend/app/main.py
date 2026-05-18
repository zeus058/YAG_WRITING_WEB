"""
Điểm khởi chạy chính (Entry Point) của API Server — YAG Writing Novels Web.

Cấu hình:
- CORS Middleware cho phép Frontend Next.js kết nối.
- Rate Limiting (slowapi) tại API Gateway chống Brute-force.
- Đăng ký các router endpoints từ app/api/.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


# === Khởi tạo Rate Limiter toàn cục ===
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """
    Quản lý vòng đời ứng dụng:
    - Startup: Khởi tạo kết nối Database, Redis, RabbitMQ.
    - Shutdown: Đóng kết nối an toàn.
    """
    # TODO: Khởi tạo kết nối PostgreSQL (AsyncSession)
    # TODO: Khởi tạo kết nối Redis
    yield
    # TODO: Đóng kết nối Database
    # TODO: Đóng kết nối Redis


# === Khởi tạo ứng dụng FastAPI ===
app = FastAPI(
    title="YAG - Writing Novels Web API",
    description="API Server cho nền tảng viết truyện trực tuyến tích hợp AI",
    version="0.1.0",
    lifespan=lifespan,
)

# === Đăng ký Rate Limiter vào ứng dụng ===
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# === Cấu hình CORS cho phép Frontend Next.js truy cập ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Endpoint kiểm tra trạng thái hệ thống ===
@app.get("/health", tags=["Hệ thống"])
async def health_check():
    """Kiểm tra trạng thái hoạt động của API Server."""
    return {
        "status": "healthy",
        "service": "YAG Writing Novels Web API",
        "version": "0.1.0",
    }
