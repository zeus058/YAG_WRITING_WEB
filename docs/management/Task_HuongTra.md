# CÔNG VIỆC CHI TIẾT - PHẠM HƯƠNG TRÀ
## VAI TRÒ: QA/TESTING LEAD & AI SMART ENGINE SPECIALIST

---

## 1. TRƯỞNG BAN KIỂM ĐỊNH CHẤT LƯỢNG (QA/TESTING LEAD)

### A. Xây dựng tài liệu Kế hoạch kiểm thử tổng thể (Test Plan)
*   **Xác định phạm vi:** Lên danh sách toàn bộ các thành phần hệ thống cần kiểm thử, bao gồm 15 Use Cases nghiệp vụ, kiểm thử hiệu năng API, và độ ổn định của luồng bất đồng bộ (RabbitMQ).
*   **Thiết kế kịch bản kiểm thử (Test Cases):**
    *   **Unit Tests:** Thiết kế các ca kiểm thử đơn lẻ cho Backend (kiểm tra hàm mã hóa mật khẩu Bcrypt, hàm sinh chữ ký số thanh toán VNPAY, hàm đo lường khoảng cách Cosine của Vector).
    *   **Integration Tests:** Viết các ca kiểm thử tích hợp kiểm tra luồng dữ liệu thông suốt giữa Frontend Next.js và Backend FastAPI (ví dụ: Quy trình Đăng nhập -> Lưu Token -> Gọi API chương VIP -> API trả về dữ liệu chuẩn).
    *   **Security Tests:** Kiểm định khả năng bảo mật (chặn Reader không được truy cập API Admin Dashboard, kiểm tra API Gateway chặn Brute-force mật khẩu bằng Rate Limiting).

### B. Chủ trì chiến dịch kiểm thử & Lập báo cáo chất lượng
*   Chủ trì đợt kiểm thử thực tế toàn bộ tính năng của nhóm trên môi trường local và staging.
*   **Lập Biên bản theo dõi lỗi (Bug Report):** Thiết lập file theo dõi lỗi (gồm: ID lỗi, màn hình lỗi, mô tả lỗi, mức độ nghiêm trọng, người phụ trách sửa, trạng thái Open/Closed) để các thành viên sửa lỗi kịp thời.
*   Viết tài liệu báo cáo kết quả kiểm thử (Test Report) tổng hợp tỷ lệ pass/fail các testcase để hoàn thiện báo cáo đồ án nộp cho giảng viên.

---

## 2. LẬP TRÌNH TRÍ TUỆ NHÂN TẠO BACKEND (AI ENGINE USE CASES)

### [U006] Gợi ý tình tiết AI (Miu AI Sidebar)
*   **API Gemini Assistant (`POST /api/v1/ai/suggestions`):**
    *   Xác thực quyền tác giả qua JWT Token. Tiếp nhận tham số gửi lên gồm: `chapter_id`, `context` (đoạn văn bản tác giả viết gần nhất, giới hạn tối đa 1000 từ để tránh tràn token) và `mode` (hướng đi muốn gợi ý: kịch tính, lãng mạn, bí ẩn).
    *   **Thiết kế Prompt Engineering bảo mật, chuẩn xác:**
        *   Định nghĩa vai trò cho Gemini là một Biên tập viên văn học cao cấp, hiểu tâm lý độc giả và có phong cách hành văn xuất sắc.
        *   Truyền văn cảnh truyện (`context`), yêu cầu Gemini phân tích mạch truyện hiện tại, giọng văn (tone) để đưa ra đúng 3 phương án gợi ý phát triển tình tiết tiếp theo ngắn gọn, lôi cuốn.
        *   Yêu cầu định dạng kết quả trả về dạng JSON có cấu trúc gồm: tiêu đề gợi ý, nội dung đoạn văn gợi ý chi tiết.
    *   Thực hiện xử lý ngoại lệ (Fallback) khi gọi API Gemini thất bại (quá quota, mất mạng) để không làm treo giao diện soạn thảo.

