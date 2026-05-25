# CÔNG VIỆC CHI TIẾT - NGUYỄN PHÚ THỌ
## VAI TRÒ: DEVOPS LEAD & ARCHITECT & ASYNCHRONOUS BACKEND SPECIALIST

---

## 1. HẠ TẦNG DỰ ÁN & CI/CD PIPELINE

### A. Quản trị Hạ tầng Docker Local
*   Xây dựng và bảo trì tệp `docker-compose.yml` định nghĩa các container dịch vụ cục bộ:
    *   `postgres`: Cơ sở dữ liệu PostgreSQL 16 tích hợp extension `pgvector` phục vụ tìm kiếm ngữ nghĩa của Hương Trà.
    *   `redis`: Bộ nhớ đệm lưu session, cache chương của Gia Hiển và lưu thông tin đồng bộ Websocket của Yến Nhi.
    *   `rabbitmq`: Message Broker trung gian điều phối tác vụ bất đồng bộ cho Worker. Cấu hình sẵn cổng AMQP `5672` và cổng quản trị web UI `15672` (tài khoản `yag_mq`/`yag_mq_secret`).
*   Viết các tệp Dockerfile tối ưu hóa kích thước image cho Next.js (Frontend) và FastAPI (Backend) phục vụ deploy đám mây thực tế.

### B. Thiết lập quy trình tích hợp liên tục CI/CD
*   **Viết kịch bản tự động hóa GitHub Actions (`.github/workflows/ci.yml`):**
    *   Cấu hình trigger tự động chạy mỗi khi có thành viên trong nhóm thực hiện `git push` hoặc gửi `Pull Request` vào nhánh `dev` và `main`.
    *   **Quy trình kiểm tra chất lượng tự động gồm:**
        1. Khởi tạo môi trường ảo Python 3.11 và Node.js 18.
        2. Cài đặt toàn bộ dependencies (`pip install -r requirements.txt`, `npm install`).
        3. Khởi chạy công cụ Linter để kiểm tra chất lượng mã nguồn: **Flake8** cho Python và **ESLint** cho Next.js, phát hiện lỗi cú pháp và cảnh báo code thừa.
        4. Tự động chạy toàn bộ bộ kiểm thử Unit Tests bằng **pytest** ở Backend. Nếu có bất kỳ testcase nào bị lỗi hoặc code không đạt chuẩn chất lượng linter, GitHub Actions sẽ tự động chặn không cho phép Merge code để đảm bảo an toàn tuyệt đối cho nhánh chung.

---

## 2. LẬP TRÌNH NGHIỆP VỤ BACKEND (FASTAPI USE CASES)

### [U005] Xuất bản truyện (Publishing Workflow)
*   **API Yêu cầu Xuất bản (`POST /api/v1/author/chapters/{chapter_id}/publish`):**
    *   Xác thực quyền sở hữu chương truyện của tác giả. Cho phép tác giả cấu hình: Xuất bản ngay lập tức, hoặc cài đặt lịch hẹn giờ đăng (`publish_at = TIMESTAMP`), thiết lập trạng thái chương VIP hay miễn phí.
    *   **Cơ chế Hàng đợi bất đồng bộ (RabbitMQ):**
        *   Khi tác giả bấm xuất bản, lưu trạng thái chương thành `pending`.
        *   Đóng gói thông tin chương (`chapter_id`, `story_id`, `content`) thành một JSON payload và đẩy (Publish) vào Queue tên là `yag_moderation_queue` trong RabbitMQ.
        *   Trả ngay về cho Client mã phản hồi HTTP 202 (Accepted) thông báo tác vụ đã được đưa vào hàng đợi kiểm duyệt, giúp giải phóng màn hình tác giả tức thời mà không bắt họ chờ duyệt AI (vốn mất 10-30s).

### [U013] Kiểm duyệt nội dung AI (Background Worker)
*   **Lập trình Background Worker:**
    *   Xây dựng một tệp mã nguồn Python chạy độc lập dạng Daemon (`worker.py`).
    *   Worker duy trì kết nối AMQP liên tục đến RabbitMQ, lắng nghe và tự động lấy Task từ hàng đợi `yag_moderation_queue` ra xử lý.
    *   **Tích hợp Gemini API quét vi phạm:**
        *   Worker gọi API Gemini bằng prompt bảo mật cao gửi kèm nội dung chương truyện.
        *   Yêu cầu Gemini phân tích ngữ nghĩa, xác định xem chương truyện có chứa các yếu tố vi phạm thuần phong mỹ tục Việt Nam, bạo lực máu me cực đoan, ngôn từ thù ghét (Hate speech) hay khiêu dâm nhạy cảm hay không.
        *   Nhận kết quả phân tích gồm: Trạng thái (`Approved` / `Rejected` / `Flagged`), điểm tin cậy vi phạm (`confidence_score`) và lý do chi tiết.
        *   Cập nhật kết quả vào bảng `ai_moderation_logs` và đổi trạng thái chương trong bảng `chapters`.
        *   Gửi kết quả duyệt về cho tác giả thời gian thực thông qua WebSockets.

