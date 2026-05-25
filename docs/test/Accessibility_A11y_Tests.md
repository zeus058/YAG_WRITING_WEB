# Kịch bản Kiểm thử Khả năng tiếp cận (Accessibility / A11y Testing Specification)
*Dự án: **YAG - WRITING NOVELS WEB***
*Phương pháp:* Áp dụng tiêu chuẩn **W3C WCAG 2.1 (Web Content Accessibility Guidelines - Cấp độ AA)**.

Tài liệu này đặc tả chi tiết các kịch bản kiểm thử nhằm bảo đảm tất cả mọi người dùng (kể cả những người dùng có khiếm khuyết về thị lực hoặc vận động phải dùng bàn phím/trình đọc màn hình) đều có thể tiếp cận và sử dụng nền tảng YAG một cách trọn vẹn.

---

## 1. Khả năng Điều hướng Bàn phím (Keyboard Navigability)
*Đảm bảo website có thể tương tác đầy đủ chỉ bằng bàn phím mà không cần chuột.*

### TC-A11Y-01.1: Thứ tự Phím Tab Logic (Logical Tab Order) - Toàn giao diện
- **Mục tiêu:** Kiểm tra thứ tự di chuyển con trỏ focus qua phím `Tab`.
- **Các bước thực hiện:**
  1. Truy cập vào Trang chủ (S04) hoặc trang Khám phá & Tìm kiếm (S05).
  2. Rút chuột máy tính ra hoàn toàn.
  3. Nhấn phím `Tab` liên tục để di chuyển qua các liên kết, ô nhập liệu và nút bấm.
  4. Nhấn tổ hợp phím `Shift + Tab` để di chuyển ngược lại.
- **Kết quả mong đợi:**
  - Vị trí focus di chuyển một cách tự nhiên theo luồng đọc từ trái qua phải, từ trên xuống dưới.
  - Con trỏ không bị kẹt lại ở bất kỳ phân hệ nào (Không bị lỗi Keyboard Trap).
  - Mọi nút chức năng (nút tìm kiếm, nút lọc, thẻ truyện) đều nhận được focus.
- **Trạng thái:** Sẵn sàng kiểm thử.

### TC-A11Y-01.2: Vòng hiển thị Focus rõ nét (Visible Focus Indicator / Focus Ring)
- **Mục tiêu:** Người dùng nhận biết rõ phần tử nào đang được chọn.
- **Các bước thực hiện:**
  1. Nhấn phím `Tab` để di chuyển con trỏ qua các nút bấm chính (CTA) và các ô nhập liệu (Input).
  2. Quan sát biểu hiện viền của phần tử khi nhận focus.
- **Kết quả mong đợi:**
  - Xuất hiện một đường viền nổi bật (Focus Ring - màu xanh dương đậm `#3B82F6` hoặc màu có độ tương phản cao, dày tối thiểu 2px) bao quanh phần tử đang được chọn.
  - Không được ẩn outline bằng thuộc tính CSS `outline: none` mà không có phương án thay thế trực quan.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 2. Độ tương phản & Thu phóng hiển thị (Contrast & Text Resizing)
*Bảo đảm chữ viết luôn rõ ràng, dễ đọc trong mọi điều kiện ánh sáng và kích cỡ.*

### TC-A11Y-02.1: Tỷ lệ Tương phản Chữ trên Nền (Text Contrast Ratio) - Màn hình S07
- **Mục tiêu:** Đảm bảo độ tương phản màu chữ đạt chuẩn WCAG AA (tối thiểu 4.5:1).
- **Các bước thực hiện:**
  1. Mở trang đọc truyện Reader Mode (S07).
  2. Kiểm tra độ tương phản giữa chữ truyện (mặc định) và màu nền bằng công cụ kiểm định màu (Color Contrast Analyzer / DevTools).
  3. Kích hoạt chế độ nền **Sepia** (vàng ngà) và **Dark Mode** (nền tối), tiến hành đo độ tương phản lần lượt.
- **Kết quả mong đợi:**
  - Độ tương phản chữ trên nền sáng mặc định: Đạt ≥ 4.5:1 (Không dùng màu đen tuyền trên nền trắng tinh gây mỏi mắt, sử dụng xám sẫm `#1F2937` trên nền trắng ngà `#FAF9F6`).
  - Độ tương phản trên nền Sepia và nền tối Dark Mode: Luôn đạt ≥ 4.5:1.
