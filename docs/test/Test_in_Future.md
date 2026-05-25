### Intro2SE - Testing - Group 1

# YAG - WRITING NOVELS WEB

*Đồ án môn học Nhập môn Công nghệ phần mềm - HCMUS - Chính quy/2025-2026.*

**Mục lục**`
- [1. Member Contribution Assessment](#member-contribution-assessment)
- [2. Test plan](#test-plan)
- [3. Test cases](#test-cases)
  - [3.1. List of test cases](#list-of-test-cases)
  - [3.2. Test case specifications](#test-case-specifications)
- [4. AI Usage Declaration](#ai-usage-declaration)
- [5. Presentation](#presentation)
- [6. Reflective Report](#reflective-report)

## 1. Member Contribution Assessment

### 23120123 - Trần Gia Hiển (25%)

| Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- |
| ***TC-001 Bcrypt hash password*** | Viết và chạy unit test hàm băm mật khẩu |
| ***TC-002 Register -> JWT*** | Viết integration test luồng đăng ký -> JWT -> gọi API |
| ***TC-003 Login Rate Limit*** | Viết security test brute-force đăng nhập |
| ***TC-004 OTP Reset Flow*** | Viết integration test luồng reset mật khẩu OTP |
| ***TC-005 Avatar Upload*** | Viết integration test upload avatar Cloudinary |
| ***TC-006 Admin API Reject Reader*** | Viết security test JWT role check Admin API |

![Task Hien](images_test/hien_task.png)

### 23120151 - Huỳnh Yến Nhi (15%)

| Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- |
| ***TC-016 Redis Cache Hit/Miss*** | Viết integration test cache chapter Redis |
| ***TC-017 Bookmark + History*** | Viết integration test bookmark và lịch sử đọc |
| ***TC-018 Create Story + Cover*** | Viết integration test tạo truyện và upload cover |
| ***TC-019 WebSocket Autosave*** | Viết integration test autosave dừng 5s -> DB update |
| ***TC-020 Comment Real-time*** | Viết integration test broadcast bình luận WebSocket |
| ***TC-021 Responsive Mobile*** | Usability test responsive <768px (5 trang core) |
| ***TC-022 Responsive Tablet*** | Usability test responsive 768-1023px |
| ***TC-023 A11y Color Contrast*** | Accessibility test tương phản màu 3 chế độ đọc |
| ***TC-024 Cross-browser*** | Compatibility test Chrome/Edge/Firefox/Safari |

![Task Nhi](images_test/nhi_task.png)

### 23120169 - Nguyễn Phú Thọ (20%)

| Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- |
| ***TC-025 Publish -> RabbitMQ -> Worker*** | Viết integration test luồng xuất bản qua message queue |
| ***TC-026 AI Content Flag*** | Viết integration test worker AI phát hiện vi phạm |
| ***TC-027 Cron Reputation*** | Viết integration test cron trừ điểm reputation trễ lịch |
| ***TC-028 CI/CD Auto Test*** | Viết integration test pipeline lint + pytest tự động |

![Task Tho](images_test/tho_task.png)

### 23120177 - Phạm Hương Trà (20%)

| Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- |
| ***Write Test Plan*** | Soạn toàn bộ kế hoạch kiểm thử: phạm vi, kỹ thuật, đối tượng |
| ***TC-013 pgvector Cosine Unit Test*** | Viết unit test độ chính xác cosine distance |
| ***TC-014 AI Semantic Search E2E*** | Viết integration test tìm kiếm ngữ nghĩa AI |
| ***TC-015 Miu AI Suggestion*** | Viết integration test gợi ý AI Miu Sidebar |

![Task Tra](images_test/tra_task.png)

### 23120182 - Nguyễn Duy Trường (20%)

| Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- |
| ***TC-007 VNPAY HMAC Unit Test*** | Viết unit test sinh chữ ký HMAC-SHA512 |
| ***TC-008 RBAC Premium 403*** | Viết security test RBAC chapter premium hết hạn |
| ***TC-009 VNPAY Checkout URL*** | Viết integration test tạo URL thanh toán |
| ***TC-010 VNPAY IPN Success*** | Viết integration test xác thực IPN + cấp Premium |
| ***TC-011 vnp_txn_ref Uniqueness*** | Viết unit test sinh mã giao dịch không trùng lặp |
| ***TC-012 VNPAY Invalid Checksum*** | Viết security test từ chối IPN sai checksum |

![Task Truong](images_test/truong_task.png)

## 2. Test Plan

    Written by: 23120123 Trần Gia Hiển
    Reviewed by: 23120151 Huỳnh Yến Nhi

### 2.1 Scope

Dự án YAG là nền tảng đọc và sáng tác truyện với các tính năng cốt lõi: xác thực người dùng, thanh toán Premium (VNPAY), AI gợi ý nội dung và tìm kiếm ngữ nghĩa, xuất bản và kiểm duyệt nội dung tự động, WebSocket real-time và giao diện responsive.

- **Trong phạm vi kiểm thử:**
  - Toàn bộ API backend (FastAPI): xác thực, thanh toán, AI engine, RBAC
  - Frontend (Next.js): 5 trang core, responsive, accessibility
  - Luồng async: RabbitMQ, Celery worker, cron job
  - Bảo mật: JWT, RBAC, rate limit, checksum validation
  - Tích hợp hệ thống: Redis, Cloudinary, VNPAY IPN, Gemini API

- **Ngoài phạm vi:**
  - Kiểm thử hiệu năng tải cao (load testing)
  - Kiểm thử thâm nhập chuyên sâu (penetration testing)
  - Các dịch vụ bên thứ ba ngoài môi trường sandbox

### 2.2 Testing Techniques

| Kỹ thuật | Áp dụng trên | Công cụ |
| :--- | :--- | :--- |
| ***Unit Testing*** | Hàm băm Bcrypt, sinh chữ ký HMAC-SHA512, tính khoảng cách cosine pgvector, sinh vnp_txn_ref | pytest, unittest.mock |
| ***Integration Testing*** | Luồng API end-to-end, Redis cache, VNPAY IPN, RabbitMQ -> Worker, WebSocket autosave | pytest, httpx, TestClient (FastAPI) |
| ***Security Testing*** | JWT authentication, RBAC, rate limiting, checksum validation, Admin access control | pytest, httpx, Postman |
| ***Usability Testing*** | Responsive layout Mobile <768px và Tablet 768-1023px, 5 trang core | Browser DevTools, manual |
| ***Accessibility Testing*** | Tương phản màu sắc chế độ Light/Dark/Sepia (WCAG 2.1 AA) | Lighthouse, axe DevTools |
| ***Compatibility Testing*** | Cross-browser: Chrome, Edge, Firefox, Safari | BrowserStack / manual |

### 2.3 Test Objects

- **Functions / Modules:**
  - `auth.utils.hash_password()` - Bcrypt rounds=12
  - `payment.utils.generate_hmac_signature()` - VNPAY HMAC-SHA512
  - `ai.search.compute_cosine_distance()` - pgvector
  - `payment.utils.generate_txn_ref()` - unique transaction ID
  - `auth.middleware.rate_limiter()` - Redis sliding window

- **API Endpoints:**
  - `POST /api/v1/auth/register` và `/login`
  - `GET /api/v1/chapters/{chapter_id}` (Redis cache + RBAC)
  - `POST /api/v1/payment/vnpay/checkout`
  - `POST /api/v1/payment/vnpay/ipn`
  - `POST /api/v1/stories/{id}/publish`
  - `WS /ws/editor/{story_id}` (WebSocket autosave)

- **Documents / Tài liệu:**
  - SRS - kiểm tra các use case được triển khai đúng yêu cầu
  - API specification - kiểm tra response schema đúng contract

### 2.4 Environment

- **Backend:** FastAPI (Python 3.10+), PostgreSQL (with pgvector), Redis, RabbitMQ, Celery
- **Frontend:** Next.js (React), HTML5, CSS3, WebSocket
- **Testing Libraries:** pytest, httpx, TestClient, Lighthouse, axe DevTools, Browser DevTools

## 3. Test cases

### 3.1. List of test cases

    Written by: 23120177 Phạm Hương Trà - 23120123 Trần Gia Hiển
    Reviewed by: 23120169 Nguyễn Phú Thọ

Nhóm tập trung kiểm thử toàn diện cho **5 tính năng cốt lõi (5 Critical Features)** của hệ thống YAG. Dưới đây là danh sách phân loại mã hóa các tính năng cốt lõi:

| Feature ID | Feature |
| :--- | :--- |
| ***F1*** | Authentication & Account Security (Auth & JWT) |
| ***F2*** | Premium Membership Payment (VNPAY Integration) |
| ***F3*** | AI Novel Assistant & Semantic Search (AI Novel Engine) |
| ***F4*** | Collaborative Editor & Responsive UI/UX (WebSocket & UI/UX) |
| ***F5*** | Async Queue Publishing & AI Moderation (RabbitMQ & Worker) |

Dưới đây là danh sách chi tiết 28 test cases ứng với từng mã tính năng:

| Seq | Test case | Feature | Description |
| :--- | :--- | :--- | :--- |
| 1 | TC-001: Bcrypt hash password | F1 | Kiểm nghiệm tính chính xác của thuật toán băm mật khẩu Bcrypt với độ phức tạp cao |
| 2 | TC-002: Register -> JWT -> Call protected API | F1 | Luồng tích hợp Đăng ký, sinh mã Access Token JWT và gọi tài nguyên bảo vệ thành công |
| 3 | TC-003: Login brute-force rate limit | F1 | Kiểm tra cơ chế tự động chặn brute-force và hạn chế request đăng nhập sai liên tiếp |
| 4 | TC-004: OTP password reset flow | F1 | Quy trình khôi phục mật khẩu thông qua mã xác thực OTP gửi qua email |
| 5 | TC-005: Avatar upload validation + Cloudinary | F1 | Xác thực định dạng ảnh avatar, tự động resize và tải lên lưu trữ đám mây Cloudinary |
| 6 | TC-006: Admin API reject reader JWT | F1 | Chặn độc giả thường hoặc tác giả cố gắng gọi các API thao tác nghiệp vụ của Admin |
| 7 | TC-007: VNPAY HMAC-SHA512 signature | F2 | Kiểm định tính chuẩn xác trong sinh mã chữ ký bảo mật giao dịch HMAC-SHA512 |
| 8 | TC-008: RBAC premium chapter 403 expired | F2 | Chặn quyền đọc chương truyện VIP đối với tài khoản độc giả thường hoặc gói đã hết hạn |
| 9 | TC-009: VNPAY checkout URL generation | F2 | Khởi tạo giao dịch mua gói Premium thành công và trả về URL thanh toán VNPAY hợp lệ |
| 10 | TC-010: VNPAY IPN success -> premium_until update | F2 | Tiếp nhận phản hồi IPN callback thành công, cập nhật trạng thái cước Premium |
| 11 | TC-011: vnp_txn_ref uniqueness | F2 | Đảm bảo tính duy nhất và không trùng lặp của mã hóa đơn thanh toán trên hệ thống |
| 12 | TC-012: VNPAY IPN invalid checksum -> reject | F2 | Từ chối xác nhận cập nhật gói hội viên khi chữ ký checksum của VNPAY sai lệch |
| 13 | TC-013: pgvector Cosine distance accuracy | F3 | Đánh giá tính chính xác của hàm đo khoảng cách Vector phục vụ AI Search |
| 14 | TC-014: AI semantic search end-to-end | F3 | Luồng tìm kiếm cốt truyện bằng ngôn ngữ tự nhiên sử dụng pgvector |
| 15 | TC-015: Miu AI suggestion 3 options JSON | F3 | Tác giả yêu cầu AI Miu Sidebar gợi ý tình tiết kế tiếp trả về cấu trúc 3 phương án |
| 16 | TC-016: Redis chapter cache hit/miss | F4 | Tích hợp Redis đệm chương truyện giúp phản hồi nhanh và giảm tải cho Postgres |
| 17 | TC-017: Bookmark + reading history update | F4 | Cập nhật tiến trình lưu thư viện và ghi nhận lịch sử chương đọc dở của người dùng |
| 18 | TC-018: Create story + cover upload | F4 | Tác giả khởi tạo tác phẩm, cập nhật thông tin chung và upload bìa truyện lên Cloudinary |
| 19 | TC-019: WebSocket autosave 5s trigger | F4 | Tự động đồng bộ bản nháp chương đang soạn thảo lên DB qua WebSocket khi dừng gõ 5 giây |
| 20 | TC-020: Comment broadcast real-time | F4 | Độc giả gửi bình luận, hệ thống phát broadcast thời gian thực đến toàn bộ người đọc |
| 21 | TC-021: Responsive Mobile <768px (5 core pages) | F4 | Đảm bảo hiển thị co giãn chuẩn xác trên thiết bị di động cho các trang cốt lõi |
| 22 | TC-022: Responsive Tablet 768-1023px | F4 | Kiểm nghiệm bố cục, tương thích hiển thị trên kích thước màn hình máy tính bảng |
| 23 | TC-023: A11y color contrast Light/Dark/Sepia | F4 | Kiểm định độ tương phản phông chữ đạt chuẩn bảo vệ mắt trên 3 chế độ nền đọc |
| 24 | TC-024: Cross-browser compatibility 4 browsers | F4 | Đảm bảo website hoạt động mượt mà đồng nhất trên Chrome, Edge, Firefox, và Safari |
| 25 | TC-025: Publish -> RabbitMQ -> Worker -> Approved | F5 | Quy trình xuất bản chương, đẩy hàng đợi bất đồng bộ RabbitMQ và tự động phê duyệt |
| 26 | TC-026: Worker AI flags violating content | F5 | Hệ thống Worker AI phát hiện nội dung độc hại/nhạy cảm và gắn cờ cảnh báo chương truyện |
| 27 | TC-027: Cron trừ reputation khi trễ lịch | F5 | Bộ lập lịch tự động quét trễ lịch đăng cam kết và phạt trừ điểm uy tín của tác giả |
| 28 | TC-028: CI/CD lint + pytest auto-block on fail | F5 | Tự động hóa chạy kiểm thử tích hợp trên GitHub Actions để chặn code lỗi khi push |

### 3.2. Test case specifications

#### 3.2.1. TC-001: Bcrypt hash password

    Written by: 23120123 Trần Gia Hiển
    Reviewed by: 23120182 Nguyễn Duy Trường

| *Test case* | TC-001 |
| :--- | :--- |
| Related feature | U001 — Bảo mật thông tin mật khẩu |
| Context | Kiểm thử đơn vị (Unit Test) cho hàm băm mật khẩu người dùng nhằm đảm bảo tính bảo mật trước khi lưu vào CSDL |
| Input Data | Mật khẩu thô dạng chuỗi văn bản cần mã hóa |
| Expected Output | Kết quả băm của mật khẩu phải có độ dài chuẩn xác và không thể dịch ngược trở lại thành văn bản thô ban đầu |
| Test steps | 1. Truyền chuỗi mật khẩu thô vào hàm băm mật khẩu <br> 2. Kiểm tra chuỗi trả về có bắt đầu bằng tiền tố ký hiệu đặc trưng của thuật toán Bcrypt hay không <br> 3. Thử đối chiếu mật khẩu thô với chuỗi băm để xác nhận khớp kết quả |
| Actual Output | [Thành viên điền kết quả thực tế vào đây sau khi chạy test] |
| Result | Passed / Failed |

#### 3.2.2. TC-002: Register -> JWT -> Call protected API

    Written by: 23120123 Trần Gia Hiển
    Reviewed by: 23120182 Nguyễn Duy Trường

| *Test case* | TC-002 |
| :--- | :--- |
| Related feature | U001 — Đăng ký / Đăng nhập |
| Context | Người dùng mới thực hiện đăng ký tài khoản, nhận JWT access token và dùng token đó để gọi một API yêu cầu xác thực |
| Input Data | `POST /api/v1/auth/register` body: `{ "username": "testuser_tc004", "email": "tc004@yag.dev", "password": "P@ssw0rd!123" }` |
| Expected Output | 1. Register trả về HTTP 201, body chứa `access_token` (JWT) và `token_type: "bearer"` <br> 2. Decode JWT: payload chứa `user_id`, `username`, `role: "reader"` <br> 3. `GET /api/v1/profiles/me` với header `Authorization: Bearer <token>` trả về HTTP 200 và thông tin profile đúng với user vừa tạo |
| Test steps | 1. Gửi `POST /api/v1/auth/register` với body trên <br> 2. Xác nhận response status = 201 <br> 3. Lấy `access_token` từ response body <br> 4. Decode JWT, kiểm tra payload fields <br> 5. Gửi `GET /api/v1/profiles/me` với header Bearer token <br> 6. Xác nhận status = 200 và `email` trùng khớp |
| Actual Output | [Thành viên điền kết quả thực tế vào đây sau khi chạy test] |
| Result | Passed / Failed |

#### 3.2.3. TC-003: Login brute-force rate limit

    Written by: 23120123 Trần Gia Hiển
    Reviewed by: 23120182 Nguyễn Duy Trường

| *Test case* | TC-003 |
| :--- | :--- |
| Related feature | U001 — Bảo mật đăng nhập |
| Context | Kẻ tấn công gửi nhiều lần đăng nhập sai liên tiếp vào cùng một tài khoản; hệ thống phải kích hoạt rate limiting để ngăn brute-force |
| Input Data | `POST /api/v1/auth/login` body: `{ "email": "target@yag.dev", "password": "WrongPass!" }` — gửi lặp lại 6 lần liên tiếp trong vòng 60 giây |
| Expected Output | 1. Các lần 1-5: HTTP 401 với message `"Invalid credentials"` <br> 2. Lần thứ 6 trở đi: HTTP 429 `"Too many login attempts. Please try again later."` <br> 3. Sau 60 giây: tài khoản tự động mở khóa, đăng nhập đúng mật khẩu trả về HTTP 200 |
| Test steps | 1. Tạo user `target@yag.dev` trong DB <br> 2. Gửi 5 request đăng nhập sai -> kiểm tra từng response trả về 401 <br> 3. Gửi request thứ 6 -> kiểm tra response trả về 429 <br> 4. Chờ 61 giây <br> 5. Gửi request đăng nhập đúng mật khẩu -> kiểm tra response 200 |
| Actual Output | [Thành viên điền kết quả thực tế vào đây sau khi chạy test] |
| Result | Passed / Failed |

#### 3.2.4. TC-004: OTP password reset flow

    Written by: 23120123 Trần Gia Hiển
    Reviewed by: 23120182 Nguyễn Duy Trường

| *Test case* | TC-004 |
| :--- | :--- |
| Related feature | U001 — Khôi phục tài khoản |
| Context | Người dùng yêu cầu khôi phục mật khẩu thông qua hòm thư điện tử bằng mã OTP hệ thống tự sinh |
| Input Data | Tên email tài khoản cần khôi phục, mật khẩu mới mong muốn |
| Expected Output | Hệ thống sinh mã OTP gửi qua hòm thư thành công, xác thực OTP chính xác cho phép đổi mật khẩu mới trong DB |
| Test steps | 1. Gửi request yêu cầu cấp OTP khôi phục mật khẩu tới API <br> 2. Nhận và lấy mã OTP được sinh ra trong CSDL/Redis <br> 3. Gửi request xác nhận khôi phục mật khẩu kèm mã OTP và mật khẩu mới để kiểm tra |
| Actual Output | [Thành viên điền kết quả thực tế vào đây sau khi chạy test] |
| Result | Passed / Failed |

#### 3.2.5. TC-005: Avatar upload validation + Cloudinary

    Written by: 23120123 Trần Gia Hiển
    Reviewed by: 23120182 Nguyễn Duy Trường

| *Test case* | TC-005 |
| :--- | :--- |
| Related feature | U002 — Cập nhật hồ sơ cá nhân |
| Context | Người dùng thực hiện đăng tải hình ảnh làm avatar cá nhân lên máy chủ đám mây Cloudinary |
| Input Data | Tệp hình ảnh tải lên có các định dạng kiểm thử khác nhau và kích thước dung lượng khác nhau |
| Expected Output | Chấp nhận ảnh đúng định dạng chuẩn, tự động resize hình ảnh, tải lên Cloudinary lấy URL và từ chối các file quá kích thước |
| Test steps | 1. Gửi request upload file hình ảnh hợp lệ -> kiểm tra URL lưu CSDL <br> 2. Gửi request upload tệp tin không phải định dạng ảnh hoặc quá kích thước 2MB -> kiểm tra mã báo lỗi |
| Actual Output | [Thành viên điền kết quả thực tế vào đây sau khi chạy test] |
| Result | Passed / Failed |

#### 3.2.6. TC-006: Admin API reject reader JWT

    Written by: 23120123 Trần Gia Hiển
    Reviewed by: 23120182 Nguyễn Duy Trường

| *Test case* | TC-006 |
| :--- | :--- |
| Related feature | U015 — Bảo mật phân quyền Admin |
| Context | Người dùng thông thường sử dụng Access Token JWT của mình để gọi các API thuộc quyền quản lý của Admin |
| Input Data | Request gọi API lấy báo cáo tài chính hoặc duyệt cờ chương kèm theo Bearer JWT Token của tài khoản có role là reader/author |
| Expected Output | API từ chối thực thi và phản hồi mã lỗi HTTP 403 (Forbidden) bảo vệ tài nguyên hệ thống |
| Test steps | 1. Đăng nhập tài khoản độc giả thường để lấy JWT Token <br> 2. Gửi request gọi API Admin (ví dụ: `/api/v1/admin/reports`) kèm token trên <br> 3. Kiểm tra response có trả về đúng mã lỗi HTTP 403 hay không |
| Actual Output | [Thành viên điền kết quả thực tế vào đây sau khi chạy test] |
| Result | Passed / Failed |

#### 3.2.7. TC-007: VNPAY HMAC-SHA512 signature

    Written by: 23120182 Nguyễn Duy Trường
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.8. TC-008: RBAC premium chapter 403 expired

    Written by: 23120182 Nguyễn Duy Trường
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.9. TC-009: VNPAY checkout URL generation

    Written by: 23120182 Nguyễn Duy Trường
    Reviewed by: 23120123 Trần Gia Hiển


#### 3.2.10. TC-010: VNPAY IPN success -> premium_until update

    Written by: 23120182 Nguyễn Duy Trường
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.11. TC-011: vnp_txn_ref uniqueness

    Written by: 23120182 Nguyễn Duy Trường
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.12. TC-012: VNPAY IPN invalid checksum -> reject

    Written by: 23120182 Nguyễn Duy Trường
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.13. TC-013: pgvector Cosine distance accuracy

    Written by: 23120177 Phạm Hương Trà
    Reviewed by: 23120169 Nguyễn Phú Thọ

#### 3.2.14. TC-014: AI semantic search end-to-end

    Written by: 23120177 Phạm Hương Trà
    Reviewed by: 23120169 Nguyễn Phú Thọ

#### 3.2.15. TC-015: Miu AI suggestion 3 options JSON

    Written by: 23120177 Phạm Hương Trà
    Reviewed by: 23120169 Nguyễn Phú Thọ

#### 3.2.16. TC-016: Redis chapter cache hit/miss

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.17. TC-017: Bookmark + reading history update

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.18. TC-018: Create story + cover upload

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.19. TC-019: WebSocket autosave 5s trigger

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.20. TC-020: Comment broadcast real-time

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.21. TC-021: Responsive Mobile <768px (5 core pages)

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.22. TC-022: Responsive Tablet 768-1023px

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.23. TC-023: A11y color contrast Light/Dark/Sepia

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.24. TC-024: Cross-browser compatibility 4 browsers

    Written by: 23120151 Huỳnh Yến Nhi
    Reviewed by: 23120123 Trần Gia Hiển

#### 3.2.25. TC-025: Publish -> RabbitMQ -> Worker -> Approved

    Written by: 23120169 Nguyễn Phú Thọ
    Reviewed by: 23120182 Nguyễn Duy Trường

#### 3.2.26. TC-026: Worker AI flags violating content

    Written by: 23120169 Nguyễn Phú Thọ
    Reviewed by: 23120182 Nguyễn Duy Trường

#### 3.2.27. TC-027: Cron trừ reputation khi trễ lịch

    Written by: 23120169 Nguyễn Phú Thọ
    Reviewed by: 23120182 Nguyễn Duy Trường

#### 3.2.28. TC-028: CI/CD lint + pytest auto-block on fail

    Written by: 23120169 Nguyễn Phú Thọ
    Reviewed by: 23120182 Nguyễn Duy Trường

## 4. AI Usage Declaration

Chưa cần viết.

## 5. Presentation

Chưa cần viết.

## 6. Reflective Report
### 6.1 Most helpful sections
Chưa cần viết.

### 6.2 Unnecessary/Tedious sections
Chưa cần viết.