### [U014] Giám sát cam kết lộ trình (Cron Schedulers)
*   **Thiết lập Cron Job tự động:**
    *   Viết tác vụ chạy ngầm định kỳ hàng ngày sử dụng thư viện `APScheduler` trong FastAPI.
    *   Quét danh sách các tác phẩm đang trong lộ trình cam kết đăng chương. Đối chiếu ngày ra chương gần nhất trong bảng `chapters` với lộ trình đã thiết lập của tác giả.
    *   Nếu phát hiện tác giả trễ lịch quá thời gian đăng ký:
        *   Tự động gửi email/thông báo cảnh báo nhắc nhở tác giả.
        *   Trực tiếp trừ điểm uy tín sáng tác (`reputation_score`) trong bảng `profiles` của tác giả tùy theo số ngày trễ hạn.
        *   Gửi thông tin cảnh báo các tác phẩm trễ hạn nghiêm trọng lên bảng điều khiển của Admin.

### [U015] Quản trị hệ thống (Admin APIs)
*   **Cụm API dành riêng cho Admin:**
    *   API lấy thông tin thống kê nhanh, API khóa tài khoản người dùng vi phạm, API ghi đè quyết định duyệt chương của AI (Admin có quyền duyệt thủ công lại các chương bị AI gắn cờ nhầm).
    *   **Audit Trail:** Mọi thao tác xử lý của Admin bắt buộc phải được ghi nhận vết chi tiết (lưu trữ người thao tác, thời gian, hành động, lý do) vào cơ sở dữ liệu phục vụ truy vết bảo mật.

---

## 3. ĐIỀU CHỈNH GIAO DIỆN FRONTEND (NEXT.JS PAGES)

### [Core Page] S19 - Admin Dashboard (`src/frontend/src/app/admin-dashboard/page.tsx`)
*   **Thiết kế Bảng điều khiển Quản trị:**
    *   Xây dựng giao diện trung tâm trực quan dành riêng cho Admin (yêu cầu phân quyền xác thực JWT gắt gao).
    *   Thiết kế các thẻ Widget hiển thị chỉ số quan trọng thời gian thực: Tổng số người dùng mới đăng ký, Tổng doanh thu cước Premium, Số chương truyện đang chờ duyệt thủ công.
    *   Sử dụng thư viện biểu đồ (ví dụ: `Chart.js` hoặc `Recharts`) để trực quan hóa biểu đồ đường tăng trưởng doanh thu bán gói cước theo các bộ lọc thời gian (Tuần/Tháng/Quý).

### Các trang phụ trợ khác
*   **S17 - Xuất bản chương (`src/frontend/src/app/publish-chapter/page.tsx`):**
    *   Giao diện nộp chương dành cho tác giả. Thiết kế các nút chọn: "Xuất bản ngay" hoặc "Hẹn lịch xuất bản" (tích hợp ô chọn ngày giờ chi tiết). Nút bật/tắt cam kết không drop truyện.
*   **S18 - Lịch đăng & Cam kết (`src/frontend/src/app/schedule-commitment/page.tsx`):**
    *   Trang quản lý lộ trình của tác giả. Hiển thị biểu đồ theo dõi điểm uy tín sáng tác cá nhân, lịch trình ra chương tiếp theo đã cam kết công khai với độc giả.
*   **S20 - Kiểm duyệt nội dung (`src/frontend/src/app/content-moderation/page.tsx`):**
    *   Bảng hiển thị hàng đợi các chương truyện bị hệ thống AI Moderator đánh dấu nghi ngờ vi phạm (`FLAGGED`).
    *   Hiển thị chi tiết đoạn văn bị AI nghi ngờ kèm lý do cụ thể. Cung cấp 2 nút hành động trực tiếp cho Admin: "Duyệt thủ công" (Approved) hoặc "Từ chối xuất bản" (Rejected).
*   **S21 - Thống kê & Báo cáo (`src/frontend/src/app/reports/page.tsx`):**
    *   Giao diện quản lý báo cáo tài chính hệ thống của Admin. Cho phép cấu hình bộ lọc ngày bắt đầu - ngày kết thúc, loại báo cáo và nút click "Tải báo cáo" để download tệp Excel/PDF trực tiếp.
