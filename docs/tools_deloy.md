# TÀI LIỆU QUY HOẠCH HẠ TẦNG TRIỂN KHAI YAG (PRODUCTION)

Tài liệu này tổng hợp toàn bộ các dịch vụ và công cụ (tools) được sử dụng để đưa dự án YAG (Web truyện chữ tích hợp AI) lên môi trường thực tế (Production), tối ưu hóa kiến trúc Serverless, khả năng chịu tải và chi phí.

---

## 1. Frontend & Mạng lưới phân phối (CDN)
* **Vercel:** Nền tảng hosting chính cho mã nguồn Frontend (Next.js, React, Vue...). Tự động build/deploy thông qua GitHub và đóng vai trò là CDN toàn cầu giúp tải trang đọc truyện nhanh chóng, mượt mà.
* **Cloudflare (Khuyên dùng):** Quản lý DNS cho tên miền chính thức. Cung cấp lớp bảo mật chống tấn công DDoS (chế độ Proxy - đám mây màu cam) và ẩn IP thực của hạ tầng hệ thống.
* **Nhà cung cấp Tên miền:** Namecheap hoặc Name.com. (Tận dụng *GitHub Student Developer Pack* để nhận tên miền `.tech`, `.me` miễn phí 1 năm).

## 2. Backend & Xử lý Logic (Serverless Compute)
* **Google Cloud Run:** Host API Backend chính thức. Ứng dụng được đóng gói bằng Docker, có khả năng tự động mở rộng (auto-scale) khi lượng truy cập tăng vọt và thu hẹp về 0 để tiết kiệm chi phí lúc thấp điểm.
* **Google Cloud Functions:** Host các Worker xử lý tác vụ nền (background jobs) nặng và bất đồng bộ. Phụ trách: sinh chữ AI, nén ảnh, gửi email, xử lý logic webhook thanh toán nhằm tránh làm nghẽn luồng truy cập chính.

## 3. Database, Caching & Lưu trữ (Storage)
* **Supabase (PostgreSQL + pgvector):** Hệ quản trị cơ sở dữ liệu chính. Sử dụng extension `pgvector` để lưu trữ embeddings phục vụ tính năng AI (tìm kiếm ngữ nghĩa, gợi ý truyện). **Lưu ý:** Cần bật *Connection Pooling* (PgBouncer/Supavisor) để chịu tải kết nối đồng thời.
* **Upstash (Serverless Redis):** Lớp Caching (bộ nhớ đệm) chiến lược. Lưu trữ nội dung chương truyện đang hot, session đăng nhập và cấu hình web, giúp giảm đến 80-90% lượng query trực tiếp vào Supabase.
* **Cloudinary:** Nơi lưu trữ và phân phối tài nguyên phương tiện (bìa truyện, avatar user). Tự động nén và chuyển đổi định dạng ảnh (WebP/AVIF) phù hợp với từng thiết bị để tối ưu tốc độ load.
* **Google Cloud Storage (GCS):** Kho lưu trữ tĩnh dự phòng, sử dụng để chứa các file backup database định kỳ tự động.

## 4. Trí tuệ nhân tạo (AI) & Hàng đợi (Messaging)
* **Google AI Studio (Gemini API):** Trái tim AI của dự án, chịu trách nhiệm cho các tính năng sinh văn bản, tóm tắt chương truyện và vận hành các AI Agent (trò chuyện cùng nhân vật).
* **Google Cloud Pub/Sub:** Trạm trung chuyển thông điệp (Message Queue) bất đồng bộ. Điều phối các luồng sự kiện từ Cloud Run sang Cloud Functions, đảm bảo không bị rớt (drop) request gọi AI khi hệ thống tải cao, hỗ trợ cơ chế tự động thử lại (retry) khi thất bại.

## 5. Tích hợp Ngoại vi (Thanh toán & Monetization)
* **PayOS (hoặc Casso / VietQR API):** Cổng thanh toán qua mã VietQR động. Xử lý giao dịch nạp VIP/mua chương bằng tiền thật, tự động đối soát ngân hàng và bắn Webhook xác nhận về hệ thống Cloud Run. Phù hợp cho cá nhân phát triển mà không cần pháp nhân doanh nghiệp.

## 6. Vận hành, Giám sát & Bảo mật (CI/CD, Ops & Security)
* **GitHub:** Quản lý kho mã nguồn (Repository). Nơi kích hoạt luồng CI/CD: tự động đẩy code cập nhật lên Vercel và tự động build Docker image đẩy lên Cloud Run mỗi khi code được gộp vào nhánh `production`.
* **Google Secret Manager:** Két sắt bảo mật trung tâm. Lưu trữ an toàn tuyệt đối các biến môi trường nhạy cảm (Supabase Password, Gemini API Key, Webhook Secrets) thay vì lưu cứng (hardcode) trong source code.
* **Google Cloud Logging & Error Reporting:** Hệ thống giám sát và cảnh báo. Thu thập toàn bộ log và theo dõi lỗi (500 errors, timeout) từ Backend/Worker để phục vụ việc dò tìm nguyên nhân và fix bug trên môi trường thật.