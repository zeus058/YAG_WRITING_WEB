"""
Gói Worker — Tiến trình xử lý hàng đợi tác vụ ngầm (Background Consumer).

Quy trình hoạt động (theo ARCHITECTURE.md):
1. Worker kết nối và lắng nghe hàng đợi RabbitMQ.
2. Khi nhận được Task chứa ID chương truyện mới xuất bản:
   a. Lấy nội dung chương từ PostgreSQL.
   b. Gọi API Google Gemini quét nội dung nhạy cảm.
   c. Cập nhật trạng thái chương: APPROVED hoặc REJECTED.
   d. Sinh Vector Embedding và lưu vào pgvector cho AI Search.
   e. Gửi thông báo kết quả qua WebSocket cho tác giả.

CẢNH BÁO QUAN TRỌNG:
- Worker chạy HOÀN TOÀN ĐỘC LẬP với API Server chính.
- TUYỆT ĐỐI CẤM gọi API Gemini đồng bộ trong luồng request chính.
"""
