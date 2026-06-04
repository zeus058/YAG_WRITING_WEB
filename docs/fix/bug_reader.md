# Reader Flow Production Upgrade Plan

## Mục tiêu

Nâng cấp toàn bộ reader flow của YAG từ mức chạy được ở local lên mức sẵn sàng triển khai thực tế trên Internet. Trọng tâm là giao diện rõ ràng, thông tin chính xác, không dư thừa, mọi nút đều có chức năng, trải nghiệm đọc thuận tiện, thiết kế đáp ứng chuẩn quốc tế và đủ trạng thái cho dữ liệu thật.

## Nguyên tắc thiết kế bắt buộc

- Mọi màn hình phải có mục tiêu rõ ràng, không hiển thị thông tin kỹ thuật như `pgvector`, mock/debug text hoặc nội dung lặp.
- Mọi button/link phải có một trong ba hành vi rõ ràng: điều hướng, mở panel/modal, hoặc thực hiện action có feedback.
- Không để dead click, `href="#"`, button không handler, tab không đổi state, hoặc form submit không phản hồi.
- Tất cả form phải có validation, loading state, success state, error state và chống double-submit.
- Thiết kế responsive chính xác cho tối thiểu: 360px, 390px, 768px, 1024px, 1440px.
- Đáp ứng WCAG 2.2 AA: đủ contrast, keyboard navigation, focus visible, label/aria đầy đủ, không phụ thuộc màu để truyền tải trạng thái.
- Nội dung tiếng Việt phải tự nhiên, nhất quán giọng YAG, không dùng thuật ngữ nội bộ/backend với người dùng cuối.
- Reader và Author là cùng một tài khoản người dùng thường; đăng nhập mặc định vào reader mode, author chỉ là chế độ chuyển đổi.
- Admin là role riêng và không lẫn vào reader flow.

## Phạm vi chính

- `src/frontend/src/app/auth/page.tsx`
- `src/frontend/src/app/auth/recovery/page.tsx`
- `src/frontend/src/components/layout/AppShell.tsx`
- `src/frontend/src/components/features/reader/ReaderScreens.tsx`
- `src/frontend/src/components/runtime/ClientInteractions.tsx`
- `src/frontend/src/components/ui/*`
- `src/frontend/src/lib/api.ts`
- `src/frontend/src/lib/auth-context.tsx`
- `src/frontend/src/data/yag.ts`
- `src/frontend/src/app/prototype.css`
- `src/frontend/src/app/globals.css`
- `src/backend/app/api/v1/endpoints/stories.py`
- `src/backend/app/api/v1/endpoints/payment.py`
- `src/backend/app/api/v1/endpoints/notifications.py`
- `src/backend/app/services/payment_service.py`

## 1. App Shell, Navigation và Account Menu

### Cần nâng cấp

- Sidebar/topbar phải là hệ thống điều hướng production, không chỉ là prototype navigation.
- Tất cả nav item phải trỏ tới route thật.
- Account menu phải có thông tin người dùng và action đầy đủ.
- Topbar status chip phải có chức năng hoặc không render như button.

### Hướng điều chỉnh

- Chuẩn hóa route trong `src/frontend/src/data/yag.ts`:
  - Trang chủ đọc: `/home`
  - Khám phá: `/discover`
  - Thư viện: `/library`
  - Diễn đàn: `/forum`
  - Membership: `/membership`
  - Thông báo: `/notifications`
  - Hồ sơ: `/profile/me`
  - Cài đặt: `/settings`
- Loại bỏ route legacy khỏi UI chính: `/dashboard`, `/account-settings`, `/story-detail`, `/reader-mode`.
- Sidebar reader chỉ giữ các mục có ích cho reader:
  - Trang chủ
  - Khám phá
  - Thư viện
  - Diễn đàn
  - Membership
  - Thông báo
  - Hồ sơ
  - Cài đặt
- Topbar:
  - `Gói Free/Premium` là link tới `/membership`.
  - `Truyện đang đọc` là link tới `/library`.
  - Notification icon hiển thị unread count, click tới `/notifications`.
