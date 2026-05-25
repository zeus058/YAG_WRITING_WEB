# Kịch bản Kiểm thử Trải nghiệm & Khả năng sử dụng (UX/Usability Testing Specification)
*Dự án: **YAG - WRITING NOVELS WEB***
*Phương pháp:* Đánh giá dựa trên **10 Nguyên lý thiết kế tương tác của Jakob Nielsen**.

Tài liệu này đặc tả chi tiết các ca kiểm thử nhằm bảo đảm giao diện người dùng đạt trải nghiệm tối ưu, trực quan và dễ học hỏi.

---

## 1. Trạng thái Hệ thống Hiển thị Rõ ràng (Visibility of System Status)
*Hệ thống luôn phải thông báo cho người dùng biết chuyện gì đang xảy ra bằng các phản hồi thích hợp.*

### TC-UX-01.1: Trạng thái Tự động Lưu (Autosave Status) - Màn hình S16
- **Mục tiêu:** Kiểm tra chỉ báo trạng thái lưu bản thảo thời gian thực của tác giả.
- **Các bước thực hiện:**
  1. Truy cập vào Studio (S16) và bắt đầu gõ văn bản mới vào khung soạn thảo.
  2. Quan sát thanh trạng thái dưới cùng của trình soạn thảo.
  3. Ngừng gõ trong 1 giây và quan sát tiếp.
- **Kết quả mong đợi:**
  - Khi đang gõ: Hiển thị chỉ báo *"Đang lưu..."* nhấp nháy nhẹ.
  - Khi ngừng gõ: Chỉ báo thay đổi thành *"Đã lưu nháp"* kèm theo thời gian lưu gần nhất (< 200ms).
- **Trạng thái:** Sẵn sàng kiểm thử.

### TC-UX-01.2: Trạng thái Tải Tìm kiếm AI (AI Search Loading) - Màn hình S05
- **Mục tiêu:** Kiểm tra xem trạng thái tìm kiếm AI có rõ ràng khi hệ thống đang xử lý.
- **Các bước thực hiện:**
  1. Nhập truy vấn cốt truyện vào tab "AI Ngữ nghĩa" (Ví dụ: *"Truyện xuyên không nhân vật chính làm bác sĩ"*).
  2. Nhấn nút "Tìm kiếm".
- **Kết quả mong đợi:**
  - Hệ thống hiển thị **Skeleton Loading** (Khung xương xám chuyển động nhẹ) tương ứng với vị trí các thẻ truyện sẽ xuất hiện.
  - Người dùng không bị treo màn hình hoặc nhìn màn hình trống trơn.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 2. Tương thích với Thế giới Thực (Match Between System & Real World)
*Hệ thống nên nói ngôn ngữ quen thuộc của người dùng, sử dụng các khái niệm thực tế.*

### TC-UX-02.1: Bố cục Thư viện Đọc (Library Shelf layout) - Màn hình S11
- **Mục tiêu:** Độc giả dễ dàng liên kết thư viện đọc online với tủ sách thực tế.
- **Các bước thực hiện:**
  1. Mở trang "Thư viện cá nhân" (S11).
  2. Quan sát cách bài trí các bộ truyện đã theo dõi.
- **Kết quả mong đợi:**
  - Truyện được sắp xếp ngăn nắp dạng giá sách (dạng thẻ bìa sách dọc nổi bật, dễ lật mở).
  - Sử dụng biểu tượng **Đánh dấu trang (Bookmark)** quen thuộc cho tính năng lưu trang.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 3. Quyền Kiểm soát và Tự do của Người dùng (User Control & Freedom)
*Cung cấp lối thoát khẩn cấp cho các thao tác nhầm lẫn.*

### TC-UX-03.1: Hoàn tác Soạn thảo (Undo/Redo) - Màn hình S16
- **Mục tiêu:** Kiểm tra khả năng khôi phục văn bản khi tác giả soạn thảo nhầm.
- **Các bước thực hiện:**
  1. Nhập một đoạn văn bản dài.
  2. Thực hiện xóa nhầm đoạn văn bản đó.
  3. Nhấn tổ hợp phím `Ctrl + Z` (Undo).
  4. Nhấn tổ hợp phím `Ctrl + Y` (Redo).