- **Trạng thái:** Sẵn sàng kiểm thử.

### TC-A11Y-02.2: Thu phóng trang Web 200% (Browser Zooming adaptation)
- **Mục tiêu:** Kiểm tra giao diện co giãn không bị vỡ hoặc mất chữ khi người dùng phóng to.
- **Các bước thực hiện:**
  1. Mở trang Khám phá & Tìm kiếm (S05) hoặc Soạn thảo Studio (S16).
  2. Nhấn tổ hợp phím `Ctrl +` (hoặc dùng menu trình duyệt) để phóng to màn hình lên **200%**.
- **Kết quả mong đợi:**
  - Giao diện Next.js thích ứng mượt mà (Responsive/Reflow), chữ tự động xuống dòng và co giãn vừa vặn với chiều rộng màn hình mới.
  - Không xuất hiện thanh cuộn ngang (Horizontal Scrollbar) gây khó khăn khi cuộn trang.
  - Các chữ và nút bấm không bị đè chèn lên nhau.
- **Trạng thái:** Sẵn sàng kiểm thử.

---

## 3. Tương thích Trình đọc Màn hình (Screen Reader Compatibility)
*Đảm bảo website truyền tải đầy đủ thông tin phi ngôn ngữ cho người khiếm thị qua giọng nói.*

### TC-A11Y-03.1: Thuộc tính Alt của Hình ảnh (Alternative Text for Images)
- **Mục tiêu:** Cung cấp mô tả cho ảnh bìa truyện và avatar người dùng.
- **Các bước thực hiện:**
  1. F12 kiểm tra mã nguồn (Inspect element) các ảnh bìa truyện trên trang Khám phá (S05) và Chi tiết truyện (S06).
  2. Chạy thử trình đọc màn hình (Windows Narrator / NVDA) và cho đọc qua ảnh bìa.
- **Kết quả mong đợi:**
  - Toàn bộ thẻ `<img>` đều bắt buộc phải có thuộc tính `alt` mô tả nội dung ảnh (Ví dụ: `<img src="cover.jpg" alt="Bìa truyện Kiếm Hiệp Nam Đế" />`).
  - Trình đọc màn hình phát âm chính xác mô tả ảnh thay vì đọc tên file ảnh vô nghĩa.
- **Trạng thái:** Sẵn sàng kiểm thử.

### TC-A11Y-03.2: Aria-label cho các Nút bấm biểu tượng (Icon Buttons Accessible Labels)
- **Mục tiêu:** Mô tả công dụng của các nút bấm dạng icon không chứa văn bản.
- **Các bước thực hiện:**
  1. Mở trang đọc truyện Reader Mode (S07).
  2. Tìm các nút chỉ chứa biểu tượng (Nút hình bánh răng cài đặt, nút hình danh sách mục lục).
  3. Kiểm tra mã nguồn HTML và cho trình đọc màn hình focus vào các nút này.
- **Kết quả mong đợi:**
  - Thẻ `<button>` chứa icon phải có thuộc tính `aria-label` mô tả chức năng rõ ràng (Ví dụ: `<button aria-label="Mở bảng cài đặt kích thước và màu nền đọc"><svg>...</svg></button>`).
  - Trình đọc phát âm chính xác vai trò của nút để người khiếm thị lựa chọn.
- **Trạng thái:** Sẵn sàng kiểm thử.

### TC-A11Y-03.3: Tương thích Form Xác thực (Form Control Labels) - Màn hình S02
- **Mục tiêu:** Trình đọc màn hình hỗ trợ người dùng nhập liệu đăng nhập/đăng ký chính xác.
- **Các bước thực hiện:**
  1. Truy cập trang Đăng nhập / Đăng ký (S02).
  2. Focus vào ô nhập Email và ô nhập Mật khẩu.
- **Kết quả mong đợi:**
  - Các thẻ `<input>` phải được liên kết chặt chẽ với thẻ `<label>` bằng cặp khóa tương ứng `id` và `htmlFor` (trong React/Next.js) hoặc có `aria-labelledby`.
  - Trình đọc phát âm đúng chỉ dẫn nhập liệu (Ví dụ: *"Ô nhập liệu: Địa chỉ Email đăng nhập"*).
- **Trạng thái:** Sẵn sàng kiểm thử.