- Account dropdown:
  - Hiển thị avatar, display name, email hoặc username.
  - Menu item: `Hồ sơ`, `Cài đặt`, `Chuyển sang Author`, `Đăng xuất`.
  - Đóng menu khi click ngoài, bấm Escape hoặc chọn item.
  - Logout phải clear auth token, reset context, redirect `/auth`.

### Acceptance criteria

- Không còn link chết trong sidebar/topbar.
- Keyboard có thể mở account menu bằng Enter/Space và đóng bằng Escape.
- Mobile sidebar mở/đóng ổn định, không che nội dung chính ngoài ý muốn.
- User thường không thấy admin navigation.

## 2. Auth Flow

### Cần nâng cấp

- Trang login/register phải giống màn hình production thật: rõ ràng, ít nhiễu, dễ nhập, lỗi dễ hiểu.
- Đăng nhập/đăng ký phải đưa user thường về reader flow.
- Recovery password cần không để lộ tài khoản có tồn tại hay không.

### Hướng điều chỉnh

- Login/register:
  - Hai tab chiếm toàn bộ chiều ngang và chia 50/50.
  - Submit button nổi bật, có loading, disabled khi đang xử lý.
  - Form field có label rõ, placeholder ngắn, helper text chỉ khi thật sự cần.
  - Error message tiếng Việt thân thiện, không lộ raw backend error.
  - Remember me phải hoạt động đúng với local/session storage policy hiện tại.
  - Dòng điều khoản nhỏ, gọn, có link tới `/terms` và `/privacy`.
- Security:
  - Không auto-fill mock credentials trên production.
  - Không log password hoặc token.
  - Sau 401 token expired, tự logout và đưa về `/auth?redirect=...`.
- Recovery:
  - Request OTP luôn hiển thị thông báo trung lập.
  - Confirm OTP có password rules, confirm password, loading/error/success.

### Acceptance criteria

- User đăng ký thành công vào `/home`.
- User đăng nhập thành công vào `/home`.
- Admin đăng nhập vào `/admin`.
- Form không bị layout shift mạnh khi lỗi xuất hiện.
- Không có text kỹ thuật hoặc debug trên UI.

## 3. Home Feed

### Cần nâng cấp

- Home phải là trang bắt đầu đọc, không phải landing page phụ.
- Thông tin truyện phải chính xác, có trạng thái loading/empty/error.
- CTA phải đưa user đến hành động đọc hoặc khám phá tiếp.

### Hướng điều chỉnh

- Hero story:
  - Hiển thị title, author, category, rating, view count, chapter count, trạng thái.
  - CTA `Đọc tiếp` nếu có reading history, ngược lại `Đọc từ đầu`.
  - Cover phải có fallback đẹp nếu thiếu ảnh.
- Khu `Đọc tiếp`:
  - Lấy từ reading history hoặc library.
  - Nếu chưa có lịch sử, hiển thị empty state và CTA `/discover`.
- Khu `Dành cho bạn`:
  - Hiển thị lý do đề xuất ngắn gọn: thể loại, lịch sử đọc, truyện mới cập nhật.
  - Không nói quá về AI nếu backend chưa có personalization thật.
- Khu `Mới cập nhật`:
  - Sort theo updated/published time thật.
  - Mỗi row có title, author, latest chapter, update time.
- Khu ranking:
  - Ghi rõ tiêu chí: lượt đọc hôm nay/tuần nếu backend hỗ trợ.
  - Nếu chưa có backend metric thật, dùng label trung tính `Nổi bật`.

### Acceptance criteria

- Home không hiển thị dữ liệu undefined/null.
- Mọi story card click được tới `/stories/{id}`.
- Empty state có CTA rõ.
- Loading skeleton không làm trang nhảy layout.

## 4. Discover và Search

### Cần nâng cấp

- Search/filter phải chính xác theo ý nghĩa từng dropdown.
- Không hiển thị thuật ngữ kỹ thuật cho người dùng cuối.
- Kết quả phải có trạng thái và feedback rõ ràng.

### Hướng điều chỉnh

