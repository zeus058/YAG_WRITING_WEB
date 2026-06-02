# YAG Writing Novels Web - Backend Implementation Checklist

Tài liệu này lưu trữ tiến độ phát triển các tính năng Backend của dự án YAG. Checklist được phân chia theo nhiệm vụ của từng thành viên trong nhóm, dựa trên các tài liệu đặc tả công việc trong thư mục `docs/task/`.

---

## 1. Trần Gia Hiển (Auth & Profile)

### A. Cơ sở dữ liệu (Database Design & Implementation)
- [x] Thiết kế chi tiết cấu trúc bảng `users` (UUID, role check, premium_until) -> *Đã định nghĩa trong `app/models/user.py`*
- [x] Thiết kế chi tiết cấu trúc bảng `profiles` (1-1 với users, reputation_score check) -> *Đã định nghĩa trong `app/models/profile.py`*
- [x] Thiết kế chi tiết cấu trúc bảng `reading_histories` -> *Đã định nghĩa trong `app/models/reading_history.py`*
- [x] Thiết kế chi tiết cấu trúc bảng `libraries` (Bookmarks) -> *Đã định nghĩa trong `app/models/library.py`*
- [x] Thiết lập Seed dữ liệu mẫu hệ thống -> *Đã hoàn thành tại `app/seed.py`*

### B. [U001] Đăng ký / Đăng nhập & Khôi phục mật khẩu
- [x] API Đăng ký (`POST /api/v1/auth/register`): Validation dữ liệu đầu vào, mã hóa mật khẩu bằng **Bcrypt** (rounds = 12), cấp Access Token (JWT). -> *Đã hoàn thành tại `app/api/v1/endpoints/auth.py` & `app/services/auth_service.py`*
- [x] API Đăng nhập (`POST /api/v1/auth/login`): So sánh password hash, cấp Access Token (1h) & Refresh Token. -> *Đã hoàn thành tại `app/api/v1/endpoints/auth.py` & `app/services/auth_service.py`*
- [x] API Khôi phục mật khẩu:
  - [x] Yêu cầu khôi phục (`POST /api/v1/auth/password-reset/request`): Tạo OTP 6 số lưu trong Redis (hạn 5 phút), gửi mail qua Gmail SMTP. -> *Đã hoàn thành tại `app/api/v1/endpoints/auth.py` & `app/services/auth_service.py`*
  - [x] Xác nhận khôi phục (`POST /api/v1/auth/password-reset/confirm`): Xác thực OTP trong Redis, cập nhật password hash mới vào Postgres. -> *Đã hoàn thành tại `app/api/v1/endpoints/auth.py` & `app/services/auth_service.py`*

### C. [U002] Quản lý hồ sơ
- [x] API Cập nhật Profile (`PUT /api/v1/profiles/me`): Cho phép chỉnh sửa `display_name`, `bio`. -> *Đã hoàn thành tại `app/api/v1/endpoints/auth.py` & `app/schemas/auth.py`*
- [x] API Tải ảnh đại diện (`POST /api/v1/profiles/avatar`): Nhận Multipart File, validate định dạng & kích thước (< 2MB), upload qua Cloudinary SDK, tự động resize 250x250 WebP, lưu CDN URL. -> *Đã hoàn thành tại `app/api/v1/endpoints/auth.py` & `app/services/cloudinary_service.py`*


---

## 2. Nguyễn Duy Trường (Stories, Chapters & Payments)

### A. Cơ sở dữ liệu & SQL Migrations
- [x] Thiết kế cấu trúc bảng `stories` (UUID, author_id, check status, view/rating defaults) -> *Đã định nghĩa trong `app/models/story.py`*
- [x] Thiết kế cấu trúc bảng `chapters` (UUID, story_id, check moderation_status) -> *Đã định nghĩa trong `app/models/chapter.py`*
- [x] Thiết kế cấu trúc bảng `membership_plans` (Duration_days, price >= 0) -> *Đã định nghĩa trong `app/models/membership_plan.py`*
- [x] Thiết kế cấu trúc bảng `transactions` (vnp_txn_ref unique, check status) -> *Đã định nghĩa trong `app/models/transaction.py`*
- [x] Viết SQL Migrations khởi tạo 13 bảng và thiết lập khóa ngoại -> *Đã hoàn thành tại `migrations/V1__initial_schema.sql`*
- [x] Tạo Index tối ưu hóa hiệu năng SQL (B-Tree cho stories, chapters; Unique index cho transactions) -> *Đã định nghĩa trong `migrations/V1__initial_schema.sql`*

