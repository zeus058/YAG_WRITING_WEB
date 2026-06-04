# Reader Flow Manual Test Bug Plan

## Mục tiêu

Điều chỉnh các lỗi được phát hiện khi test thủ công luồng độc giả để website YAG chạy hoàn thiện ở local trước khi deployment thực tế. Phạm vi gồm login/register, sidebar, topbar, discover, forum, membership/payment result và profile settings.

## Phạm vi file cần chỉnh

- `src/frontend/src/app/auth/page.tsx`
- `src/frontend/src/app/auth/recovery/page.tsx`
- `src/frontend/src/components/layout/AppShell.tsx`
- `src/frontend/src/components/features/reader/ReaderScreens.tsx`
- `src/frontend/src/components/runtime/ClientInteractions.tsx`
- `src/frontend/src/lib/api.ts`
- `src/frontend/src/data/yag.ts`
- `src/frontend/src/app/prototype.css`
- `src/frontend/src/app/globals.css`
- `src/backend/app/api/v1/endpoints/payment.py`
- `src/backend/app/services/payment_service.py`

## 1. Trang đăng nhập / đăng ký

### Bug

- Dòng "Tôi đồng ý điều khoản nội dung và chính sách bảo mật YAG" đang quá lớn và dễ xuống dòng.
- Hai tab/button "Đăng nhập" và "Đăng ký" chưa chiếm hết chiều ngang khung, tạo cảm giác lệch bố cục.
- Một số chi tiết form còn chưa tối ưu cho giao diện production: spacing, trạng thái focus, lỗi validation, vùng click, responsive mobile.

### Hướng sửa

- Cập nhật phần tab trong `src/frontend/src/app/auth/page.tsx`:
  - Bọc tab bằng class riêng, ví dụ `auth-tabs`.
  - Hai button dùng `flex: 1 1 0`, `width: 50%`, căn giữa nội dung.
  - Trạng thái active phải rõ ràng, đồng nhất với màu crimson/jungle hiện tại.
- Cập nhật label điều khoản:
  - Không dùng class `pill` chung nếu class này làm label quá lớn.
  - Tạo class riêng `auth-terms-row`.
  - Font size khoảng `12px - 13px`.
  - Dùng `white-space: nowrap` ở desktop.
  - Ở mobile nhỏ hơn 420px cho phép wrap tự nhiên để không tràn khung.
- Tối ưu form:
  - Login: giữ email/username, password, remember me, forgot password, submit.
  - Register: email, username, password, confirm password, terms.
  - Error line không làm layout nhảy mạnh.
  - Submit button full width trong register.
  - Login action row phải responsive: mobile xếp dọc, desktop giữ gọn.
- Cập nhật CSS trong `src/frontend/src/app/prototype.css`:
  - `.auth-tabs`
  - `.auth-tabs .tab-button`
  - `.auth-terms-row`
  - `.auth-action-row`

### Acceptance criteria

- Hai nút "Đăng nhập" và "Đăng ký" chia đều 50/50 toàn khung tab.
- Dòng điều khoản nằm trên một dòng ở desktop/laptop thông thường.
- Không có text tràn khỏi khung ở mobile.
- Form vẫn validate đúng và login/register vẫn redirect reader về `/home`, admin về `/admin`.

## 2. Sidebar

### Bug

- Sidebar đang hiển thị khối "Trợ giúp & Hỗ trợ".
- Khối này không cần thiết trong reader flow hiện tại và chiếm chỗ.

### Hướng sửa

- Cập nhật `src/frontend/src/components/layout/AppShell.tsx`:
  - Loại bỏ nội dung:
    - `Trợ giúp & Hỗ trợ`
    - `Gặp sự cố thanh toán hay lỗi chương? Hãy liên hệ với chúng tôi.`
  - Không đặt logout trong khối help nữa.
  - Với reader/author, sidebar footer chỉ nên để tối giản hoặc bỏ hẳn.
  - Admin footer có thể giữ thông tin quản trị nếu vẫn hữu ích.
