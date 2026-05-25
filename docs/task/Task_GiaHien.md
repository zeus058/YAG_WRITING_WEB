# CÔNG VIỆC CHI TIẾT - TRẦN GIA HIỂN
## VAI TRÒ: TEAM LEADER & UI/UX FRONTEND LEAD & DATABASE CO-WORKER

---

## 1. CƠ SỞ DỮ LIỆU (DATABASE DESIGN & IMPLEMENTATION)
*Hợp tác chặt chẽ với Nguyễn Duy Trường để thiết kế, tạo bảng và cấu hình dữ liệu mẫu cho cụm bảng phân quyền và người dùng.*

### A. Thiết kế chi tiết cấu trúc bảng (PostgreSQL)
*   **Bảng `users` (Quản lý tài khoản bảo mật):**
    *   `id`: Kiểu dữ liệu `UUID`, khóa chính, tự động sinh (`DEFAULT gen_random_uuid()`).
    *   `username`: Kiểu dữ liệu `VARCHAR(50)`, duy nhất (`UNIQUE`), không rỗng (`NOT NULL`).
    *   `email`: Kiểu dữ liệu `VARCHAR(100)`, duy nhất (`UNIQUE`), định dạng chuẩn email, không rỗng (`NOT NULL`).
    *   `password_hash`: Kiểu dữ liệu `VARCHAR(255)`, lưu mật khẩu đã được băm.
    *   `role`: Kiểu dữ liệu `VARCHAR(20)`, có ràng buộc kiểm tra (`CHECK (role IN ('admin', 'author', 'reader'))`).
    *   `premium_until`: Kiểu dữ liệu `TIMESTAMP`, cho phép rỗng (`NULL`). Xác định thời hạn hội viên.
    *   `created_at`, `updated_at`: Kiểu dữ liệu `TIMESTAMP`, mặc định lấy thời gian hiện tại (`DEFAULT NOW()`).
*   **Bảng `profiles` (Hồ sơ người dùng & uy tín tác giả):**
    *   `user_id`: Kiểu dữ liệu `UUID`, khóa chính, khóa ngoại liên kết `users(id)` kèm ràng buộc xóa dây chuyền (`ON DELETE CASCADE`).
    *   `display_name`: Kiểu dữ liệu `VARCHAR(100)`, không rỗng.
    *   `avatar_url`: Kiểu dữ liệu `VARCHAR(255)`, URL lưu ảnh trên Cloudinary.
    *   `bio`: Kiểu dữ liệu `TEXT`, giới thiệu bản thân ngắn.
    *   `reputation_score`: Kiểu dữ liệu `INTEGER`, giá trị mặc định là `100`, khoảng giá trị hợp lệ từ `0` đến `100` (`CHECK (reputation_score BETWEEN 0 AND 100)`).
*   **Bảng `reading_histories` (Tiến trình đọc dở):**
    *   `id`: Kiểu dữ liệu `UUID`, khóa chính.
    *   `user_id`: Kiểu dữ liệu `UUID`, liên kết bảng `users(id)` (`ON DELETE CASCADE`).
    *   `story_id`: Kiểu dữ liệu `UUID`, liên kết bảng `stories(id)` (`ON DELETE CASCADE`).
    *   `last_chapter_id`: Kiểu dữ liệu `UUID`, liên kết bảng `chapters(id)` (`ON DELETE SET NULL`).
    *   `last_read_at`: Kiểu dữ liệu `TIMESTAMP`, tự động cập nhật khi có tương tác đọc chương.
*   **Bảng `libraries` (Tủ sách / Bookmarks):**
    *   `user_id`, `story_id`: Khóa chính phức hợp (Composite Key), là các khóa ngoại liên kết tới bảng tương ứng.
    *   `bookmarked_at`: Kiểu dữ liệu `TIMESTAMP`, mặc định `NOW()`.

### B. Tạo dữ liệu mẫu (Database Seeding)
*   Viết mã script SQL nạp dữ liệu mẫu ban đầu gồm:
    *   Ít nhất 2 tài khoản quản trị viên (`role = 'admin'`).
    *   Ít nhất 5 tài khoản tác giả (`role = 'author'`) đã điền đầy đủ profile.
    *   Ít nhất 10 tài khoản độc giả thường và 5 độc giả Premium (`premium_until` còn hạn).
    *   Cấu hình sẵn bản ghi lịch sử đọc và thư viện bookmark tương ứng để kiểm thử.

---

## 2. LẬP TRÌNH NGHIỆP VỤ BACKEND (FASTAPI USE CASES)

### [U001] Đăng ký / Đăng nhập & Khôi phục mật khẩu
*   **API Đăng ký (`POST /api/v1/auth/register`):**
    *   Kiểm tra tính hợp lệ của dữ liệu gửi lên (sử dụng thư viện `pydantic`).
    *   Mã hóa mật khẩu một chiều sử dụng thuật toán **Bcrypt** với độ phức tạp `rounds = 12` trước khi lưu vào PostgreSQL.
    *   Sinh mã JWT Token bao gồm payload: `user_id`, `username`, `role`.
*   **API Đăng nhập (`POST /api/v1/auth/login`):**
    *   Kiểm tra sự tồn tại của `email` hoặc `username`.
    *   Đối chiếu mật khẩu gửi lên với mật khẩu băm trong database sử dụng thư viện `passlib`.
    *   Cấp Access Token (JWT) có thời hạn 1 giờ và Refresh Token lưu trữ trong cơ sở dữ liệu/cookie bảo mật.
