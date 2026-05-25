# HƯỚNG DẪN KIẾN TRÚC VÀ KHỞI CHẠY BACKEND (FASTAPI SYSTEM ARCHITECTURE)
## THƯ MỤC CHÍNH BỘ DỊCH VỤ BACKEND (SRC/BACKEND)

---

## 1. THIẾT KẾ KIẾN TRÚC THƯ MỤC (MODULAR MONOLITH STYLE)
Mã nguồn Backend của dự án **YAG** được cấu trúc theo mô hình **Modular Monolith** tiêu chuẩn, giúp phân định rõ ràng ranh giới giữa các nhiệm vụ của từng thành viên, chống xung đột code (conflict) khi làm việc song song, đồng thời dễ dàng nâng cấp lên Microservices trong tương lai.

```
src/backend/
├── app/
│   ├── __init__.py            # Khai báo app package chính của FastAPI
│   ├── main.py                # Điểm khởi chạy FastAPI, cấu hình CORS, mount routers
│   ├── core/                  # Cấu hình lõi của hệ thống
│   │   ├── __init__.py
│   │   ├── config.py          # Quản lý biến môi trường (Database, Redis, RabbitMQ)
│   │   ├── database.py        # Khởi tạo SQLAlchemy Engine & SessionLocal (PostgreSQL)
│   │   └── security.py        # Logics băm mật khẩu Bcrypt & mã hóa JWT token
│   ├── models/                # SQLAlchemy ORM Models (Lưu trữ CSDL vật lý)
│   │   └── __init__.py
│   ├── schemas/               # Pydantic Schemas (Lớp xác thực & kiểm soát dữ liệu API)
│   │   └── __init__.py
│   ├── api/                   # Tầng API endpoints nhận request và định tuyến
│   │   ├── __init__.py
│   │   ├── deps.py            # Chứa các dependency injector dùng chung (get_db)
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py      # Router tổng đăng ký 6 router con của các thành viên
│   │       └── endpoints/     # Các module xử lý endpoint của thành viên
│   │           ├── __init__.py
│   │           ├── auth.py    # Trần Gia Hiển (U001, U002)
│   │           ├── payment.py # Nguyễn Duy Trường (U011, U012)
│   │           ├── stories.py # Huỳnh Yến Nhi (U003)
│   │           ├── chapters.py# Huỳnh Yến Nhi (U004, U007, U010)
│   │           ├── ai.py      # Phạm Hương Trà (U006, U008, U009)
│   │           └── admin.py   # Nguyễn Phú Thọ (U005, U013, U014, U015)
│   ├── services/              # Tầng chứa logic xử lý nghiệp vụ chính (Business logic)
│   │   └── __init__.py
│   └── worker/                # Background Workers xử lý hàng đợi và cron job
│       └── __init__.py
├── tests/                     # Thư mục chứa automated test suites chạy CI/CD
│   └── __init__.py
└── requirements.txt           # Danh mục thư viện Python bắt buộc của hệ thống
```

---

## 2. MA TRẬN PHÂN BỔ ENDPOINTS THEO THÀNH VIÊN VÀ USE CASES
Mỗi thành viên chịu trách nhiệm triển khai logic, viết schemas, models và endpoints tương ứng trong tệp tin được phân công dưới đây:

| Tệp tin Endpoints | Thành viên phụ trách | Use Cases phụ trách | Ca kiểm thử tương ứng |
| :--- | :--- | :--- | :--- |
| [auth.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/v1/endpoints/auth.py) | **Trần Gia Hiển** | **U001:** Đăng ký / Đăng nhập & Reset mật khẩu<br>**U002:** Cập nhật hồ sơ cá nhân | `TC-001` đến `TC-006` |
| [payment.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/v1/endpoints/payment.py) | **Nguyễn Duy Trường** | **U011:** Xem danh mục gói cước Membership<br>**U012:** Thanh toán VNPAY IPN | `TC-007` đến `TC-012` |
| [stories.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/v1/endpoints/stories.py) | **Huỳnh Yến Nhi** | **U003:** Khởi tạo bộ truyện mới & Upload bìa truyện | `TC-018` |
| [chapters.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/v1/endpoints/chapters.py) | **Huỳnh Yến Nhi** | **U004:** Soạn thảo (Autosave WebSockets)<br>**U007:** Đọc chương truyện & Caching Redis<br>**U010:** Đăng bình luận/đánh giá (Real-time WS) | `TC-016`, `TC-017`<br>`TC-019`, `TC-020` |
| [ai.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/v1/endpoints/ai.py) | **Phạm Hương Trà** | **U006:** Trợ lý Miu AI gợi ý tình tiết kế tiếp<br>**U008:** AI Tìm truyện bằng ngôn ngữ tự nhiên<br>**U009:** AI Đề xuất truyện theo sở thích | `TC-013` đến `TC-015` |
| [admin.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/v1/endpoints/admin.py) | **Nguyễn Phú Thọ** | **U005:** Nộp chương truyện hẹn lịch xuất bản<br>**U013:** Kiểm duyệt tự động Gemini AI Worker<br>**U014:** Quét trễ cam kết phạt điểm uy tín<br>**U015:** Quản trị Admin Dashboard | `TC-025` đến `TC-028` |