- **Kết quả mong đợi:**
  - Khi nhấn `Ctrl + Z`: Đoạn văn bản bị xóa lập tức khôi phục đầy đủ.
  - Khi nhấn `Ctrl + Y`: Trả về trạng thái đã xóa trước khi hoàn tác.
- **Trạng thái:** Sẵn sàng kiểm thử.

### TC-UX-03.2: Thu hồi Lệnh Xuất bản (Dismiss Publishing Task) - Màn hình S17
- **Mục tiêu:** Cho phép tác giả dừng tiến trình đăng chương khi đổi ý.
- **Các bước thực hiện:**
  1. Ở màn hình xuất bản chương, bấm nút "Xuất bản".
  2. Trong lúc hệ thống đang đưa task vào hàng duyệt AI (trạng thái Pending), bấm nút "Hủy xuất bản/Thu hồi".
- **Kết quả mong đợi:**
  - Lệnh đăng chương lập tức dừng lại, chương không được duyệt công khai.
  - Trạng thái chương quay về Bản nháp (Draft) để tác giả tiếp tục sửa đổi.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 4. Tính Nhất quán và Tiêu chuẩn (Consistency & Standards)
*Tránh bắt người dùng thắc mắc về hành vi của các phần tử giao diện khác nhau.*

### TC-UX-04.1: Đồng bộ Hệ thống Nút bấm & Typography - Toàn giao diện
- **Mục tiêu:** Kiểm tra tính đồng bộ của UI Components trên toàn website.
- **Các bước thực hiện:**
  1. Di chuyển qua các trang: Trang chủ (S04), Chi tiết truyện (S06), Reader Mode (S07).
  2. Quan sát màu sắc của nút CTA chính (Primary Buttons), font chữ và bo góc.
- **Kết quả mong đợi:**
  - Màu sắc nút bấm chính luôn thống nhất (`#C81C30` đỏ thương hiệu hoặc màu chủ đạo đồng đều).
  - Độ bo góc của card truyện đồng đều 8px (`rounded-lg`).
  - Font chữ thống nhất (không bị lệch font hệ thống).
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 5. Phòng ngừa Lỗi (Error Prevention)
*Ngăn lỗi xảy ra ngay từ bước tương tác giao diện.*

### TC-UX-05.1: Cảnh báo Chưa lưu thay đổi (Unsaved Changes Warning) - Màn hình S16
- **Mục tiêu:** Ngăn chặn việc tác giả mất dữ liệu viết truyện do lỡ bấm nút Back/Rời trang.
- **Các bước thực hiện:**
  1. Đang soạn thảo văn bản trong Editor nhưng chưa bấm lưu hoặc chưa đồng bộ autosave hoàn tất.
  2. Click nút điều hướng trên Menu để chuyển trang khác.
- **Kết quả mong đợi:**
  - Trình duyệt/Ứng dụng chặn hành động rời đi và hiển thị hộp thoại cảnh báo: *"Chương truyện có thay đổi chưa lưu. Bạn có chắc chắn muốn rời đi?"*.
  - Người dùng có thể chọn *"Ở lại"* để tiếp tục viết hoặc *"Rời đi"* để hủy dữ liệu.
- **Trạng thái:** Sẵn sàng kiểm thử.

### TC-UX-05.2: Khóa Datetime trong Quá khứ (Disable Past Schedule) - Màn hình S18
- **Mục tiêu:** Ngăn chặn đặt lịch đăng chương truyện vào thời điểm đã qua.
- **Các bước thực hiện:**
  1. Mở màn hình Hẹn giờ xuất bản chương (S18).
  2. Chọn ngày hẹn giờ là ngày hôm qua.
- **Kết quả mong đợi:**
  - Bộ chọn ngày (Calendar Picker) làm mờ (disable) và chặn không cho chọn mọi ngày trong quá khứ.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 6. Nhận diện thay vì Ghi nhớ (Recognition Rather Than Recall)
*Hiển thị trực quan thông tin thay vì bắt người dùng nhớ lại.*