*   **API Khôi phục mật khẩu:**
    *   `POST /api/v1/auth/password-reset/request`: Nhận email, tạo mã OTP 6 chữ số ngẫu nhiên có hiệu lực 5 phút, lưu vào Redis và gửi qua email cho người dùng (kết nối Gmail SMTP).
    *   `POST /api/v1/auth/password-reset/confirm`: Nhận mã OTP, email, và mật khẩu mới. Xác thực OTP trong Redis, nếu khớp tiến hành băm mật khẩu mới và cập nhật vào Postgres.

### [U002] Quản lý hồ sơ
*   **API Cập nhật Profile (`PUT /api/v1/profiles/me`):**
    *   Xác thực quyền sở hữu qua JWT Token. Cho phép chỉnh sửa `display_name`, `bio`.
*   **Tích hợp tải ảnh Cloudinary (`POST /api/v1/profiles/avatar`):**
    *   Đón nhận file hình ảnh (`UploadFile`) dạng multipart/form-data.
    *   Kiểm tra định dạng ảnh (`image/png`, `image/jpeg`, `image/webp`) và giới hạn kích thước tối đa 2MB.
    *   Kết nối SDK Cloudinary, tải ảnh lên thư mục `/yag/avatars/`, áp dụng tự động resize ảnh về dạng hình vuông (250x250 pixels) và định dạng sang WebP để tối ưu băng thông. Trả về CDN URL lưu vào DB.

---

## 3. ĐIỀU CHỈNH GIAO DIỆN FRONTEND (NEXT.JS PAGES)

### [Core Page] S07 - Reader Mode (`src/frontend/src/app/reader-mode/page.tsx`)
*   **Tùy biến hiển thị văn bản:**
    *   Xây dựng thanh công cụ Floating Toolbar góc màn hình. Sử dụng React State để lưu trữ cấu hình trải nghiệm đọc của người dùng:
        *   Màu nền: Sáng (nền trắng, chữ đen), Sepia (nền vàng dịu, chữ nâu gỗ), Tối (nền đen/xám đậm, chữ trắng sáng nhẹ).
        *   Cỡ chữ: Cho phép tăng/giảm cỡ chữ từ 14px đến 28px.
        *   Phông chữ: Cho phép đổi giữa font Sans-serif (dễ đọc trên màn hình điện thoại) và Serif (chuẩn truyện chữ truyền thống).
    *   Lưu cấu hình đọc này vào `localStorage` của trình duyệt để lần sau mở ra không phải cấu hình lại.
*   **Bảo vệ bản quyền truyện (Anti-Copy):**
    *   Sử dụng CSS `user-select: none; -webkit-user-select: none;` để ngăn chặn việc bôi đen văn bản.
    *   Viết Javascript chặn các phím tắt và sự kiện hệ thống:
        *   Chặn sự kiện click chuột phải (`contextmenu`).
        *   Chặn phím tắt sao chép (`Ctrl+C`, `Cmd+C`), cắt (`Ctrl+X`), chọn tất cả (`Ctrl+A`), in ấn (`Ctrl+P`), và xem mã nguồn trang (`Ctrl+U` hoặc `F12` cơ bản).
*   **Mục lục phụ:** Thiết kế sidebar phụ hiển thị danh sách chương và thanh tiến độ đọc (đọc được bao nhiêu % của chương).

### Các trang phụ trợ khác
*   **S01 - Landing Page (`src/frontend/src/app/page.tsx`):**
    *   Hoàn thiện bố cục giao diện thu hút người dùng mới, tích hợp các hiệu ứng cuộn mượt (smooth scrolls), giới thiệu các tính năng AI nổi bật và các gói Membership.
*   **S02 - Đăng nhập / Đăng ký (`src/frontend/src/app/auth/page.tsx`):**
    *   Thiết kế biểu mẫu (Form) với các hiệu ứng chuyển tab mượt mà.
    *   Kiểm tra tính hợp lệ dữ liệu đầu vào (Email chuẩn, mật khẩu trên 8 ký tự). Hiển thị thông báo lỗi trực quan (toast notification) khi đăng nhập sai hoặc thiếu thông tin.
*   **S03 - Khôi phục mật khẩu:**
    *   Giao diện quy trình 3 bước: nhập email -> nhập mã OTP nhận từ hòm thư -> nhập mật khẩu mới.
*   **S04 - Home Feed (`src/frontend/src/app/dashboard/page.tsx`):**
    *   Sắp xếp lại giao diện trang chủ sau đăng nhập. Tích hợp thanh trượt carousel giới thiệu các truyện Hot, hiển thị danh mục truyện đề xuất AI và bảng xếp hạng cập nhật view trực quan.
*   **S11 - Thư viện cá nhân (`src/frontend/src/app/library/page.tsx`):**
    *   Hiển thị danh sách truyện dạng thẻ Grid cực đẹp, hiển thị huy hiệu trạng thái "Mới cập nhật" của truyện và nút bấm đọc tiếp chương đang dang dở.
*   **S12 - Hồ sơ cá nhân (`src/frontend/src/app/profile/page.tsx`):**
    *   Giao diện Profile công khai, có nút chỉnh sửa hồ sơ đối với chính chủ, hiển thị danh sách truyện tự viết đối với tác giả.
*   **S13 - Cài đặt tài khoản (`src/frontend/src/app/account-settings/page.tsx`):**
    *   Biểu mẫu đổi mật khẩu, cấu hình chế độ bảo mật tài khoản.
