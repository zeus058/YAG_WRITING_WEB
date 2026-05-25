# BẢNG PHÂN CHIA CHI TIẾT TOÀN DIỆN CÔNG VIỆC THÀNH VIÊN (WBS)
## ĐỒ ÁN: YAG - NỀN TẢNG ĐỌC VÀ SÁNG TÁC TIỂU THUYẾT THÔNG MINH HỖ TRỢ BỞI AI

---

## MA TRẬN PHÂN CHIA TOÀN BỘ USE CASES VÀ PAGES (S01 - S21)

| Thành viên | Phụ trách Backend (Use Cases) | Phụ trách Frontend (Pages) | Nhiệm vụ Đặc biệt |
| :--- | :--- | :--- | :--- |
| **Trần Gia Hiển** | U001: Đăng ký / Đăng nhập<br>U002: Quản lý hồ sơ<br>U007: Đọc truyện & Caching | S01: Landing Page (Trang giới thiệu)<br>S02: Đăng nhập / Đăng ký (Auth Form)<br>S03: Khôi phục mật khẩu (OTP Form)<br>S04: Home Feed (Bảng xếp hạng/Đề xuất)<br>S07: Reader Mode (Giao diện đọc chính)<br>S11: Thư viện cá nhân (Tủ sách đã lưu)<br>S12: Hồ sơ cá nhân (Profile công khai) | **Co-lead Database**:<br>- Thiết kế Schema DB (users, profiles, v.v.)<br>- Cấu hình Seed dữ liệu mẫu hệ thống |
| **Nguyễn Duy Trường** | U003: Tạo & Quản lý Tác phẩm<br>U011: Đăng ký Membership<br>U012: Thanh toán VNPAY IPN | S09: Membership (So sánh cước & chọn gói)<br>S10: Kết quả thanh toán (Hóa đơn VNPAY)<br>S13: Cài đặt tài khoản (Đổi pass/Bảo mật)<br>S15: Thư viện tác phẩm Author (Quản lý viết) | **Co-lead Database**:<br>- Viết mã SQL Migrations tạo bảng/khóa ngoại<br>- Lập chỉ mục (Index) tối ưu hiệu năng SQL |
| **Nguyễn Phú Thọ** | U005: Xuất bản truyện<br>U013: Kiểm duyệt nội dung AI<br>U014: Giám sát lộ trình cam kết<br>U015: Quản trị hệ thống | S17: Xuất bản chương (Nộp chương, chọn lịch)<br>S18: Lịch đăng & Cam kết (Theo dõi uy tín)<br>S19: Admin Dashboard (Trang tổng quan Admin)<br>S20: Kiểm duyệt nội dung (Admin duyệt cờ)<br>S21: Thống kê & Báo cáo (Doanh thu Admin) | **DevOps Lead**:<br>- Cấu hình Docker & Docker Compose local<br>- Setup GitHub Actions CI/CD chạy Linter & Test tự động |
| **Phạm Hương Trà** | U006: Gợi ý tình tiết AI<br>U008: AI Tìm kiếm ngữ nghĩa (pgvector)<br>U009: AI Đề xuất truyện | S05: Khám phá & Tìm kiếm (AI Semantic Search)<br>S16 (Sidebar phải): Trợ lý Miu AI ở Editor | **QA/Testing Lead**:<br>- Thiết kế Test Plan & Test Suite tổng thể<br>- Kiểm thử tích hợp API & Báo cáo lỗi (Bug) |
| **Huỳnh Yến Nhi** | U004: Soạn thảo (Autosave WebSockets)<br>U010: Bình luận & Đánh giá (Real-time) | S06: Trang truyện Detail (Mục lục & comment)<br>S08: Diễn đàn (Cộng đồng WebSocket)<br>S14: Trung tâm thông báo (Badges WebSocket)<br>S16 (Editor trái): Khung soạn thảo Markdown | **Co-QA/Testing**:<br>- Kiểm thử Responsive trên Desktop/Mobile/Tablet<br>- Kiểm thử khả năng truy cập Usability/A11y |

---

## QUY TRÌNH HỢP TÁC & HOÀN THIỆN CODE (GIT FLOW)

1. **Gia Hiển & Duy Trường** triển khai SQL Script -> Tạo Database trên Docker local của cả nhóm.
2. **Phú Thọ** cấu hình file GitHub Actions Workflow lưu vào thư mục `.github/workflows/ci.yml`.
3. Từng thành viên tạo nhánh tương ứng với phần việc của mình (ví dụ: `feat/backend-content`, `feat/frontend-editor`) từ nhánh `dev`.
4. Khi push code lên GitHub, **CI/CD của Phú Thọ** sẽ chạy:
   * Nếu có lỗi cú pháp hoặc test bị fail -> CI báo đỏ -> Thành viên sửa lỗi.
   * Nếu CI báo xanh -> **Hương Trà & Yến Nhi** tiến hành kiểm định code chất lượng, chạy thử. Nếu ổn định sẽ duyệt Merge vào nhánh `dev`.
5. Sau khi hoàn thành tất cả tính năng, **Phú Thọ** thực hiện Deploy phiên bản ổn định nhất lên Google Cloud Run từ nhánh `main`.

---

## TIÊU CHÍ ĐÁNH GIÁ HOÀN THÀNH (DEFINITION OF DONE)

Một công việc chỉ được coi là hoàn thành (Done) khi đáp ứng đủ các tiêu chí:
*   [ ] Code sạch (Clean code), không còn các dòng comment thừa hoặc console.log dư thừa.
*   [ ] Đã được kiểm thử trên môi trường Local chạy không lỗi.
*   [ ] Đã được rà soát code (Code Reviewed) và được tích hợp thành công vào nhánh `dev` mà không gây ra lỗi xung đột (Conflict).
*   [ ] Được xác nhận kết nối ổn định giữa Frontend Next.js và Backend FastAPI.
