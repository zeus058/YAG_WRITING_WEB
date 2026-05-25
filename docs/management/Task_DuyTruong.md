# CÔNG VIỆC CHI TIẾT - NGUYỄN DUY TRƯỜNG
## VAI TRÒ: DATABASE ARCHITECT & CORE BUSINESS BACKEND & MEMBERSHIP SPECIALIST

---

## 1. CƠ SỞ DỮ LIỆU (DATABASE DESIGN & IMPLEMENTATION)
*Hợp tác chặt chẽ với Trần Gia Hiển để thiết kế, tạo bảng và cấu hình dữ liệu mẫu cho cụm bảng truyện và giao dịch.*

### A. Thiết kế chi tiết cấu trúc bảng (PostgreSQL)
*   **Bảng `stories` (Quản lý tác phẩm sáng tác):**
    *   `id`: Kiểu dữ liệu `UUID`, khóa chính, tự động sinh (`DEFAULT gen_random_uuid()`).
    *   `author_id`: Kiểu dữ liệu `UUID`, khóa ngoại liên kết `users(id)` kèm ràng buộc xóa dây chuyền (`ON DELETE CASCADE`).
    *   `title`: Kiểu dữ liệu `VARCHAR(255)`, không rỗng, duy nhất (`UNIQUE`).
    *   `description`: Kiểu dữ liệu `TEXT`, tóm tắt cốt truyện.
    *   `cover_url`: Kiểu dữ liệu `VARCHAR(255)`, URL lưu ảnh bìa trên Cloudinary.
    *   `category`: Kiểu dữ liệu `VARCHAR(50)`, thể loại chính.
    *   `status`: Kiểu dữ liệu `VARCHAR(20)`, mặc định `'ongoing'`, ràng buộc `CHECK (status IN ('ongoing', 'completed', 'paused'))`.
    *   `view_count`: Kiểu dữ liệu `INTEGER`, mặc định `0`.
    *   `rating_avg`: Kiểu dữ liệu `DECIMAL(3,2)`, mặc định `0.00`, giới hạn từ `0.00` đến `5.00`.
    *   `created_at`, `updated_at`: Kiểu dữ liệu `TIMESTAMP`, mặc định `NOW()`.
*   **Bảng `chapters` (Nội dung chương chi tiết):**
    *   `id`: Kiểu dữ liệu `UUID`, khóa chính.
    *   `story_id`: Kiểu dữ liệu `UUID`, khóa ngoại liên kết `stories(id)` (`ON DELETE CASCADE`).
    *   `chapter_number`: Kiểu dữ liệu `INTEGER`, số thứ tự chương, lớn hơn 0.
    *   `title`: Kiểu dữ liệu `VARCHAR(255)`, tiêu đề chương.
    *   `content`: Kiểu dữ liệu `TEXT`, nội dung chữ chi tiết của chương.
    *   `moderation_status`: Kiểu dữ liệu `VARCHAR(20)`, mặc định `'pending'`, ràng buộc `CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'))`.
    *   `is_premium`: Kiểu dữ liệu `BOOLEAN`, mặc định `FALSE`. Xác định chương VIP hay Miễn phí.
    *   `publish_at`: Kiểu dữ liệu `TIMESTAMP`, lịch hẹn giờ xuất bản công khai.
*   **Bảng `membership_plans` (Danh mục các gói cước hội viên):**
    *   `id`: Kiểu dữ liệu `VARCHAR(30)`, khóa chính (ví dụ: `'MONTHLY'`, `'YEARLY'`).
    *   `name`: Kiểu dữ liệu `VARCHAR(100)`, tên gói cước (ví dụ: 'Gói Bạc 1 Tháng').
    *   `duration_days`: Kiểu dữ liệu `INTEGER`, thời hạn gói tính bằng ngày (> 0).
    *   `price`: Kiểu dữ liệu `DECIMAL(12,2)`, giá trị tiền cước (>= 0).
    *   `description`: Kiểu dữ liệu `TEXT`, mô tả quyền lợi của gói cước.
