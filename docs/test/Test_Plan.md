# Master Test Plan (Kế hoạch Kiểm thử Tổng thể - Giao diện Frontend)
*Dự án: **YAG - WRITING NOVELS WEB***

Tài liệu này đặc tả kế hoạch kiểm thử giao diện Frontend (Next.js) nhằm bảo đảm toàn bộ hệ thống tuân thủ các quy tắc thiết kế Web hiện đại, trải nghiệm người dùng (UX) tối ưu và khả năng tiếp cận (Accessibility).

---

## 1. Mục tiêu Kiểm thử (Objectives)
- Đảm bảo tính nhất quán (Consistency) về giao diện theo hệ thống Design System đã thiết kế.
- Xác định và phòng ngừa lỗi (Error Prevention) trước khi phát hành tính năng.
- Bảo đảm khả năng tiếp cận (Accessibility - A11y) theo tiêu chuẩn quốc tế W3C WCAG 2.1 cấp độ AA.
- Tối ưu hóa trải nghiệm tương tác của độc giả (đọc truyện mượt mà, đổi giao diện dễ dàng) và tác giả (soạn thảo nhanh, trợ lý AI hữu dụng).

## 2. Phạm vi Kiểm thử (Scope)
Kiểm thử tập trung 100% vào phân hệ **Frontend (Next.js SPA)** kết nối qua APIs tới Backend, cụ thể trên các màn hình cốt lõi:
- **S02 (Đăng nhập / Đăng ký):** Luồng xác thực, kiểm tra lỗi form nhập liệu.
- **S05 (Khám phá & Tìm kiếm):** Tab tìm kiếm thông thường và tìm kiếm ngữ nghĩa bằng AI, bộ lọc sidebar.
- **S06 (Trang chi tiết truyện):** Hiển thị metadata tác phẩm, chuyển đổi tab mục lục và bình luận.
- **S07 (Reader Mode):** Giao diện đọc truyện, tùy biến cỡ chữ/nền, thanh tiến độ cuộn trang, cơ chế chống copy truyện.
- **S09 & S10 (Membership & Payment):** So sánh gói, thanh toán bảo mật VNPAY và kết quả giao dịch.
- **S16 & S17 (Author Studio & Publish):** Trình soạn thảo Markdown, lưu nháp tự động thời gian thực, trợ lý AI gợi ý tình tiết, và nộp chương xuất bản ngầm.

## 3. Chiến lược Kiểm thử (Testing Strategy)
Hệ thống sẽ được kiểm thử qua hai phương pháp chính:

### A. Kiểm thử Trải nghiệm & Khả năng sử dụng (Usability Heuristic Testing)
- Áp dụng **10 Nguyên lý thiết kế tương tác của Jakob Nielsen**.
- Đánh giá độ thân thiện, khả năng phục hồi lỗi của người dùng, tính kiểm soát và sự linh hoạt.
- Thực hiện kiểm thử thủ công (Manual Walkthrough) dựa trên kịch bản chi tiết tại [UX_Usability_Tests.md](file:///d:/SE/PROJECT/SE_Writing_Web/docs/test/UX_Usability_Tests.md).

### B. Kiểm thử Khả năng tiếp cận (Accessibility Testing)
- Áp dụng **Tiêu chuẩn W3C WCAG 2.1 (Web Content Accessibility Guidelines)** cấp độ AA.
- Đánh giá tính tương thích bàn phím, độ tương phản và khả năng hỗ trợ trình đọc màn hình cho người khiếm thị.
- Quy trình kiểm thử kết hợp:
  - **Kiểm thử tự động:** Sử dụng thư viện `@axe-core/react` trong quá trình code và chạy công cụ **Google Lighthouse Audit** (Mục tiêu điểm số Accessibility >= 90/100).
  - **Kiểm thử thủ công:** Sử dụng phím `Tab` điều hướng bàn phím thuần túy và chạy thử trình đọc màn hình Screen Reader (Windows Narrator / NVDA).
  - Kịch bản chi tiết tại [Accessibility_A11y_Tests.md](file:///d:/SE/PROJECT/SE_Writing_Web/docs/test/Accessibility_A11y_Tests.md).

## 4. Môi trường & Công cụ (Testing Environment & Tools)
- **Thiết bị thử nghiệm:** Máy tính cá nhân (Windows/macOS), Thiết bị di động (iOS/Android).
- **Trình duyệt:** Google Chrome, Microsoft Edge, Safari, Mozilla Firefox (các phiên bản hiện đại nhất hỗ trợ HTML5 & WebSockets).
- **Công cụ kiểm thử:**
  - *Google Lighthouse:* Đo lường hiệu năng, SEO, Best Practices và Accessibility.
  - *Axe-core DevTools:* Phát hiện lỗi cấu trúc HTML/ARIA.
  - *NVDA / Windows Narrator:* Trình đọc màn hình giả lập cho người khiếm thị.
  - *Playwright E2E:* Gi giả lập tương tác chuột/bàn phím tự động.

## 5. Tiêu chí Đánh giá Đạt/Lỗi (Pass/Fail Criteria)
- **Đạt (Pass):** Toàn bộ các bước kiểm thử được thực hiện thành công, giao diện hiển thị đúng thiết kế, phản hồi trong ngưỡng cho phép và không vi phạm quy tắc WCAG AA.
- **Lỗi (Fail):** Xảy ra lỗi logic, giao diện bị vỡ, thông tin trạng thái hiển thị sai lệch, không điều hướng được bằng bàn phím hoặc tỷ lệ tương phản chữ/nền thấp hơn 4.5:1.