- Search bar:
  - Một hàng desktop gồm input, mode `Từ khóa`/`AI`, button `Tìm truyện`.
  - Mobile xếp dọc nhưng thứ tự vẫn hợp lý.
  - Text mode chỉ là `AI`, không dùng `AI ngữ nghĩa (pgvector)`.
- Filters:
  - Thể loại: danh sách category thật từ seed/backend hoặc fallback data.
  - Trạng thái: `Đang cập nhật`, `Hoàn thành`, `Tạm dừng`.
  - Số chương: `0-50`, `50-100`, `100-200`, `200+`.
  - Loại chương: `Tất cả`, `Miễn phí`, `Có Premium`.
  - Sắp xếp: `Phù hợp nhất`, `Mới cập nhật`, `Lượt đọc cao`, `Đánh giá cao`, `Nhiều chương`.
- Backend/API:
  - Nếu API chưa hỗ trợ, mở rộng `GET /api/v1/stories/` với query params:
    - `q`
    - `category`
    - `status`
    - `min_chapters`
    - `max_chapters`
    - `premium`
    - `sort`
  - Semantic search fallback sang keyword search nếu AI/search service lỗi.
- Result card:
  - Title, cover, author, category, status, rating, view count, chapter count.
  - Không hiển thị field trống.
  - Badge premium chỉ hiện khi thật sự có premium chapters.

### Acceptance criteria

- Filter thay đổi kết quả thật hoặc local fallback nhất quán.
- Search không trả success giả khi API lỗi.
- Empty state hướng dẫn sửa truy vấn, không đổ lỗi hệ thống.
- Không còn thông tin dư thừa phía trên search.

## 5. Story Detail

### Cần nâng cấp

- Trang chi tiết truyện phải đủ thông tin để user quyết định đọc.
- Review/comment/chapter list phải có action hoạt động.

### Hướng điều chỉnh

- Header:
  - Cover, title, author, category, status, rating, rating count, view count, chapter count.
  - CTA: `Đọc từ đầu`, `Đọc tiếp`, `Lưu thư viện`.
- Metadata:
  - Trạng thái mapping rõ:
    - `ongoing` -> `Đang cập nhật`
    - `completed` -> `Hoàn thành`
    - `paused` -> `Tạm dừng`
  - Rating format 1 chữ số thập phân.
  - View count format `1.2K`, `3.4M`.
- Chapter list:
  - Có search/filter chương nếu danh sách dài.
  - Premium chapter có lock badge.
  - Chapter pending/rejected không hiển thị cho reader.
- Reviews:
  - User chỉ review khi đã đăng nhập.
  - Submit review có validation 1-5 sao.
  - Nếu user đã review, hiển thị trạng thái cập nhật review hoặc thông báo duplicate.
- Bookmark:
  - Button toggle có optimistic update và rollback nếu API lỗi.

### Acceptance criteria

- Không có chapter chưa duyệt xuất hiện với reader.
- Bookmark/review/chapter links hoạt động.
- Thiếu cover/author/rating vẫn render đẹp.

## 6. Reader Mode

### Cần nâng cấp

- Đây là màn hình cốt lõi, cần ưu tiên trải nghiệm đọc dài.
- Phải hỗ trợ premium paywall, navigation chương và tùy chỉnh đọc.

### Hướng điều chỉnh

- Layout:
  - Ẩn AppShell/nav chính nếu cần tập trung đọc.
  - Header gọn: quay lại truyện, title, chapter, progress.
  - Nội dung có max width hợp lý, line-height dễ đọc.
- Controls:
  - Font size tăng/giảm.
  - Theme sáng/tối.
  - Width thường/rộng.
  - Previous/Next chapter.
  - Mục lục chương.
  - Lưu cấu hình vào `localStorage`.
- Paywall:
  - Premium chapter + user chưa premium -> hiển thị paywall rõ.
  - CTA tới `/membership`.
  - Không tải hoặc render content premium nếu backend trả 403.
- Comments:
  - Form bình luận có validation.
  - List comment có loading/empty/error.
  - Reply nếu backend hỗ trợ; nếu chưa hỗ trợ thì không hiển thị nút reply chết.

### Acceptance criteria