*   **Bảng `transactions` (Lịch sử giao dịch thanh toán):**
    *   `id`: Kiểu dữ liệu `UUID`, khóa chính.
    *   `user_id`: Kiểu dữ liệu `UUID`, khóa ngoại liên kết `users(id)` (`ON DELETE SET NULL`).
    *   `plan_id`: Kiểu dữ liệu `VARCHAR(30)`, khóa ngoại liên kết `membership_plans(id)`.
    *   `amount`: Kiểu dữ liệu `DECIMAL(12,2)`, số tiền thực thanh toán (> 0).
    *   `vnp_txn_ref`: Kiểu dữ liệu `VARCHAR(100)`, mã tham chiếu giao dịch duy nhất gửi cho VNPAY.
    *   `vnp_transaction_no`: Kiểu dữ liệu `VARCHAR(100)`, mã giao dịch chính thức từ hệ thống VNPAY.
    *   `status`: Kiểu dữ liệu `VARCHAR(20)`, mặc định `'pending'`, ràng buộc `CHECK (status IN ('pending', 'success', 'failed'))`.
    *   `created_at`, `updated_at`: Kiểu dữ liệu `TIMESTAMP`, mặc định `NOW()`.

### B. SQL Migrations & Tối ưu hóa Database
*   Viết đầy đủ tệp script SQL Migrations chứa tất cả câu lệnh `CREATE TABLE`, `ALTER TABLE`, và thiết lập Ràng buộc.
*   **Lập chỉ mục hiệu năng (Indexing):**
    *   Tạo index dạng B-Tree cho các cột thường tìm kiếm: `stories(title)`, `stories(category)`, `chapters(story_id, chapter_number)`.
    *   Tạo index duy nhất (`UNIQUE INDEX`) cho các mã tham chiếu giao dịch: `transactions(vnp_txn_ref)`.

---

## 2. LẬP TRÌNH NGHIỆP VỤ BACKEND (FASTAPI USE CASES)

### [U003] Tạo & Quản lý Tác phẩm
*   **API Tạo truyện mới (`POST /api/v1/stories`):**
    *   Xác thực quyền tác giả (`role = 'author'`).
    *   Kiểm tra trùng lặp tiêu đề truyện trong CSDL.
    *   Nhận file ảnh bìa truyện từ client, tải lên Cloudinary trong thư mục `/yag/covers/`, nén ảnh và lấy URL lưu vào DB.
*   **API Cập nhật thông tin truyện (`PUT /api/v1/stories/{story_id}`):**
    *   Cho phép sửa ảnh bìa, tóm tắt truyện, và đổi trạng thái tiến độ sáng tác.
*   **API Quản lý chương (`GET /api/v1/author/stories/{story_id}/chapters`):**
    *   Liệt kê toàn bộ chương truyện (kể cả chương đang soạn, chưa duyệt) của chính tác giả để quản lý.

### [U011] Đăng ký Membership
*   **API Danh mục gói cước (`GET /api/v1/membership/plans`):**
    *   Truy xuất và trả về danh sách các gói cước hội viên có sẵn trong bảng `membership_plans`.
*   **Middleware Phân quyền RBAC nâng cao:**
    *   Xây dựng bộ lọc chặn quyền truy cập đối với chương Premium: Khi có yêu cầu lấy nội dung chương truyện, kiểm tra xem chương đó có `is_premium = True` hay không.
    *   Nếu có: Truy vấn hạn gói hội viên (`premium_until`) của User thực hiện request. Nếu `premium_until` rỗng hoặc nhỏ hơn thời gian hiện tại, từ chối trả về nội dung chương và trả về mã lỗi HTTP 403 (Forbidden) yêu cầu nâng cấp gói.

### [U012] Thanh toán VNPAY IPN
*   **API Khởi tạo URL Thanh toán (`POST /api/v1/payments/vnpay/checkout`):**
    *   Tạo mới bản ghi giao dịch trong bảng `transactions` dưới trạng thái `pending`.
    *   Sinh mã `vnp_txn_ref` duy nhất đại diện cho hóa đơn.
    *   Đóng gói tham số theo quy định của VNPAY (Merchant ID, Order Type, Amount, Return URL, IP Address, v.v.).
    *   Sử dụng mã băm bảo mật (Hash Key) được cấp để sinh chữ ký bảo mật checksum dạng **HMAC-SHA512** và nối vào chuỗi tham số, tạo ra link chuyển hướng người dùng sang VNPAY Sandbox.
