# [UI_UX_DESIGN_SYSTEM]

## 1. Bảng Màu Tropical Vibe Chủ Đạo (Bắt buộc sử dụng đúng mã HEX)
Hệ thống UI thiết kế theo xu hướng hiện đại, nghệ thuật nhưng phải đảm bảo khả năng đọc văn bản thời gian dài không gây mỏi mắt.
- **Primary / Call-to-Action (CTA):** `#C81C30` (Crimson Root) - Dành riêng cho các nút hành động cốt lõi mang tính chuyển đổi cao: *Xuất bản chương, Đăng ký Membership, Xác nhận thanh toán VNPAY*.
- **Secondary / Highlight Accent:** `#FEBDB2` (Coral Drift) - Dành cho trạng thái `hover`, hiệu ứng focus viền biểu mẫu, đường bao bọc các thẻ (Tags) phân loại thể loại truyện.
- **Background / Surface (Light Mode):** `#FFECCE` (Petal Light) - Nền chủ đạo của toàn bộ trang đọc truyện. Tone màu kem ấm dịu mắt, mô phỏng chất liệu trang giấy sách cổ, giúp bảo vệ mắt độc giả khỏi ánh sáng xanh.
- **Text / Dark Mode Background:** `#41503D` (Jungle) - Đóng vai trò làm màu chữ chính (Primary Text) hiển thị rõ nét trên nền kem ở chế độ Light Mode, hoặc đảo vai trò làm màu nền chủ đạo cho toàn bộ hệ thống khi người dùng kích hoạt chế độ Dark Mode.

## 2. Khuôn Mẫu Bố Cục & Trải Nghiệm (Layout UX Patterns)
- **Author Studio (Giao diện viết truyện):** Bắt buộc triển khai cấu trúc **Split View** toàn màn hình: 70% không gian bên trái dành cho khung soạn thảo văn bản tối giản (Distraction-free Editor) để tác giả tập trung cao độ; 30% không gian bên phải dành riêng cho thanh Sidebar trợ lý AI (AI Assistant) hỗ trợ gợi ý tình tiết theo ngữ cảnh (giới hạn bối cảnh cắt tối đa 1000 từ mỗi lượt gọi để tránh lỗi Rate Limit).
- **Reader Mode (Không gian đọc truyện):** Cấu trúc giao diện cực kỳ thoáng đãng, tự động ẩn toàn bộ Thanh điều hướng chính (Navbar) và Footer hệ thống ngay khi độc giả thực hiện hành vi cuộn chuột xuống. Tích hợp Widget hỗ trợ tinh chỉnh nhanh kích thước font chữ và đổi màu nền giấy (Light/Dark/Sepia).
- **Xử lý trạng thái tải (Loading UX):** Nghiêm cấm lạm dụng vòng xoay Spinner thô sơ chặn toàn màn hình. Bắt buộc áp dụng cấu trúc **Skeleton Loading** (Khung xương màu xám lấp lánh nhẹ) khớp chính xác với hình dáng của các khối nội dung.
- **Diễn đàn Tương tác (Forum Real-time):** Giao diện thảo luận của độc giả và tác giả phải được cập nhật thời gian thực qua WebSockets (`Socket.io-client`). Các bình luận mới gửi lên phải tự động trượt mượt mà vào luồng hiển thị dưới cùng của trang thảo luận mà không bắt người dùng phải làm mới (F5) trang web.
