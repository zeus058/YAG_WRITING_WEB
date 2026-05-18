md_content = """# HƯỚNG DẪN CẤU HÌNH THƯ MỤC VÀ HỆ THỐNG RÀNG BUỘC (CONSTRAINTS)
## DỰ ÁN: YAG - WRITING NOVELS WEB

> **Môn học:** Nhập môn Công nghệ phần mềm (Intro2SE) - FIT@HCMUS
> **Kiến trúc hệ thống:** Modular Monolith (Domain-Driven Design)
> **Mục tiêu tệp tài liệu:** Hướng dẫn phân bổ cấu trúc Monorepo chuẩn và cung cấp nội dung chi tiết cho các file Ràng buộc hệ thống (System Constraints). Hãy lưu tài liệu này tại thư mục gốc hoặc nạp vào cửa sổ ngữ cảnh (Context Window) của Claude / Google Antigravity để định hình quy trình phát triển tự động, tối ưu token và kiểm soát chất lượng mã nguồn 100%.

---

## 1. SƠ ĐỒ CÂY THƯ MỤC CHUẨN (MONOREPO ARCHITECTURE)

Hệ thống được tổ chức theo mô hình Monorepo phẳng, phân tách độc lập giữa Client và Server nhằm tối ưu hóa tầm nhìn ngữ cảnh cho các AI Agent:

Kết quả chạy mã
File generated successfully.

```text
YAG_Writing_Web/
├── CLAUDE.md                    # Tài liệu hướng dẫn và ràng buộc cốt lõi này (Root)
├── ARCHITECTURE.md              # Đặc tả chi tiết luồng dữ liệu & Database Schema tổng
├── docker-compose.yml           # Khởi chạy cụm hạ tầng phụ trợ local (Postgres, Redis, RabbitMQ)
├── README.md                    # Hướng dẫn cài đặt và khởi chạy môi trường phát triển
│
├── backend/                     # PHÂN HỆ API SERVER (FastAPI + Python)
│   ├── RULES.md                 # Chỉ thị ràng buộc phát triển phía Server
│   ├── requirements.txt         # Danh sách các gói thư viện Python dependencies
│   ├── Dockerfile               # Đóng gói container cho phân hệ backend
│   └── app/
│       ├── api/                 # API Gateway, chịu trách nhiệm định tuyến router endpoints
│       ├── core/                # Core logic: Cấu hình mã hóa mật khẩu, JWT, Rate Limiting
│       ├── models/              # Định nghĩa thực thể ORM (SQLAlchemy) & Vector Models
│       ├── services/            # Các dịch vụ tích hợp: Gemini API, VNPAY Sandbox SDK
│       └── worker/              # Tiến trình xử lý hàng đợi ngầm (RabbitMQ Background Consumer)
│
└── frontend/                    # PHÂN HỆ GIAO DIỆN NGƯỜI DÙNG (Next.js + TypeScript)
    ├── RULES.md                 # Chỉ thị ràng buộc phát triển phía Client
    ├── DESIGN.md                # Hệ thống quy chuẩn thiết kế UI/UX & Design Token
    ├── tailwind.config.ts       # Định nghĩa bảng màu mở rộng và spacing cho Tailwind CSS
    ├── package.json             # Quản lý danh sách thư viện và scripts phía client
    └── src/
        ├── app/                 # Next.js App Router (Quản lý các trang và phân hệ hiển thị)
        ├── components/
        │   ├── ui/              # Các UI Component nguyên tử dùng chung (Button, Input, Card, Modal)
        │   └── features/        # Các phân hệ chức năng lớn (Author Studio, Reader Mode, Forum)
        ├── lib/                 # Hàm tiện ích (Utils), định cấu hình kết nối API Client
        └── hooks/               # Custom Hooks (useWebSocket xử lý bình luận/thông báo real-time)