---

## 3. VAI TRÒ CỦA CÁC TỆP TIN KHUNG LÕI (CORE FILES STRUCTURE)
Hệ thống đã được thiết lập sẵn mã nguồn khung (Skeleton) chất lượng cao gồm:

1.  **[app/main.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/main.py):** Khởi tạo ứng dụng FastAPI, đăng ký middleware **CORS** mở cho Next.js, tích hợp router v1 và tạo endpoint mặc định hướng dẫn truy cập Swagger Docs.
2.  **[app/core/config.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/core/config.py):** Cấu hình biến môi trường kết nối PostgreSQL, Redis, RabbitMQ sử dụng `pydantic-settings`.
3.  **[app/core/database.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/core/database.py):** Setup kết nối CSDL PostgreSQL (hỗ trợ pgvector cho tìm kiếm ngữ nghĩa), tạo session maker `SessionLocal` và lớp Base.
4.  **[app/core/security.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/core/security.py):** Viết sẵn logic băm mật khẩu bảo mật **Bcrypt** với `rounds = 12` và các hàm tạo JWT access token.
5.  **[app/api/deps.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/deps.py):** Quản lý Dependency Injection sinh và đóng session DB cục bộ `get_db()`.
6.  **[app/api/v1/router.py](file:///d:/SE/PROJECT/SE_Writing_Web/src/backend/app/api/v1/router.py):** File định tuyến trung tâm kết nối 6 module endpoints của các thành viên.

---

## 4. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY (QUICKSTART GUIDE)

Để chạy thử nghiệm mã nguồn Backend dưới môi trường local, thực hiện các bước sau:

### Bước 1: Tạo môi trường ảo Python
Mở cửa sổ dòng lệnh tại thư mục `src/backend` và khởi tạo venv:
```bash
# Khởi tạo môi trường ảo python
python -m venv venv

# Kích hoạt môi trường ảo (Windows)
venv\\Scripts\\activate

# Kích hoạt môi trường ảo (macOS / Linux)
source venv/bin/activate
```

### Bước 2: Cài đặt các thư viện phụ thuộc
Cài đặt danh sách thư viện đã khai báo sẵn trong `requirements.txt`:
```bash
pip install -r requirements.txt
```

### Bước 3: Khởi chạy Backend FastAPI Development Server
Chạy ứng dụng FastAPI bằng `uvicorn` với chế độ tự động reload khi sửa code:
```bash
uvicorn app.main:app --reload --port 8000
```

### Bước 4: Kiểm nghiệm tài liệu API Swagger UI
Mở trình duyệt và truy cập đường link sau để xem tài liệu API tương tác tự động sinh cực đẹp của hệ thống:
*   **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
*   **Alternative API Docs (ReDoc):** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 5. QUY ĐỊNH HỢP TÁC KHI VIẾT CODE BACKEND
*   **Database Migrations:** Khi có sự thay đổi bảng, Duy Trường có trách nhiệm viết tệp script SQL migrations để cả nhóm cùng cập nhật database cục bộ trên Docker.
*   **CI/CD Compliance:** Thành viên trước khi tạo Pull Request bắt buộc phải chạy `flake8` kiểm tra cú pháp và viết unit tests đầy đủ trong thư mục `tests/` để pass CI/CD pipeline của Phú Thọ.