- Cập nhật CSS `.sidebar-footer` nếu cần để tránh khoảng trống lớn cuối sidebar.

### Acceptance criteria

- Reader/author sidebar không còn hiển thị "Trợ giúp & Hỗ trợ".
- Không còn nút logout nằm trong sidebar footer.
- Sidebar vẫn không bị hở layout ở desktop và mobile.

## 3. Topbar

### Bug

- Nút "Gói" / "Gói Free" / "Gói Premium" không điều hướng tới trang membership.
- Nút "Truyện đang đọc" không điều hướng tới trang đọc tiếp/thư viện.
- Account chip hiện là link đơn sang settings, chưa phải dropdown.

### Hướng sửa

- Cập nhật `topbarContext` trong `src/frontend/src/components/layout/AppShell.tsx`:
  - Trả về object có `href`, không chỉ `icon` và `text`.
  - Reader:
    - `Gói Free` hoặc `Gói Premium` -> `/membership`
    - `Truyện đang đọc` -> `/library`
  - Author/admin context nếu không cần click thì giữ text chip hoặc thêm href phù hợp.
- Render topbar status:
  - Nếu item có `href`, render bằng `Link`.
  - Nếu không có `href`, render bằng `span`.
- Đổi account chip thành dropdown:
  - State: `isAccountMenuOpen`.
  - Button hiển thị avatar, name, role label, icon mũi tên/dropdown.
  - Dropdown gồm:
    - `Hồ sơ` -> `/profile/me` hoặc `/profile`
    - `Cài đặt` -> `/settings`
    - `Đăng xuất` -> gọi `logout()` rồi redirect `/auth`
  - Đóng dropdown khi click ngoài, bấm Escape hoặc chọn item.
- Cập nhật CSS:
  - `.account-menu`
  - `.account-menu-button`
  - `.account-dropdown`
  - `.account-dropdown-item`

### Acceptance criteria

- Click vào chip gói chuyển đến `/membership`.
- Click vào "Truyện đang đọc" chuyển đến `/library`.
- Click account mở dropdown.
- Click "Hồ sơ" vào trang hồ sơ.
- Click "Đăng xuất" xoá token và quay về `/auth`.
- Dropdown không bị che bởi topbar hoặc page content.

## 4. Trang khám phá truyện

### Bug

- Khối "Tìm kiếm thông minh - Kết hợp từ khóa, thể loại, trạng thái và lịch sử đọc gần đây." bị dư thừa.
- Nút "Tìm truyện" đang nằm bên dưới, chưa cùng hàng với input.
- Tab "AI ngữ nghĩa (pgvector)" lộ thuật ngữ kỹ thuật không phù hợp UI người dùng cuối.
- Bộ lọc đang dùng cùng option cho nhiều loại filter, không đúng nghĩa.

### Hướng sửa

- Cập nhật `DiscoverScreen` trong `src/frontend/src/components/features/reader/ReaderScreens.tsx`.
- Layout search mới:
  - Một hàng gồm:
    - Input "Từ khóa / Ý tưởng cốt truyện"
    - Segmented control "Từ khóa" / "AI"
    - Button "Tìm truyện"
  - Loại bỏ hẳn `action-strip` chứa "Tìm kiếm thông minh".
  - Đổi text tab `AI ngữ nghĩa (pgvector)` thành `AI`.
- Thêm state filter rõ ràng:
  - `selectedGenre`
  - `selectedStatus`
  - `selectedChapterRange`
  - `selectedSort`
  - Có thể thêm `selectedPremium` nếu cần.
