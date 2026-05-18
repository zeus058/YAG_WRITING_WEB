# [SYSTEM_ARCHITECTURE_CONSTRAINTS]

## 1. Stack Công Nghệ Hạ Tầng
- Relational Database: PostgreSQL quản lý dữ liệu có cấu trúc chặt chẽ (Tài khoản, Giao dịch, Chương truyện).
- Semantic Search (Tìm kiếm thông minh): Kích hoạt extension `pgvector` tích hợp trực tiếp trong PostgreSQL để xử lý các mảng nhúng (Embeddings) và truy vấn cốt truyện theo độ tương đồng Vector ngữ nghĩa.
- Middleware & Message Broker: Sử dụng Redis phục vụ bộ nhớ đệm (Cache) và đếm lượt xem (View) tốc độ cao. Sử dụng RabbitMQ điều phối hàng đợi tác vụ bất đồng bộ.

## 2. Thực Thể Cơ Sở Dữ Liệu Cốt Lõi (Core Schema)
- `Users`: id, username, email, password_hash, premium_until, role (Reader, Author, Admin).
- `Stories`: id, author_id, title, description, cover_url, category.
- `Chapters`: id, story_id, content, moderation_status (PENDING/APPROVED/REJECTED), is_premium (Boolean).

## 3. Luồng Xử Lý Nghiệp Vụ Bắt Buộc
- **AI Moderator (Kiểm duyệt ngầm tự động):** Khi tác giả gửi yêu cầu xuất bản chương mới, API tại hệ thống server chỉ lưu thông tin vào Postgres dưới trạng thái `PENDING` và đẩy ngay lập tức một Task chứa ID chương vào hàng đợi `RabbitMQ`. API phải phản hồi mã trạng thái `HTTP 202 (Accepted)` về phía Client ngay lập tức để giải phóng giao diện người dùng. Tiến trình chạy ngầm (Background Worker) tại `backend/app/worker` độc lập sẽ tiêu thụ task, gọi API Google Gemini quét nội dung nhạy cảm và cập nhật lại trạng thái chương sau. TUYỆT ĐỐI CẤM gọi API Gemini đồng bộ trong luồng request chính của API Server.
- **Thanh toán gói Membership (VNPAY):** Quyền hạn VIP và hạn dùng gói (`premium_until`) chỉ được nâng cấp khi hệ thống Backend nhận, giải mã và xác thực chữ ký số thành công từ cổng IPN (Instant Payment Notification) chạy ngầm từ Server VNPAY. Không chấp nhận xử lý nâng cấp quyền hạn dựa vào dữ liệu phản hồi từ giao diện Client (Return URL).