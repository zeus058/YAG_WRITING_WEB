# [GLOBAL_PROJECT_RULES]
- Project Name: YAG - Writing Novels Web
- Architecture Pattern: Modular Monolith (Domain-Driven Design).
- Coding Style: Triển khai Clean Code và tuân thủ nghiêm ngặt nguyên tắc DRY (Don't Repeat Yourself).
- Output Requirement: Mã nguồn trả về phải hoàn chỉnh 100%, sẵn sàng thực thi và biên dịch. Tuyệt đối nghiêm cấm việc giải thích dông dài trước/sau block code và không sử dụng mã giả hoặc placeholder dạng `// code thêm ở đây`.

# [LANGUAGE_RULES]
- Ghi chú mã nguồn (Comments) và tài liệu đặc tả: Bắt buộc sử dụng **Tiếng Việt**.
- Đặt tên biến, tên hàm, tên file, định dạng bảng cơ sở dữ liệu và cấu trúc API Payload: Bắt buộc sử dụng **Tiếng Anh**.

# [SECURITY_CONSTRAINTS]
- Bảo mật tài khoản: Mật khẩu người dùng bắt buộc mã hóa bằng thuật toán Bcrypt trước khi lưu trữ vào PostgreSQL. Tuyệt đối không lưu chuỗi thô (Plaintext).
- Chống cào tác quyền (Anti-crawling): Cấu hình cơ chế Rate Limiting tại tầng API Gateway để ngăn chặn Brute-force đăng nhập và chống bot tự động cào quét nội dung truyện.
- An toàn thanh toán: Tuyệt đối không lưu trữ thông tin số thẻ hay tài khoản ngân hàng của người dùng; mọi quy trình thanh toán giao phó cho cổng trung gian.