- Option đề xuất:
  - Thể loại: `Tất cả`, `Ngôn tình`, `Trinh thám`, `Khoa học viễn tưởng`, `Huyền huyễn`, `Kỳ ảo`, `Cổ trang`, `Hiện đại`, `Tâm lý`, `Chữa lành`, `Phiêu lưu`, `Lịch sử`, `Cyberpunk`.
  - Trạng thái: `Tất cả`, `Đang cập nhật`, `Hoàn thành`, `Tạm dừng`.
  - Số chương: `Tất cả`, `0-50`, `50-100`, `100-200`, `200+`.
  - Sắp xếp: `Phù hợp nhất`, `Mới cập nhật`, `Lượt đọc cao`, `Đánh giá cao`, `Nhiều chương`.
- Với mock data:
  - Apply filter trực tiếp trên `stories`.
  - Không chỉ hiển thị cùng một danh sách.
- Với backend thật:
  - Gửi được `category`, `status`, `q`.
  - Chapter range và sort có thể xử lý client-side nếu API chưa hỗ trợ.
  - Nếu cần production hơn, mở rộng backend `GET /api/v1/stories/` để nhận `min_chapters`, `max_chapters`, `sort`.
- Cập nhật empty state:
  - Nhắc user thử đổi từ khóa/thể loại/chế độ AI.
  - Không nhắc pgvector.

### Acceptance criteria

- Search input, mode selector và nút "Tìm truyện" nằm cùng một hàng ở desktop.
- Mobile tự xuống dòng nhưng không vỡ layout.
- Không còn chữ `pgvector` trên UI.
- Không còn khối "Tìm kiếm thông minh".
- Mỗi dropdown có option đúng với ý nghĩa của nó.
- Áp dụng filter làm thay đổi danh sách truyện ở mock/local.

## 5. Trang diễn đàn

### Bug

- Trang forum hiện giống một danh sách đơn giản, chưa hoạt động đúng chức năng diễn đàn.
- Các button tab, tạo chủ đề, reply, format chưa có state/action rõ ràng.
- Bố cục hiện tại rối, chưa giống trải nghiệm social feed.

### Hướng sửa

- Refactor `ForumScreen` trong `src/frontend/src/components/features/reader/ReaderScreens.tsx` theo mô hình tương tự Threads của Meta nhưng giữ style YAG:
  - Feed chính dạng cột giữa.
  - Composer ở đầu feed.
  - Post card gồm avatar, username, thời gian, nội dung, tag/truyện liên quan, optional image/quote.
  - Action row: like, comment/reply, repost/share, bookmark.
  - Reply thread có indentation nhẹ hoặc modal/detail panel.
  - Sidebar phải là "Chủ đề nổi bật" / "Truyện đang thảo luận" / "Quy tắc cộng đồng", không chiếm quá nhiều.
- Thêm state:
  - `activeForumTab`: `forYou | following | story | community`
  - `posts`
  - `composerText`
  - `replyingPostId`
  - `likedPostIds`
  - `bookmarkedPostIds`
- Button cần hoạt động ở local:
  - Tab đổi danh sách hiển thị.
  - "Tạo chủ đề" focus composer hoặc mở composer modal.
  - "Gửi" thêm post mới vào đầu danh sách mock.
  - Like tăng/giảm counter.
  - Reply mở vùng nhập reply và thêm reply.
  - Share/copy link hiển thị toast.
  - More menu hiển thị ít nhất `Báo cáo`, `Ẩn bài viết`.
- Nếu backend chưa có forum API:
  - Giữ local state/mock để test UX.
  - Ghi TODO API contract riêng, không để button chết.
- CSS cần thêm:
  - `.forum-shell`
  - `.forum-feed`
  - `.forum-composer`
  - `.forum-post`
  - `.forum-post-head`
  - `.forum-post-actions`
  - `.forum-reply-box`
  - `.forum-topic-card`

### Acceptance criteria

- Trang forum nhìn như social discussion feed, không còn bố cục hỗn loạn.
- Tab hoạt động.
- Tạo post local hoạt động.
- Like/reply/share/more có phản hồi rõ ràng.
- Không có button chết.
- Vẫn dùng màu crimson, jungle, petal, near-white của YAG.

