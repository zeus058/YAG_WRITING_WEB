# CÔNG VIỆC CHI TIẾT - HUỲNH YẾN NHI
## VAI TRÒ: FRONTEND DEVELOPER & CO-QA / COMPATIBILITY TESTING SPECIALIST

---

## 1. ĐỒNG BAN KIỂM ĐỊNH CHẤT LƯỢNG (CO-QA & COMPATIBILITY)

### A. Kiểm thử khả năng hiển thị tương thích (Responsive Testing)
*   **Thiết lập quy trình kiểm thử giao diện chéo:**
    *   Chịu trách nhiệm kiểm định giao diện hiển thị hoạt động tốt và không bị vỡ bố cục trên đa dạng thiết bị sử dụng Chrome DevTools và kiểm thử thực tế:
        *   **Desktop / Laptop (1024px trở lên):** Đảm bảo bố cục chia cột (Layout split-view, Sidebar) của trang đọc/viết hiển thị chuẩn xác.
        *   **Tablet (768px - 1023px):** Kiểm tra các nút ẩn hiện, sidebar trượt tự đóng mở gọn gàng.
        *   **Mobile (dưới 768px):** Tối ưu hóa kích thước nút bấm dễ click ngón tay, ẩn bớt các widget phụ không cần thiết, chuyển menu ngang thành Menu Hamburger gọn gàng.
*   Kiểm tra tính nhất quán hiển thị trên các trình duyệt phổ biến: Google Chrome, Microsoft Edge, Mozilla Firefox và Safari.

### B. Kiểm thử Khả năng truy cập & Trải nghiệm (Usability / Accessibility)
*   **Accessibility (A11y) check:** Kiểm định độ tương phản màu sắc của phông chữ trên các chế độ nền đọc (Light, Dark, Sepia) ở trang S07 của Gia Hiển để đạt tiêu chuẩn bảo vệ mắt tốt nhất.
*   **Spell & Visual Check:** Rà soát và trực tiếp sửa các lỗi chính tả giao diện, chỉnh sửa vị trí khoảng cách đệm (Padding/Margin) bị lệch lệch trên Frontend.
*   Đồng hành cùng Hương Trà chạy thử nghiệm thủ công toàn hệ thống, ghi chép lỗi và kiểm chứng sau khi thành viên sửa xong.

---

## 2. LẬP TRÌNH TƯƠNG TÁC THỜI GIAN THỰC BACKEND (FASTAPI WEBSOCKETS)

### [U004] Soạn thảo chương truyện (WebSocket Autosave)
*   **Lập trình kết nối WebSocket hai chiều:**
    *   Viết module kết nối WebSockets trong FastAPI (`/api/v1/author/chapters/{chapter_id}/ws`).
    *   Khi tác giả soạn thảo, thiết lập cơ chế kết nối liên tục từ Client tới WebSocket Server.
    *   **Thuật toán tự động lưu nháp (Autosave):**
        *   Thiết lập sự kiện lắng nghe: Mỗi khi tác giả dừng gõ chữ quá 5 giây hoặc định kỳ mỗi 10 giây, Client âm thầm gửi payload JSON chứa tiêu đề và nội dung chương hiện tại qua WebSocket.
        *   Backend tiếp nhận dữ liệu từ WebSocket, thực hiện cập nhật ghi đè nhanh nội dung vào bảng `chapters` trong PostgreSQL dưới trạng thái `draft`.
        *   Sau khi lưu thành công, Backend gửi tín hiệu phản hồi xác nhận `"Autosave success"` về cho client để hiển thị biểu tượng thông báo xanh an toàn trên màn hình, giúp tác giả tuyệt đối yên tâm không bao giờ bị mất bản thảo.

### [U010] Bình luận & Đánh giá (Real-time Broadcast)
*   **API Đăng Bình luận & Đánh giá sao (`POST /api/v1/chapters/{chapter_id}/comments`):**
    *   Xác thực quyền hạn người dùng qua JWT Token.
    *   Kiểm tra dữ liệu đầu vào (nội dung bình luận không để trống, số sao đánh giá từ 1 đến 5 sao).
    *   **Hỗ trợ bình luận phân cấp:** Thiết lập trường `parent_id` trong bảng `comments` để hỗ trợ độc giả có thể reply trực tiếp các bình luận của người khác, tạo thành luồng thảo luận dạng cây (nested comments).
*   **Phát bình luận thời gian thực:**
    *   Tích hợp cơ chế Pub/Sub của **Redis** kết hợp WebSockets.
    *   Khi có bình luận mới được lưu thành công vào CSDL Postgres, Backend sẽ phát (Broadcast) bình luận đó qua WebSocket đến toàn bộ các độc giả khác đang cùng mở trang đọc chương truyện đó để bình luận tự động xuất hiện cuộn xuống màn hình thời gian thực mà không bắt họ F5 trang.

---

## 3. ĐIỀU CHỈNH GIAO DIỆN FRONTEND (NEXT.JS PAGES)

### [Core Page] S16 - Author Studio (Editor - Phần 70% bên trái trang Studio)
*   **Giao diện Soạn thảo Markdown mượt mà:**
    *   Thiết kế khung soạn thảo văn bản chiếm 70% diện tích bên trái màn hình. Tích hợp bộ gõ hỗ trợ định dạng Markdown trực quan (tiêu đề, in đậm, in nghiêng, trích dẫn).
    *   Lập trình bộ đếm số từ tự động cập nhật thời gian thực khi tác giả gõ phím.
    *   Tích hợp khung Sidebar bên trái hiển thị danh sách Chương nháp, Dàn ý chương và các thẻ ghi chú tình tiết để tác giả tiện định hình mạch viết.
    *   Kết nối với WebSocket Autosave ở Backend. Thiết kế huy hiệu nhỏ góc màn hình: hiển thị *"Đang lưu..."* khi đang truyền và hiển thị *"Đã lưu tự động lúc [Giờ:Phút]"* màu xanh dịu khi lưu thành công.

### Các trang phụ trợ khác
*   **S06 - Trang truyện Detail (`src/frontend/src/app/story-detail/page.tsx`):**
    *   Trang thông tin truyện. Điều chỉnh khu vực hiển thị Mục lục chương truyện và Tab bình luận độc giả.
    *   Lập trình form viết bình luận phân cấp mượt mà, cho phép nhấp "Trả lời" dưới mỗi comment. Tích hợp thanh chọn rating 5 sao trực quan bằng hình ngôi sao lấp lánh (hiệu ứng hover đổi màu).
*   **S08 - Diễn đàn cộng đồng (`src/frontend/src/app/forum/page.tsx`):**
    *   Trang mạng xã hội thảo luận dành riêng cho hội mê truyện chữ. Hiển thị danh sách các bài viết (Topics).
    *   Tích hợp WebSocket để hiển thị tức thời các chủ đề thảo luận mới hoặc các câu reply thảo luận ngay khi có người gửi bài.
*   **S14 - Trung tâm thông báo (`src/frontend/src/app/notifications/page.tsx`):**
    *   Trang tổng hợp thông báo. Tích hợp WebSocket kết nối Backend đẩy các badge đỏ nhỏ xinh ở góc chuông thông báo khi có chương mới ra mắt hoặc khi tác phẩm của tác giả được duyệt thành công bởi AI.