### [U008] AI Tìm kiếm ngữ nghĩa (pgvector)
*   **Tích hợp `pgvector` vào Database:**
    *   Đảm bảo extension `pgvector` được cài đặt thành công trên PostgreSQL (`CREATE EXTENSION IF NOT EXISTS vector;`).
    *   Thiết kế bảng `story_embeddings` liên kết với bảng `stories` qua khóa ngoại `story_id`, chứa trường `embedding` kiểu dữ liệu `vector(1536)` (độ rộng vector tương thích với mô hình Gemini Embedding API).
*   **Đồng bộ hóa Vector khi cập nhật truyện:**
    *   Viết logic Backend: Mỗi khi tác giả tạo mới hoặc cập nhật đoạn tóm tắt truyện (`description`), gọi API Gemini để biến đổi đoạn text đó thành một mảng số Vector 1536 chiều, sau đó lưu/cập nhật vào bảng `story_embeddings`.
*   **API Tìm kiếm ngữ nghĩa (`POST /api/v1/stories/search`):**
    *   Đón nhận câu truy vấn tự nhiên của độc giả nhập vào (ví dụ: *"tìm cho tôi truyện tiên hiệp nhân vật chính thông minh bắt đầu từ phế vật"*).
    *   Gọi Gemini API chuyển hóa câu truy vấn đó thành Vector truy vấn.
    *   Thực hiện truy vấn SQL sử dụng toán tử khoảng cách Cosine `<=>` của pgvector: `SELECT story_id, plot_summary, (embedding <=> {query_vector}) AS distance FROM story_embeddings ORDER BY distance ASC LIMIT 10;`. Trả về danh sách truyện có độ tương đồng ngữ nghĩa cao nhất.

### [U009] AI Đề xuất truyện (AI Recommendation)
*   **API Gợi ý cá nhân hóa (`GET /api/v1/recommendations`):**
    *   Truy xuất lịch sử đọc truyện (`reading_histories`) và thư viện yêu thích (`libraries`) của độc giả hiện tại để xây dựng "Vector sở thích độc giả".
    *   So khớp Vector sở thích đó với các Vector của kho truyện trong bảng `story_embeddings` bằng khoảng cách Cosine.
    *   Lọc bỏ các truyện độc giả đã đọc hết, đề xuất danh sách top 5 tác phẩm có độ tương đồng sở thích cao nhất.

---

## 3. ĐIỀU CHỈNH GIAO DIỆN FRONTEND (NEXT.JS PAGES)

### [Core Page] S05 - Discover & Search (`src/frontend/src/app/discover/page.tsx`)
*   **Thiết kế Giao diện Tìm kiếm ngữ nghĩa AI:**
    *   Xây dựng thanh tìm kiếm thông minh nổi bật. Tích hợp nút chuyển đổi chế độ: "Tìm kiếm từ khóa cơ bản" (chạy Full-text search Postgres của Duy Trường) và "Tìm kiếm cốt truyện bằng AI" (chạy pgvector).
    *   Thiết kế khung Sidebar chứa bộ lọc nâng cao (lọc theo thể loại, trạng thái ongoing/completed, số lượng chương).
    *   **Trải nghiệm người dùng cực cao:** Lập trình hiệu ứng **Skeleton Loading** (khung xám lấp lánh nhẹ) trong lúc chờ API Vector phản hồi kết quả tìm kiếm ngữ nghĩa từ AI, tạo cảm giác hệ thống phản hồi cực nhanh, chuyên nghiệp.

### Các trang phụ trợ khác
*   **S16 - Trợ lý Miu AI Sidebar (Phần 30% bên phải trang Studio):**
    *   Thiết kế giao diện sidebar phụ trợ soạn thảo, hiển thị biểu tượng chú mèo Miu AI lấp lánh dễ thương.
    *   Thiết kế các nút bấm nhanh: "Gợi ý kịch tính", "Gợi ý lãng mạn", "Gợi ý bí ẩn".
    *   Hiển thị 3 phương án gợi ý tình tiết của AI sinh ra dưới dạng các thẻ text bóng bẩy.
    *   Gắn sự kiện Click nút "Chèn vào truyện" trên mỗi thẻ gợi ý để tự động chèn đoạn văn của AI vào con trỏ chuột hiện tại trên khung soạn thảo Markdown của Yến Nhi ở bên trái.