## 6. Membership và kết quả thanh toán

### Bug

- Trang membership hiện đang link trực tiếp tới `/payment/result?plan=...`, không tạo checkout thật.
- Người test không chủ động kiểm thử được giao dịch thành công/thất bại.
- Cần nếu thất bại thì về giao diện thất bại, nếu thành công thì về giao diện thành công.

### Hướng sửa frontend

- Cập nhật `MembershipScreen`:
  - Nút "Đăng ký ngay" phải là button gọi `yagApi.billing.createVnpayCheckout`.
  - Payload dùng `{ planCode: plan.id, returnUrl: window.location.origin + "/payment/result" }`.
  - Nếu backend trả `paymentUrl`, redirect sang URL đó.
  - Loading state theo từng plan.
  - Error toast nếu không tạo checkout được.
- Thêm chế độ test local rõ ràng khi `appEnv.useMocks` hoặc dev:
  - Button nhỏ `Mô phỏng thành công` -> `/payment/result?status=success&plan=MONTHLY&txnRef=MOCK_SUCCESS`
  - Button nhỏ `Mô phỏng thất bại` -> `/payment/result?status=failed&plan=MONTHLY&txnRef=MOCK_FAILED`
  - Chỉ hiện trong local/dev, không hiện production.
- Cập nhật `PaymentScreen`:
  - Đọc `status=success|failed|cancelled`.
  - Nếu có `vnp_ResponseCode`, map `00` là success, khác `00` là failed.
  - Nếu có `txnRef` thật, ưu tiên trạng thái backend từ `/api/v1/payments/transactions/{vnp_txn_ref}`.
  - Nếu redirect thành công nhưng IPN chưa về, hiển thị pending và nút kiểm tra lại.
  - Nếu thất bại/cancelled, hiển thị failure UI ngay, có nút thử lại.
- Cập nhật `ClientInteractions.tsx`:
  - Đồng bộ logic với component mới.
  - Không để `data-billing-plan` xử lý trùng nếu đã chuyển sang React handler.

### Hướng sửa backend

- Kiểm tra `src/backend/app/api/v1/endpoints/payment.py`:
  - `POST /api/v1/payments/vnpay/checkout` đã tạo transaction và trả `paymentUrl`, `transactionId`.
  - `GET /api/v1/payments/transactions/{vnp_txn_ref}` đã có để frontend poll.
  - `POST /api/v1/payments/vnpay/verify` hiện có nhưng frontend chưa dùng; cân nhắc dùng endpoint này cho redirect result nếu cần verify checksum ngay.
- Kiểm tra `src/backend/app/services/payment_service.py`:
  - Success chỉ khi `vnp_ResponseCode == "00"` và `vnp_TransactionStatus == "00"`.
  - Failed phải cập nhật `transaction.status = "failed"`.
  - Không tin query frontend nếu chưa verify checksum trong production.

### Acceptance criteria

- Ở local có thể bấm test success để thấy giao diện thành công.
- Ở local có thể bấm test failed để thấy giao diện thất bại.
- Khi dùng VNPAY sandbox thật, membership tạo transaction pending trước khi redirect.
- Payment result không mặc định success khi thiếu dữ liệu thật.
- Không lưu thông tin thẻ/tài khoản ngân hàng ở frontend/backend.

## 7. Cài đặt hồ sơ

### Bug

- Menu `Mật khẩu & bảo mật`, `Tùy chọn đọc`, `Thông báo` đang chỉ là anchor, không có section tương ứng.
- Trang settings hiện gần như chỉ có form hồ sơ.

### Hướng sửa