### B. [U011] Đăng ký Membership
- [x] API Danh mục gói cước (`GET /api/v1/membership/plans`): Trả về danh sách gói cước từ DB. -> *Đã hoàn thành tại `app/api/v1/endpoints/payment.py`*
- [x] Middleware phân quyền RBAC: Chặn truy cập chương Premium (`is_premium = True`) nếu tài khoản của User chưa đăng ký Premium hoặc hết hạn (`premium_until`). -> *Đã định nghĩa tại `app/api/deps.py` & tích hợp tại `app/api/v1/endpoints/chapters.py`*

### C. [U012] Thanh toán VNPAY IPN
- [x] API Khởi tạo URL Thanh toán (`POST /api/v1/payment/vnpay/checkout`): Tạo transaction `pending`, sinh `vnp_txn_ref`, sinh chữ ký bảo mật **HMAC-SHA512**, trả về link Sandbox. -> *Đã hoàn thành tại `app/api/v1/endpoints/payment.py` & `app/services/payment.py`*
- [x] Endpoint VNPAY IPN (`GET /api/v1/payment/vnpay/ipn`): Nhận callback ngầm từ VNPAY, verify checksum HMAC-SHA512, đối chiếu số tiền, cập nhật trạng thái transaction, cấp hạn Premium (`premium_until`). -> *Đã hoàn thành tại `app/api/v1/endpoints/payment.py` & `app/services/payment.py`*

---

## 3. Nguyễn Phú Thọ (Infra, Workers & Admin)

### A. Hạ tầng & CI/CD Pipeline
- [x] Quản trị Hạ tầng Docker Local: Khởi tạo container Postgres (pgvector), Redis, RabbitMQ. -> *Đã hoàn thành tại `docker-compose.yml`*
- [x] Viết Dockerfile tối ưu kích thước image cho Next.js (Frontend) và FastAPI (Backend). -> *Đã hoàn thành tại `src/backend/Dockerfile` và `src/frontend/Dockerfile`*
- [x] Thiết lập quy trình CI/CD tự động bằng GitHub Actions: Chạy linter & unit tests khi push/PR vào `dev`, `main`, `setup-backend`. -> *Đã hoàn thành tại `.github/workflows/ci.yml`*

### B. [U005] Xuất bản truyện (Publishing Workflow)
- [ ] API Yêu cầu Xuất bản (`POST /api/v1/author/chapters/{chapter_id}/publish`): Xác thực quyền sở hữu, lưu trạng thái `pending`, đẩy JSON task lên RabbitMQ queue, trả ngay HTTP 202. -> *Hiện tại là placeholder tại `app/api/v1/endpoints/admin.py`*

### C. [U013] Kiểm duyệt nội dung AI (Background Worker)
- [ ] Xây dựng Background Worker daemon (`worker.py`): Kết nối AMQP RabbitMQ, lắng nghe task từ queue. -> *Chưa được triển khai (chỉ có package folder stub `app/worker`)*
- [ ] Tích hợp Gemini API quét vi phạm thuần phong mỹ tục, bạo lực, ngôn từ thù ghét, khiêu dâm. Cập nhật `ai_moderation_logs`, đổi trạng thái `chapters`, gửi kết quả qua WebSockets đến tác giả. -> *Chưa được triển khai*

### D. [U014] Giám sát cam kết lộ trình (Cron Schedulers)
- [ ] Thiết lập Cron Job định kỳ hàng ngày bằng `APScheduler`: Quét tiến độ ra chương, cảnh báo qua email/notif, trừ điểm uy tín `reputation_score` nếu trễ hạn. -> *Chưa được triển khai*

### E. [U015] Quản trị hệ thống (Admin APIs)
- [ ] API lấy thông tin thống kê Dashboard (`GET /api/v1/admin/dashboard/stats`). -> *Hiện tại là placeholder tại `app/api/v1/endpoints/admin.py`*
- [ ] API khóa tài khoản người dùng vi phạm. -> *Chưa được triển khai*
- [ ] API Admin ghi đè quyết định duyệt của AI (duyệt thủ công các chương flagged/rejected). -> *Chưa được triển khai*
- [ ] Audit Trail: Ghi vết chi tiết mọi thao tác xử lý của Admin vào CSDL. -> *Chưa được triển khai*

---

## 4. Phạm Hương Trà (AI Suggestions, pgvector Search & Recommendations)

### A. Kiểm định chất lượng
- [x] Thiết lập cơ sở hạ tầng chạy kiểm thử tự động (pytest) -> *Đã tích hợp test suite cơ bản kiểm tra CSDL và endpoint Docs tại `tests/`*
- [ ] Thiết kế Test Plan chi tiết & kịch bản kiểm thử tích hợp (Integration Tests) và bảo mật (Security Tests). -> *Chưa được hoàn thiện*

### B. [U006] Gợi ý tình tiết AI (Miu AI Sidebar)
- [x] API Gợi ý tình tiết (`POST /api/v1/ai/suggestions`): Nhận context <= 1000 từ + mode, thiết kế prompt cho Gemini đóng vai biên tập viên văn học sinh 3 phương án chi tiết dưới dạng cấu trúc JSON, xử lý ngoại lệ fallback. -> *Đã hoàn thành tại `app/api/v1/endpoints/ai.py` & `app/services/ai_service.py`*