- Reader preferences giữ nguyên sau reload.
- Previous/Next không dẫn đến chapter không tồn tại.
- Premium paywall rõ và không leak content.
- Chapter content tải dưới 0.5 giây với cache/local data hợp lý.

## 7. Library

### Cần nâng cấp

- Library phải là nơi quản lý truyện đang theo dõi và đọc tiếp.
- Không chỉ là grid tĩnh.

### Hướng điều chỉnh

- Tabs:
  - `Đang theo dõi`
  - `Đọc tiếp`
  - `Đã hoàn thành`
  - `Premium`
- Actions:
  - Remove bookmark.
  - Continue reading.
  - Sort by recently read/recently updated/title.
- Empty states:
  - Chưa lưu truyện -> CTA `/discover`.
  - Chưa có lịch sử đọc -> CTA `/home`.
- Data:
  - Lấy từ `/api/v1/stories/library/me` và reading history nếu backend có.
  - Không hiển thị card thiếu id.

### Acceptance criteria

- User có thể tiếp tục đọc từ library.
- Remove bookmark cập nhật UI.
- Empty state không trống trắng.

## 8. Forum

### Cần nâng cấp

- Forum phải giống một social discussion feed có thể dùng được, lấy cảm hứng từ Threads nhưng vẫn giữ visual style YAG.
- Mọi nút phải có phản hồi rõ.

### Hướng điều chỉnh

- Layout:
  - Feed trung tâm.
  - Composer ở đầu.
  - Sidebar phụ: chủ đề nổi bật, truyện đang thảo luận, quy tắc cộng đồng.
- Post card:
  - Avatar, username, display name, time.
  - Nội dung text.
  - Optional linked story/tag.
  - Action row: like, reply, repost/share, bookmark, more.
- Local behavior nếu chưa có backend:
  - Composer thêm post mới vào đầu feed.
  - Like toggle tăng/giảm count.
  - Reply mở input inline và thêm reply.
  - Share copy link hoặc hiện toast.
  - More menu có `Báo cáo`, `Ẩn bài viết`.
- Backend readiness:
  - Thiết kế API contract sau:
    - `GET /api/v1/forum/posts`
    - `POST /api/v1/forum/posts`
    - `POST /api/v1/forum/posts/{id}/like`
    - `POST /api/v1/forum/posts/{id}/reply`
    - `POST /api/v1/forum/posts/{id}/report`

### Acceptance criteria

- Không có tab/button chết.
- Feed gọn, dễ scan, không rối.
- Composer hoạt động ở local.
- UI không copy màu tối của Threads; chỉ dùng cấu trúc UX, giữ palette YAG.

## 9. Membership

### Cần nâng cấp

- Membership phải đủ tin cậy cho thanh toán thật: rõ quyền lợi, giá, trạng thái gói, checkout, success/failure.

### Hướng điều chỉnh

- Plans:
  - Hiển thị tên gói, giá VND, thời hạn, quyền lợi, badge khuyến nghị nếu có.
  - Nếu user đang premium, hiển thị hạn `premium_until`.
  - Nếu plan đang active, button thành `Đang sử dụng` hoặc `Gia hạn`.
- Checkout:
  - Button gọi `yagApi.billing.createVnpayCheckout`.
  - Có loading theo từng plan.
  - Redirect sang VNPAY sandbox/production URL backend trả về.
  - Nếu lỗi, hiển thị message thân thiện.
- Local test:
  - Chỉ trong dev/mock hiển thị `Mô phỏng thành công` và `Mô phỏng thất bại`.
  - Production tuyệt đối không hiện nút mô phỏng.

### Acceptance criteria

- Không còn link trực tiếp giả sang result như checkout thật.
- Người test có thể test success/failure local.
- User biết rõ đang mua gói gì, giá bao nhiêu, quyền lợi gì.

## 10. Payment Result

### Cần nâng cấp

- Payment result phải đáng tin cậy, không mặc định thành công khi thiếu dữ liệu.
- Phải xử lý success, failed, cancelled, pending.

### Hướng điều chỉnh