- Cập nhật `SettingsScreen` trong `src/frontend/src/components/features/reader/ReaderScreens.tsx`.
- Thêm state `activeSettingSection`.
- Sidebar settings dùng button thay vì anchor chết:
  - Hồ sơ cá nhân
  - Mật khẩu & bảo mật
  - Tùy chọn đọc
  - Thông báo
- Section Hồ sơ:
  - Giữ display name, email, bio.
  - Thêm avatar URL/upload placeholder nếu backend chưa đủ upload.
- Section Mật khẩu & bảo mật:
  - Current password.
  - New password.
  - Confirm password.
  - Password rules.
  - Button đổi mật khẩu.
  - Session info: trạng thái đăng nhập hiện tại, nút đăng xuất.
  - Nếu backend chưa có endpoint đổi mật khẩu, tạo UI disabled hoặc mock local toast, đồng thời ghi rõ cần endpoint `PUT /api/v1/auth/password`.
- Section Tùy chọn đọc:
  - Font size default.
  - Theme sáng/tối.
  - Reader width.
  - Line height.
  - Lưu vào `localStorage` cùng key với Reader Mode hiện tại:
    - `yag.reader.fontSize`
    - `yag.reader.isDark`
    - `yag.reader.isWide`
  - Có preview ngắn.
- Section Thông báo:
  - Toggle chương mới.
  - Toggle trả lời bình luận.
  - Toggle kết quả kiểm duyệt/chương premium.
  - Toggle email notification.
  - Lưu local state nếu backend chưa có API.
- CSS:
  - `.settings-content`
  - `.settings-section`
  - `.settings-toggle-row`
  - `.reader-preview`

### Acceptance criteria

- Click từng mục settings đổi nội dung bên phải ngay, không dead click.
- Tùy chọn đọc lưu localStorage và Reader Mode đọc lại được.
- Notification toggles có trạng thái bật/tắt rõ ràng.
- Password/security section có form hoàn chỉnh và validation local.

## 8. Điều chỉnh routing và data metadata

### Hướng sửa

- Kiểm tra `src/frontend/src/data/yag.ts`:
  - Reader nav giữ đúng routes thật:
    - `/home`
    - `/discover`
    - `/library`
    - `/forum`
    - `/membership`
    - `/notifications`
    - `/profile`
    - `/settings`
  - Hạn chế route legacy như `/dashboard`, `/account-settings` trong UI chính.
- Kiểm tra redirect trong `next.config.ts`:
  - `/dashboard` -> `/home`
  - `/account-settings` -> `/settings`
  - `/payment-result` -> `/payment/result`
- Không để link `href="#"` cho các action chính.

### Acceptance criteria

- Không còn route legacy xuất hiện trong UI người dùng cuối.
- Mọi link topbar/sidebar/settings/forum đều điều hướng hoặc phản hồi đúng.

## 9. Checklist test thủ công sau khi sửa

