# [BACKEND_SERVER_RULES]

## Chỉ Thị Ràng Buộc Phát Triển Phía Server — YAG Writing Novels Web

### 1. Ngôn Ngữ & Framework
- **Runtime:** Python 3.10+
- **Framework:** FastAPI (ASGI) với Uvicorn làm server.
- **ORM:** SQLAlchemy 2.0+ (Async) kết nối PostgreSQL qua asyncpg.

### 2. Quy Tắc Mã Nguồn
- Tuân thủ `CLAUDE.md`: Clean Code, DRY, comment Tiếng Việt, tên biến/hàm Tiếng Anh.
- Mỗi module trong `app/` phải có file `__init__.py` để Python nhận diện package.
- Mọi router endpoint phải đặt trong `app/api/` và đăng ký vào `main.py`.

### 3. Bảo Mật (Theo CLAUDE.md & ARCHITECTURE.md)
- **Mật khẩu:** Mã hóa Bcrypt qua `passlib[bcrypt]`. TUYỆT ĐỐI CẤM lưu plaintext.
- **Xác thực:** JWT Token (PyJWT) với thời hạn cấu hình qua biến môi trường.
- **Rate Limiting:** Tích hợp `slowapi` tại API Gateway để chống Brute-force.
- **Thanh toán VNPAY:** Chỉ xử lý nâng cấp quyền hạn qua IPN callback, KHÔNG qua Return URL.

### 4. Luồng Xử Lý AI (Theo ARCHITECTURE.md)
- **TUYỆT ĐỐI CẤM** gọi API Gemini đồng bộ trong luồng request chính.
- Khi xuất bản chương: Lưu trạng thái `PENDING` → Đẩy task vào RabbitMQ → Trả HTTP 202.
- Worker tại `app/worker/` tiêu thụ task, gọi Gemini, cập nhật trạng thái chương.

### 5. Cấu Trúc Thư Mục
```
app/
├── main.py        # Entry point, đăng ký CORS + routers
├── api/           # Định tuyến API endpoints
├── core/          # Cấu hình: JWT, Bcrypt, Rate Limit, DB connection
├── models/        # SQLAlchemy ORM + pgvector models
├── services/      # Gemini API, VNPAY SDK, Cloudinary
└── worker/        # RabbitMQ consumer (background)
```