### TC-UX-06.1: Hiển thị Vết đọc Gần nhất (Reading Progress Indicators) - Màn hình S06
- **Mục tiêu:** Độc giả không cần nhớ mình đã đọc truyện đến chương mấy.
- **Các bước thực hiện:**
  1. Độc giả đã đọc truyện "Tiên Nghịch" đến chương 25 rồi thoát.
  2. Quay lại trang chi tiết truyện "Tiên Nghịch" (S06).
- **Kết quả mong đợi:**
  - Hệ thống tự động hiển thị nút CTA lớn màu đỏ với tiêu đề: *"Đọc tiếp Chương 25"* nổi bật ngay đầu trang.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 7. Linh hoạt và Hiệu quả Sử dụng (Flexibility & Efficiency of Use)
*Tăng tốc thao tác cho người dùng có kinh nghiệm.*

### TC-UX-07.1: Phím tắt Chuyển chương nhanh (Arrow Key Navigation) - Màn hình S07
- **Mục tiêu:** Độc giả chuyển chương cực nhanh bằng phím mũi tên.
- **Các bước thực hiện:**
  1. Đang ở màn hình đọc chương 12.
  2. Nhấn phím mũi tên phải (`Arrow Right`).
  3. Nhấn phím mũi tên trái (`Arrow Left`).
- **Kết quả mong đợi:**
  - Nhấn mũi tên phải: Chuyển sang tải chương 13 mượt mà.
  - Nhấn mũi tên trái: Quay lại tải chương 11.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 8. Thiết kế Thẩm mỹ và Tối giản (Aesthetic & Minimalist Design)
*Loại bỏ các thông tin dư thừa làm loãng sự chú ý.*

### TC-UX-08.1: Chế độ Đọc Tinh giản (Distraction-Free Mode) - Màn hình S07
- **Mục tiêu:** Độc giả không bị xao nhãng bởi các menu khi đang đọc truyện.
- **Các bước thực hiện:**
  1. Truy cập màn hình Reader Mode (S07).
  2. Cuộn chuột xuống dưới để đọc tiếp.
- **Kết quả mong đợi:**
  - Toàn bộ thanh điều hướng Header (Navbar) và Footer tự động ẩn đi êm ái.
  - Khi cuộn ngược lên trên, Header sẽ tự động hiển thị lại.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 9. Khắc phục Lỗi Thân thiện (Recover from Errors)
*Thông báo lỗi dễ hiểu và chỉ ra cách giải quyết.*

### TC-UX-09.1: Xử lý Lỗi Thanh toán Membership Thất bại - Màn hình S10
- **Mục tiêu:** Hướng dẫn người dùng khi thanh toán qua cổng VNPAY bị lỗi.
- **Các bước thực hiện:**
  1. Click thanh toán gói Membership nhưng hủy giao dịch trên giao diện VNPAY.
  2. Hệ thống chuyển hướng độc giả về trang Kết quả thanh toán S10.
- **Kết quả mong đợi:**
  - Màn hình hiển thị biểu tượng cảnh báo màu đỏ trực quan.
  - Thông báo thân thiện: *"Giao dịch chưa thành công do bạn đã hủy thanh toán hoặc tài khoản không đủ số dư."*
  - Có nút hành động rõ ràng: *"Thực hiện lại giao dịch"* dẫn về trang chọn gói S09.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 10. Trợ giúp & Hướng dẫn (Help & Documentation)
*Cung cấp hướng dẫn ngắn ngay tại ngữ cảnh.*

### TC-UX-10.1: Câu Prompt Gợi ý mẫu của AI (Prompt Context Help) - Màn hình S16
- **Mục tiêu:** Tác giả biết cách tương tác với AI Sidebar hiệu quả.
- **Các bước thực hiện:**
  1. Mở AI Sidebar bên phải trong màn hình soạn thảo S16.
  2. Quan sát giao diện trợ lý AI.
- **Kết quả mong đợi:**
  - Hiển thị tooltip hướng dẫn sử dụng.
  - Có sẵn danh mục 3-5 câu Prompt mẫu để click nhanh (Ví dụ: *"Gợi ý hội thoại nhân vật A"*, *"Viết tiếp cảnh chiến đấu"*).
- **Trạng thái:** Sẵn sàng kiểm thử.