| ID | Trang | Test case | Kỳ vọng |
|---|---|---|---|
| RD-AUTH-01 | Auth | Mở `/auth` desktop | Tab login/register chia đều toàn khung |
| RD-AUTH-02 | Auth | Mở register | Dòng điều khoản không xuống dòng ở desktop |
| RD-AUTH-03 | Auth | Submit thiếu field | Hiển thị lỗi đúng field, layout không vỡ |
| RD-AUTH-04 | Auth | Register user thường | Redirect về `/home` |
| RD-AUTH-05 | Auth | Login user thường | Redirect về `/home` |
| RD-SHELL-01 | Sidebar | Mở `/home` | Không còn "Trợ giúp & Hỗ trợ" |
| RD-SHELL-02 | Topbar | Click gói | Điều hướng `/membership` |
| RD-SHELL-03 | Topbar | Click truyện đang đọc | Điều hướng `/library` |
| RD-SHELL-04 | Topbar | Click account | Dropdown mở |
| RD-SHELL-05 | Topbar | Click Hồ sơ | Điều hướng `/profile/me` hoặc `/profile` |
| RD-SHELL-06 | Topbar | Click Đăng xuất | Xóa session và về `/auth` |
| RD-DISC-01 | Discover | Mở `/discover` | Search input, mode, button cùng hàng desktop |
| RD-DISC-02 | Discover | Chọn mode AI | UI chỉ hiển thị "AI", không có pgvector |
| RD-DISC-03 | Discover | Chọn từng filter | Dropdown có option đúng loại |
| RD-DISC-04 | Discover | Apply genre/status/chapter range | Danh sách thay đổi đúng |
| RD-FORUM-01 | Forum | Mở `/forum` | Feed gọn kiểu social thread |
| RD-FORUM-02 | Forum | Đổi tab | Danh sách đổi theo tab |
| RD-FORUM-03 | Forum | Tạo chủ đề | Post mới xuất hiện đầu feed |
| RD-FORUM-04 | Forum | Like/reply/share/more | Mỗi nút có phản hồi |
| RD-MEM-01 | Membership | Mở `/membership` | Plans load đúng |
| RD-MEM-02 | Membership | Bấm đăng ký plan | Tạo checkout hoặc hiện lỗi rõ |
| RD-MEM-03 | Payment | Test success local | Hiện giao diện thành công |
| RD-MEM-04 | Payment | Test failed local | Hiện giao diện thất bại |
| RD-MEM-05 | Payment | Transaction pending | Hiện pending và nút kiểm tra lại |
| RD-SET-01 | Settings | Click Hồ sơ | Hiện form hồ sơ |
| RD-SET-02 | Settings | Click Mật khẩu & bảo mật | Hiện form bảo mật, không dead click |
| RD-SET-03 | Settings | Click Tùy chọn đọc | Hiện reader preferences |
| RD-SET-04 | Settings | Lưu font/theme/width | Lưu localStorage |
| RD-SET-05 | Settings | Click Thông báo | Hiện notification toggles |

## 10. Checklist kiểm thử kỹ thuật

- Chạy frontend lint:
  - `cd src/frontend`
  - `npm run lint`
- Chạy frontend build:
  - `cd src/frontend`
  - `npm run build`
- Chạy backend tests liên quan auth/payment/stories:
  - `cd src/backend`
  - `pytest`
- Test browser local:
  - `/auth`
  - `/home`
  - `/discover`
  - `/forum`
  - `/membership`
  - `/payment/result?status=success&plan=MONTHLY&txnRef=MOCK_SUCCESS`
  - `/payment/result?status=failed&plan=MONTHLY&txnRef=MOCK_FAILED`
  - `/settings`

## 11. Ưu tiên triển khai

| Priority | Hạng mục | Lý do |
|---|---|---|
| P0 | Payment success/failure test flow | Chặn kiểm thử membership và deployment readiness |
| P0 | Topbar links + account dropdown | Các action chính đang không hoạt động |
| P1 | Discover search/filter | Luồng tìm truyện là chức năng reader cốt lõi |
| P1 | Settings sections | Các menu hiện dead click |
| P1 | Forum interactive refactor | Trang hiện không đạt UX test thực tế |
| P2 | Auth visual polish | Quan trọng cho first impression nhưng ít rủi ro logic |
| P2 | Sidebar help removal | Chỉnh nhỏ, ít rủi ro |

## 12. Ghi chú deployment

- Không đưa nút mô phỏng thanh toán success/failure lên production trừ khi được bảo vệ bằng `NODE_ENV !== "production"` hoặc `NEXT_PUBLIC_USE_MOCKS=true`.
- Payment result production phải ưu tiên backend transaction/IPN, không tin query string frontend nếu chưa verify checksum.
- Các action forum nếu chưa có backend API thì chỉ được coi là local UX mock; trước deployment thật cần thêm API forum hoặc đánh dấu rõ là tính năng demo.
- Settings password/security cần backend endpoint đổi mật khẩu nếu muốn production-ready thật sự.