- Trạng thái:
  - `success`: giao dịch thành công, gói được kích hoạt.
  - `failed`: giao dịch không thành công.
  - `cancelled`: user hủy thanh toán.
  - `pending`: đang chờ IPN/backend xác nhận.
- Logic:
  - Nếu có `vnp_TxnRef`, gọi backend transaction status.
  - Nếu backend pending, poll có giới hạn hoặc nút kiểm tra lại.
  - Nếu `vnp_ResponseCode !== "00"`, hiển thị failed/cancelled tùy mã.
  - Nếu không có transaction ref và không phải mock/dev, không hiển thị success.
- UI:
  - Success: mã giao dịch, plan, amount, premium_until, CTA đọc tiếp.
  - Failed: lý do tổng quát, CTA thử lại, liên hệ hỗ trợ.
  - Pending: giải thích ngắn, nút refresh.

### Acceptance criteria

- `/payment/result?status=success` trong dev hiển thị success mock.
- `/payment/result?status=failed` trong dev hiển thị failed mock.
- Production ưu tiên trạng thái backend/IPN.
- Không có success giả khi thiếu ref thật.

## 11. Profile

### Cần nâng cấp

- Profile phải hiển thị đúng danh tính người dùng, thư viện/tác phẩm công khai nếu có.

### Hướng điều chỉnh

- `/profile/me`:
  - Avatar, display name, username, bio, role mode hiện tại.
  - Stats reader: truyện đã lưu, chương đã đọc, review đã viết.
  - CTA: chỉnh sửa hồ sơ, xem thư viện.
- `/profile/[id]`:
  - Public profile không lộ email.
  - Nếu là tác giả, hiển thị tác phẩm công khai.
- Fallback:
  - Nếu chưa có bio/avatar, hiển thị placeholder tinh tế.

### Acceptance criteria

- Không lộ email trên public profile.
- Hồ sơ chính chủ có link settings.
- Profile không lỗi khi thiếu profile record.

## 12. Settings

### Cần nâng cấp

- Settings phải là trung tâm quản lý tài khoản thật, không chỉ có form hồ sơ.

### Hướng điều chỉnh

- Sections:
  - Hồ sơ cá nhân.
  - Mật khẩu & bảo mật.
  - Tùy chọn đọc.
  - Thông báo.
  - Membership & thanh toán.
- Hồ sơ:
  - Display name, bio, avatar URL/upload placeholder.
  - Email readonly.
- Mật khẩu & bảo mật:
  - Current password, new password, confirm password.
  - Password rules.
  - Session/logout all devices placeholder nếu backend chưa có.
  - Không hiển thị form đổi mật khẩu như đã hoạt động nếu API chưa có.
- Tùy chọn đọc:
  - Font size, theme, reader width, line height.
  - Lưu vào localStorage và Reader Mode đọc lại.
  - Preview đoạn văn.
- Thông báo:
  - Toggle: chương mới, trả lời bình luận, membership/payment, thông báo hệ thống.
  - Nếu chưa có backend preference API, lưu localStorage và ghi TODO backend.
- Membership & thanh toán:
  - Gói hiện tại.
  - Hạn premium.
  - Link tới `/membership`.
  - Lịch sử giao dịch nếu API có.

### Acceptance criteria

- Click từng section có nội dung tương ứng.
- Không có section rỗng hoặc nút chết.
- Tùy chọn đọc ảnh hưởng Reader Mode.
- Settings hoạt động tốt trên mobile.

## 13. Notifications

### Cần nâng cấp

- Notification center phải giúp user xử lý thông báo nhanh, không chỉ list tĩnh.

### Hướng điều chỉnh

- Categories:
  - Tất cả.
  - Chương mới.
  - Bình luận.
  - Membership.
  - Hệ thống.
- Actions:
  - Mark as read.
  - Mark all as read.
  - Click notification điều hướng đúng context.
- States:
  - Loading.
  - Empty.
  - Error with retry.
- Realtime:
  - Nếu WebSocket hoạt động, unread count cập nhật tức thời.
  - Nếu WebSocket lỗi, fallback polling nhẹ.

### Acceptance criteria