*   **Xây dựng Endpoint VNPAY IPN (`GET /api/v1/payments/vnpay/ipn`):**
    *   Đây là API nhận tín hiệu ngầm trực tiếp từ Server VNPAY sang Server YAG (không qua trình duyệt của user để chống gian lận).
    *   **Logic xử lý IPN:**
        1. Lấy tất cả tham số do VNPAY gửi về, tách phần chữ ký bảo mật (`vnp_SecureHash`).
        2. Sắp xếp các tham số theo bảng chữ cái và sinh chữ ký đối so sánh cục bộ. Nếu không khớp chữ ký, trả về thông báo lỗi lỗi chữ ký số.
        3. Truy vấn transaction tương ứng trong CSDL bằng `vnp_txn_ref`. Đối chiếu số tiền thanh toán (`vnp_Amount`) khớp với hóa đơn.
        4. Kiểm tra trạng thái hiện tại của transaction. Nếu đang `pending`, tiến hành cập nhật trạng thái thành `success` (hoặc `failed` tùy mã phản hồi của VNPAY).
        5. **Cấp hạn sử dụng Premium:** Lấy số ngày sử dụng (`duration_days`) của gói cước trong bảng `membership_plans`, tính toán và cộng dồn vào trường `premium_until` của tài khoản độc giả mua gói. Trả về cho VNPAY mã xác nhận thành công `{ "RspCode": "00", "Message": "Confirm success" }`.

---

## 3. ĐIỀU CHỈNH GIAO DIỆN FRONTEND (NEXT.JS PAGES)

### [Core Page] S09 - Membership (`src/frontend/src/app/membership/page.tsx`)
*   **Thiết kế bảng so sánh gói cước:**
    *   Xây dựng giao diện giới thiệu các đặc quyền Premium đẳng cấp (đọc sớm chương độc quyền, giao diện không chứa quảng cáo, huy hiệu vàng nổi bật trong bình luận).
    *   Thiết kế các thẻ Card hiển thị giá tiền, thời hạn (Tháng/Năm) và nút bấm "Mua gói Premium".
    *   Khi người dùng click nút "Mua", kích hoạt gọi API tạo link checkout của VNPAY. Khi nhận được URL thanh toán từ API trả về, thực hiện chuyển hướng trình duyệt của người dùng sang cổng thanh toán VNPAY an toàn.

### Các trang phụ trợ khác
*   **S10 - Kết quả thanh toán (`src/frontend/src/app/payment-result/page.tsx`):**
    *   Màn hình đích đón nhận người dùng quay về sau khi giao dịch trên VNPAY hoàn tất.
    *   Trang lấy các tham số trên URL (`vnp_ResponseCode`, `vnp_SecureHash`, v.v.) gửi lên API Backend để xác thực hóa đơn thực tế.
    *   Nếu thanh toán thành công, hiển thị hiệu ứng pháo hoa (celebration effect), thông báo nâng cấp tài khoản Premium thành công kèm mã hóa đơn và thời hạn sử dụng. Nếu thất bại, hiển thị thông báo lỗi chi tiết và nút liên kết thử lại.
*   **S13 - Cài đặt tài khoản (Phụ trách giao diện cước phí):**
    *   Hiển thị thông tin trực quan về gói hội viên hiện tại của độc giả, ngày hết hạn và lịch sử các hóa đơn đã thanh toán.
*   **S15 - Thư viện tác phẩm Author (`src/frontend/src/app/author-works/page.tsx`):**
    *   Giao diện trung tâm sáng tác của tác giả. Hiển thị danh mục các bộ truyện do mình sáng tác dạng lưới (Grid Card).
    *   Mỗi card truyện hiển thị ảnh bìa, tiêu đề, số chương hiện có, tổng số lượt xem, trạng thái (Đang viết/Tạm ngưng) và nút "Thêm chương mới" để dẫn thẳng vào trang Studio của Yến Nhi.