### C. [U008] AI Tìm kiếm ngữ nghĩa (pgvector)
- [x] Tích hợp `pgvector` extension vào Database. -> *Đã cấu hình tại `migrations/V1__initial_schema.sql`*
- [x] Thiết kế cấu trúc bảng `story_embeddings` (vector 1536 chiều tương thích với Gemini Embedding). -> *Đã định nghĩa trong `app/models/story_embedding.py`*
- [x] Cơ chế đồng bộ hóa Vector: Khi tạo/cập nhật truyện, gọi Gemini Embedding API tạo vector từ description, lưu vào `story_embeddings`. -> *Đã hoàn thành tại `app/api/v1/endpoints/stories.py` & `app/services/ai_service.py`*
- [x] API Tìm kiếm ngữ nghĩa (`POST /api/v1/stories/search`): Nhận câu hỏi tự nhiên, vector hóa qua Gemini Embedding, truy vấn bằng toán tử khoảng cách Cosine `<=>` để trả về top truyện tương đồng nhất. -> *Đã hoàn thành tại `app/api/v1/endpoints/stories.py` & `app/services/ai_service.py`*

### D. [U009] AI Đề xuất truyện (AI Recommendation)
- [ ] API Gợi ý cá nhân hóa (`GET /api/v1/recommendations`): Dựng vector sở thích từ `reading_histories` và `libraries` của độc giả, so khớp Cosine với `story_embeddings`, trả top 5 truyện đề xuất. -> *Hiện tại là placeholder tại `app/api/v1/endpoints/ai.py`*

---

## 5. Huỳnh Yến Nhi (Story Management, Editor WebSocket & Comments)

### A. [U003] Tạo & Quản lý Tác phẩm
- [x] API Tạo truyện mới (`POST /api/v1/stories`): Check role tác giả, check trùng title, upload bìa lên Cloudinary `/yag/covers/`, nén ảnh và lưu. -> *Đã hoàn thành tại `app/api/v1/endpoints/stories.py` & `app/services/media_service.py`*
- [x] API Cập nhật thông tin truyện (`PUT /api/v1/stories/{story_id}`). -> *Đã hoàn thành tại `app/api/v1/endpoints/stories.py` & `app/services/media_service.py`*
- [x] API Quản lý chương (`GET /api/v1/stories/author/{story_id}/chapters`): Liệt kê toàn bộ chương (bao gồm cả bản nháp) của chính tác giả. -> *Đã hoàn thành tại `app/api/v1/endpoints/stories.py`*

### B. [U004] Soạn thảo chương truyện (WebSocket Autosave)
- [ ] API WebSocket Autosave (`/api/v1/author/chapters/{chapter_id}/ws`): Lắng nghe payload chứa title/content gửi từ Editor của client, tự động cập nhật đè vào bảng `chapters` với trạng thái `draft`, phản hồi `"Autosave success"`. -> *Hiện tại chỉ mới kết nối và đóng ngay lập tức (placeholder tại `app/api/v1/endpoints/chapters.py`)*

### C. [U007] Đọc truyện & Caching Redis
- [ ] API Đọc chương truyện (`GET /api/v1/chapters/{chapter_id}`): Check VIP (is_premium), truy xuất qua Redis cache (Cache Hit/Miss), set Redis TTL 2h. -> *Hiện tại là placeholder tại `app/api/v1/endpoints/chapters.py`*
- [ ] Đếm lượt xem bất đồng bộ: Lượt đọc tăng `INCR` trong Redis, cron job chạy 10 phút/lần đồng bộ view_count từ Redis về Postgres. -> *Chưa được triển khai*
- [ ] API Bookmark & Lịch sử:
  - [ ] `POST /api/v1/stories/{story_id}/bookmark`: Thêm/Xóa khỏi bảng `libraries`. -> *Chưa được khai báo route*
  - [ ] Tự động cập nhật `reading_histories` khi có API đọc chương thành công. -> *Chưa được triển khai*

### D. [U010] Bình luận & Đánh giá (Real-time Broadcast)
- [ ] API Đăng bình luận & Đánh giá (`POST /api/v1/chapters/{chapter_id}/comments`): Hỗ trợ bình luận phân cấp (`parent_id`), rating 1-5 sao, check trùng rating của user đối với tác phẩm. -> *Hiện tại là placeholder tại `app/api/v1/endpoints/chapters.py`*
- [ ] Phát bình luận thời gian thực: Tích hợp Pub/Sub của Redis kết hợp WebSockets để broadcast bình luận mới đến các độc giả đang xem chung chương truyện. -> *Chưa được triển khai*