- Unread count đồng bộ với list.
- Click notification đưa tới trang/chương/truyện liên quan nếu có target.
- Empty state có thông điệp rõ.

## 14. UI Components và Visual Quality

### Cần nâng cấp

- Component phải nhất quán để web trông như sản phẩm thật, không như nhiều prototype ghép lại.

### Hướng điều chỉnh

- Chuẩn hóa:
  - Button variants: primary, secondary, ghost, danger, icon.
  - Badge variants: status, premium, success, warning, error.
  - Card layout: story card, list row, empty state, error guide.
  - Form controls: input, select, textarea, toggle, segmented control.
- Text:
  - Không dùng heading quá lớn trong panel nhỏ.
  - Không để text trong button tràn.
  - Không dùng negative letter spacing.
- Images:
  - Cover fallback nhất quán.
  - Avatar fallback dùng initials.
  - Image có alt text hữu ích.
- Motion:
  - Animation nhẹ, không cản thao tác.
  - Tôn trọng `prefers-reduced-motion`.

### Acceptance criteria

- Các page reader dùng chung hệ component.
- Không có card lồng card rối mắt.
- Text không overlap ở desktop/mobile.

## 15. Accessibility và International Web Standards

### Checklist bắt buộc

- Mỗi input có label liên kết bằng `htmlFor`.
- Form error dùng `aria-invalid` và `aria-describedby`.
- Icon-only button có `aria-label`.
- Dropdown/menu có keyboard interaction.
- Modal/panel nếu có phải trap focus hoặc có close rõ.
- Màu chữ và nền đạt contrast AA.
- Focus ring nhìn thấy rõ.
- Không có heading order nhảy vô lý.
- Landmark hợp lý: header, nav, main, aside nếu phù hợp.
- Ảnh có `alt`.
- Không dùng button cho link điều hướng nếu không cần, không dùng link cho action submit.

## 16. Performance và Reliability

### Cần nâng cấp

- Reader flow phải tải nhanh, không bị blank page khi API lỗi.

### Hướng điều chỉnh

- Dùng loading skeleton có kích thước ổn định.
- Mọi API call có timeout và error handling.
- Không fetch lặp vô hạn.
- Không render danh sách lớn không giới hạn.
- Dùng pagination hoặc limit cho discover/forum/notifications.
- Ảnh cover/avatar dùng kích thước hợp lý.
- Không để console error cho lỗi đã handle ở production.

### Acceptance criteria

- Không có trang reader blank khi backend lỗi.
- User luôn thấy retry hoặc fallback.
- Build production không có warning nghiêm trọng.

## 17. Backend/API Alignment

### Cần nâng cấp

- Frontend không được giả định field không tồn tại.
- Backend response nên đủ cho UI production.

### API cần kiểm tra/mở rộng

- Stories list:
  - `category`, `status`, `q`, `sort`, chapter range, premium filter.
- Story detail:
  - `author`, `chapter_count`, `rating_count`, `latest_chapter`, `is_bookmarked`.
- Library:
  - Reading progress, latest chapter, bookmarked_at.
- Reviews:
  - Duplicate review behavior rõ ràng.
- Membership:
  - Current membership status.
  - Transaction history.
- Payment:
  - Transaction status theo `vnp_txn_ref`.
  - Verify result nếu cần.
- Notifications:
  - target URL/type để click điều hướng.

### Acceptance criteria

- UI không cần hardcode nhiều field giả khi backend có data.
- Missing optional fields không làm crash frontend.

## 18. Manual Test Checklist Sau Khi Nâng Cấp

| ID | Area | Test case | Kỳ vọng |
|---|---|---|---|
| RD-PROD-01 | Auth | Register user thường | Vào `/home`, role reader |
| RD-PROD-02 | Auth | Login user thường | Vào `/home`, không vào author/admin |
| RD-PROD-03 | Shell | Click toàn bộ sidebar | Route đúng, không dead link |
| RD-PROD-04 | Shell | Account dropdown keyboard | Mở/đóng/chọn item bằng keyboard |
| RD-PROD-05 | Home | API lỗi | Có error state và retry/fallback |
| RD-PROD-06 | Home | Chưa có reading history | Empty state có CTA discover |
| RD-PROD-07 | Discover | Search keyword | Kết quả đúng, có loading/error |
| RD-PROD-08 | Discover | Search AI lỗi | Fallback hoặc thông báo rõ |
| RD-PROD-09 | Discover | Filter từng dropdown | Option đúng, kết quả thay đổi |
| RD-PROD-10 | Story detail | Bookmark | Toggle và cập nhật UI |
| RD-PROD-11 | Story detail | Submit review | Validate và refresh review |
| RD-PROD-12 | Reader | Đổi font/theme/width | Lưu sau reload |
| RD-PROD-13 | Reader | Chương premium chưa mua | Hiện paywall, không leak content |
| RD-PROD-14 | Library | Remove bookmark | Card biến mất/cập nhật |
| RD-PROD-15 | Forum | Tạo post local | Post mới ở đầu feed |
| RD-PROD-16 | Forum | Like/reply/share/more | Mỗi action có feedback |
| RD-PROD-17 | Membership | Checkout thật | Tạo transaction và redirect VNPAY |
| RD-PROD-18 | Payment | Success mock/dev | Hiện success đúng |
| RD-PROD-19 | Payment | Failed mock/dev | Hiện failed đúng |
| RD-PROD-20 | Payment | Pending backend | Hiện pending và retry |
| RD-PROD-21 | Profile | Public profile | Không lộ email |
| RD-PROD-22 | Settings | Đổi tùy chọn đọc | Reader mode áp dụng |
| RD-PROD-23 | Notifications | Mark all read | Unread count về 0 |
| RD-PROD-24 | Responsive | 360/390/768/1024/1440 | Không overlap/tràn text |
| RD-PROD-25 | Accessibility | Tab navigation | Không kẹt focus, focus visible |

## 19. Technical Verification

- Frontend:
  - `cd src/frontend`
  - `npm run lint`
  - `npm run build`
- Backend:
  - `cd src/backend`
  - `pytest`
- Browser smoke test:
  - `/auth`
  - `/home`
  - `/discover`
  - `/stories/{id}`
  - `/stories/{id}/chapters/{num}`
  - `/library`
  - `/forum`
  - `/membership`
  - `/payment/result?status=success&plan=MONTHLY&txnRef=MOCK_SUCCESS`
  - `/payment/result?status=failed&plan=MONTHLY&txnRef=MOCK_FAILED`
  - `/profile/me`
  - `/settings`
  - `/notifications`
- Accessibility:
  - Keyboard-only walkthrough.
  - Contrast check.
  - Screen reader labels spot check.
- Responsive:
  - Playwright screenshots at 360, 390, 768, 1024, 1440 widths.

## 20. Ưu tiên triển khai

| Priority | Hạng mục | Lý do |
|---|---|---|
| P0 | Shell navigation/account/payment result | Chặn trải nghiệm cơ bản và kiểm thử production |
| P0 | Reader mode/paywall | Luồng đọc là lõi sản phẩm |
| P1 | Discover/search/filter | Luồng tìm truyện là lõi reader |
| P1 | Story detail/review/bookmark | Quyết định đọc và giữ chân user |
| P1 | Settings/preferences | Cá nhân hóa trải nghiệm đọc |
| P2 | Forum | Tăng engagement, có thể local mock trước backend |
| P2 | Notifications | Quan trọng cho retention nhưng không chặn đọc |
| P2 | Visual polish/accessibility pass | Hoàn thiện trước deployment public |

## 21. Definition of Done

- Không còn dead button/link trong reader flow.
- Không còn text dư thừa, debug text hoặc thuật ngữ kỹ thuật nội bộ.
- Mỗi page có loading, empty, error và success state phù hợp.
- UI responsive tốt trên mobile/tablet/desktop.
- Accessibility đạt mức tối thiểu WCAG 2.2 AA cho navigation/form/action chính.
- Payment có thể test success/failure ở local và dùng backend transaction thật ở production.
- Reader mode không leak premium content.
- Build frontend và test backend pass trước khi deploy.
