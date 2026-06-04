# Author Flow Production Upgrade Plan

## Mục tiêu

Nâng cấp toàn bộ author flow của YAG để phù hợp với một website triển khai thực tế trên Internet. Trọng tâm là tối ưu trải nghiệm sáng tác, quản lý tác phẩm, lịch cam kết xuất bản, hồ sơ tác giả, thông báo và cài đặt trong đúng ngữ cảnh Author. Giao diện phải chuyên nghiệp, thông tin chính xác, không dư thừa, mọi nút đều có chức năng rõ ràng, thiết kế đáp ứng chuẩn quốc tế và đủ trạng thái cho dữ liệu thật.

## Nguyên tắc bắt buộc

- Reader và Author là cùng một tài khoản người dùng thường; Author là chế độ làm việc, không phải tài khoản riêng.
- Khi user đang ở author section, các trang dùng chung như Notifications, Profile, Settings vẫn phải giữ author shell/sidebar/topbar, không tự chuyển về reader section.
- Không hiển thị route/tab trung gian không cần thiết trong sidebar nếu nó đã nằm trong workflow của trang khác.
- Không để dead button, dead tab, `href="#"`, action không feedback hoặc form không validation.
- Tất cả màn hình cần có loading, empty, error, success và permission state.
- Giao diện responsive cho tối thiểu 360px, 390px, 768px, 1024px, 1440px.
- Đáp ứng WCAG 2.2 AA: keyboard navigation, focus visible, label/aria đúng, contrast đủ, heading order hợp lý.
- Nội dung tiếng Việt phải tự nhiên, nhất quán, không hiển thị thuật ngữ backend/debug/mock cho người dùng cuối.

## Phạm vi file cần chỉnh

- `src/frontend/src/data/yag.ts`
- `src/frontend/src/components/layout/AppShell.tsx`
- `src/frontend/src/components/features/author/AuthorScreens.tsx`
- `src/frontend/src/components/features/reader/ReaderScreens.tsx`
- `src/frontend/src/app/author/stories/page.tsx`
- `src/frontend/src/app/author/stories/[id]/edit/page.tsx`
- `src/frontend/src/app/author/stories/[id]/publish/page.tsx`
- `src/frontend/src/app/author/schedule/page.tsx`
- `src/frontend/src/app/notifications/page.tsx`
- `src/frontend/src/app/profile/page.tsx`
- `src/frontend/src/app/profile/me/page.tsx`
- `src/frontend/src/app/settings/page.tsx`
- `src/frontend/src/app/prototype.css`
- `src/frontend/src/app/globals.css`
- `src/frontend/src/lib/api.ts`
- `src/backend/app/api/v1/endpoints/stories.py`
- `src/backend/app/api/v1/endpoints/chapters.py`
- `src/backend/app/api/v1/endpoints/publish.py`
- `src/backend/app/api/v1/endpoints/notifications.py`
- `src/backend/app/services/publish_service.py`
- `src/backend/app/services/schedule_service.py`
- `src/backend/app/models/publish_schedule.py`
- `src/backend/app/models/story.py`
- `src/backend/app/models/chapter.py`

## 1. Author Sidebar và Navigation

### Vấn đề hiện tại

- Sidebar author đang có `Không gian viết` và `Xuất bản chương`.
- Hai mục này không nên là tab sidebar độc lập vì chúng thuộc workflow bên trong từng tác phẩm:
  - Vào `Tác phẩm của tôi`.
  - Chọn tác phẩm.
  - Bấm `Viết tiếp` hoặc `Đăng chương`.

### Hướng điều chỉnh

- Cập nhật `roleNav.author` trong `src/frontend/src/data/yag.ts`.
- Sidebar author chỉ nên giữ:
  - `Tác phẩm của tôi` -> `/author/stories`
  - `Lịch đăng & Cam kết` -> `/author/schedule`
  - `Thông báo` -> author-context route
  - `Hồ sơ tác giả` -> author-context route
  - `Cài đặt` -> author-context route
- Loại bỏ khỏi sidebar:
  - `s16 - Không gian viết`
  - `s17 - Xuất bản chương`
- Giữ route `s16` và `s17` trong app vì vẫn cần truy cập bằng CTA từ story card, editor và publish workflow.
- Trong `AuthorWorksScreen`, mỗi story card cần có action rõ:
  - `Viết tiếp`
  - `Quản lý chương`
  - `Đăng chương`
  - `Xem lịch`
  - `Xem ngoài trang đọc`

### Acceptance criteria

- Sidebar author không còn tab Writing Space và Chapter Publishing.
- User vẫn vào được editor qua `/author/stories/{id}/edit`.
- User vẫn vào được publish qua `/author/stories/{id}/publish`.
- Không có link sidebar trỏ tới story id hardcode.

## 2. Giữ Author Context Cho Notification, Profile, Settings

### Vấn đề hiện tại

- Các page dùng chung như profile/settings/notifications đang dùng `activeId` thuộc group tài khoản nên dễ render reader shell.
- Khi author đang làm việc, bấm profile/settings/notifications không nên chuyển cảm giác về reader section.

### Hướng điều chỉnh

- Thêm cơ chế `modeOverride` hoặc `sectionOverride` cho `AppShell`:
  - `modeOverride?: "reader" | "author" | "admin"`
  - Nếu có override, AppShell dùng override để chọn nav/topbar/brandHref.
  - Nếu không có override, fallback theo `getRoleForPage(activeId)`.
- Tạo route author-context rõ ràng:
  - `/author/notifications`
  - `/author/profile`
  - `/author/settings`
- Các route này có thể reuse component hiện tại nhưng truyền `modeOverride="author"`.
- Account dropdown khi đang ở author section:
  - `Hồ sơ` -> `/author/profile`
  - `Cài đặt` -> `/author/settings`
  - `Thông báo` -> `/author/notifications`
  - `Chuyển sang Reader` -> `/home`
  - `Đăng xuất` -> `/auth`
- Topbar notification icon trong author section trỏ tới `/author/notifications`.
- Nếu không muốn thêm route mới, dùng query `?mode=author`, nhưng route riêng sạch và dễ test hơn cho production.

### Acceptance criteria

- Từ `/author/stories`, click profile/settings/notifications vẫn giữ sidebar author.
- Author shared pages không hiện reader nav.
- Reader shared pages vẫn giữ reader nav.
- Admin không bị ảnh hưởng.

## 3. Author Works Dashboard

### Cần nâng cấp

- Trang `Tác phẩm của tôi` phải là dashboard quản lý tác phẩm, không chỉ là grid card đơn giản.
- Tác giả cần nhìn nhanh tình trạng từng tác phẩm, tiến độ chương, lịch đăng và trạng thái kiểm duyệt.

### Hướng điều chỉnh

- Header:
  - Greeting theo display name.
  - CTA `Tạo tác phẩm mới`.
  - Secondary CTA `Xem lịch đăng`.
- Metrics:
  - Tổng tác phẩm.
  - Draft chapters.
  - Pending moderation.
  - Approved/published chapters.
  - Lượt đọc tháng này.
  - Rating trung bình.
  - Điểm uy tín tác giả.
  - Tỷ lệ đúng lịch.
- Filters:
  - Trạng thái tác phẩm: `Tất cả`, `Đang cập nhật`, `Hoàn thành`, `Tạm dừng`.
  - Kiểm duyệt: `Có chương đang duyệt`, `Có chương bị gắn cờ`.
  - Sort: `Mới chỉnh sửa`, `Lượt đọc`, `Đánh giá`, `Sắp đến hạn`.
- Story card/list:
  - Cover, title, category, status.
  - Chapter count.
  - Latest draft updated time.
  - Next scheduled publish time.
  - Moderation badges.
  - Progress bar theo mục tiêu chương hoặc deadline nếu có.
  - Actions: `Viết tiếp`, `Đăng chương`, `Lịch`, `Chi tiết`.
- Modal tạo tác phẩm:
  - Validate title, category, description.
  - Preview cover.
  - Loading/error/success.
  - Không hardcode lỗi "Trùng tiêu đề?" nếu backend trả lỗi khác.

### Acceptance criteria

- Mỗi story có id thật và action đúng route.
- Tác giả nhìn được tác phẩm nào cần xử lý trước.
- Empty state hướng dẫn tạo tác phẩm đầu tiên.
- Form tạo tác phẩm không bị submit lặp.

## 4. Author Studio Workflow

### Cần nâng cấp

- Editor là workflow chính cho `Writing Space`, vì vậy không cần sidebar tab riêng.
- Studio phải hỗ trợ viết dài, autosave, phục hồi offline, AI sidebar và publish workflow rõ.

### Hướng điều chỉnh

- Entry:
  - Chỉ vào editor từ story card hoặc chapter list.
  - Nếu story chưa có chapter, tạo draft đầu tiên có xác nhận hoặc button rõ.
- Layout:
  - Ba vùng: chapter outline, editor, AI sidebar.
  - Header có breadcrumb: `Tác phẩm của tôi / {Tên truyện} / Đang viết`.
  - Save status rõ: `Đã lưu`, `Đang lưu`, `Lưu cục bộ`, `Lỗi lưu`.
- Chapter outline:
  - Danh sách chương có status badge: draft, pending, approved, rejected, flagged.
  - Button thêm chương.
  - Không cho sửa trực tiếp chương đã published nếu backend không hỗ trợ versioning.
- Editor:
  - Word count, estimated reading time.
  - Last saved timestamp.
  - Autosave debounce 3 giây.
  - Offline draft recovery.
- AI sidebar:
  - Context 1000 từ cuối.
  - Prompt/tone input.
  - 3 suggestions.
  - Insert suggestion vào vị trí cursor.
  - Error state khi Gemini rate limit/timeout.
- Publish:
  - CTA `Chuẩn bị đăng chương` trỏ tới `/author/stories/{id}/publish`.
  - Nếu chương đang rỗng hoặc quá ngắn, cảnh báo trước publish.

### Acceptance criteria

- Editor không mất nội dung khi reload/offline ngắn.
- AI suggestion không block editor.
- Publish CTA chỉ xuất hiện khi có active chapter hợp lệ.
- Không có console-only error cho lỗi người dùng cần biết.

## 5. Chapter Publishing Workflow

### Cần nâng cấp

- Publish page là bước trong workflow tác phẩm, không là sidebar tab.
- Tác giả cần hiểu rõ chương nào được gửi duyệt, lịch publish, premium/free và cam kết nội dung.

### Hướng điều chỉnh

- Page `/author/stories/{id}/publish`:
  - Header có tên truyện, breadcrumb về editor/tác phẩm.
  - Select chapter draft.
  - Preview chapter metadata:
    - Chapter number.
    - Title.
    - Word count.
    - Last saved time.
    - Current moderation status.
  - Select visibility:
    - Free.
    - Premium.
  - Schedule:
    - Publish now after approval.
    - Schedule for later.
    - Warn nếu thời gian quá khứ.
  - Commitment:
    - Checkbox bản quyền/nội dung.
    - Explain AI moderation pending.
  - Submit:
    - Gửi duyệt trả về trạng thái pending.
    - Sau success đưa về story detail/dashboard với toast.
- Backend alignment:
  - Publish endpoint trả HTTP 202 nếu đã enqueue moderation.
  - Không gọi Gemini trực tiếp trong request handler.
  - Lưu moderation_status `pending`.

### Acceptance criteria

- Không publish được nếu chưa chọn chapter hoặc chưa cam kết.
- Có empty state khi không có draft.
- Sau publish, author thấy chương pending ở dashboard/editor.

## 6. Publication Schedule and Commitment Page

### Vấn đề hiện tại

- Trang `/author/schedule` hiện quá đơn giản.
- Chưa hiển thị đầy đủ:
  - Tác phẩm nào đến hạn xuất bản.
  - Cam kết thời gian hoàn thành tác phẩm.
  - Biểu đồ hữu ích cho tác giả.
  - Thời gian đã dành để viết.
  - Lịch sử đăng chương/viết nháp.
  - Các deadline, missed schedule, reminder.

### Mục tiêu UX

Trang này phải giống một author planning dashboard: vừa là lịch đăng, vừa là bảng cam kết, vừa là nơi theo dõi năng suất viết.

### Hướng điều chỉnh UI

- Header:
  - Title `Lịch đăng & Cam kết`.
  - CTA `Thêm cam kết`.
  - CTA `Lên lịch chương`.
  - Filter theo tác phẩm.
- Summary cards:
  - `Đến hạn trong 7 ngày`.
  - `Chương đang chờ duyệt`.
  - `Tỷ lệ đúng lịch`.
  - `Chuỗi ngày viết`.
  - `Số từ tuần này`.
  - `Thời gian viết tuần này`.
- Main calendar:
  - Month/week toggle.
  - Calendar cells hiển thị scheduled chapters.
  - Màu trạng thái:
    - scheduled.
    - pending moderation.
    - published.
    - missed.
  - Click event mở detail panel.
- Due list:
  - Tác phẩm.
  - Chương.
  - Deadline.
  - Thời gian còn lại.
  - Trạng thái.
  - Action: `Viết tiếp`, `Đăng chương`, `Dời lịch`, `Đánh dấu hoàn thành`.
- Commitment board:
  - Mục tiêu hoàn thành tác phẩm.
  - Tổng chương mục tiêu.
  - Current chapter count.
  - Target completion date.
  - Progress bar.
  - Risk indicator: đúng tiến độ, có rủi ro, trễ hạn.
- Charts:
  - Words written by day/week.
  - Writing time by day/week.
  - Chapters published over time.
  - On-time vs missed schedule.
  - Moderation result breakdown.
  - Story performance: views/rating by work.
- Writing time tracker:
  - Start/stop session button.
  - Manual add session.
  - Session history:
    - Date.
    - Story.
    - Chapter.
    - Duration.
    - Words added.
    - Note.
- History timeline:
  - Draft created.
  - Autosaved.
  - Submitted for moderation.
  - Approved/rejected.
  - Published.
  - Schedule missed/updated.
- Empty states:
  - Chưa có lịch -> CTA tạo schedule.
  - Chưa có tác phẩm -> CTA tạo tác phẩm.
  - Chưa có session -> CTA bắt đầu ghi thời gian viết.

### Hướng điều chỉnh backend/API

- Kiểm tra/mở rộng `publish_schedules`:
  - `story_id`
  - `chapter_id` nếu cần gắn trực tiếp với chương.
  - `scheduled_time`
  - `status`: scheduled, published, missed.
  - `commitment_type`: chapter_publish, story_completion.
  - `target_chapter_count`
  - `target_word_count`
  - `completed_at`
- Thêm hoặc chuẩn bị bảng writing sessions nếu chưa có:
  - `writing_sessions`
  - `id`
  - `user_id`
  - `story_id`
  - `chapter_id`
  - `started_at`
  - `ended_at`
  - `duration_seconds`
  - `words_added`
  - `note`
- API đề xuất:
  - `GET /api/v1/author/schedule/overview`
  - `GET /api/v1/author/schedule/events`
  - `POST /api/v1/author/schedule/events`
  - `PUT /api/v1/author/schedule/events/{id}`
  - `POST /api/v1/author/writing-sessions/start`
  - `POST /api/v1/author/writing-sessions/{id}/stop`
  - `GET /api/v1/author/writing-sessions`
  - `GET /api/v1/author/analytics`
- Nếu chưa triển khai backend ngay:
  - Frontend dùng mock local state có cấu trúc giống API thật.
  - Không để button chết; action phải cập nhật state local và toast.

### Acceptance criteria

- Schedule page không còn là calendar đơn giản.
- Author biết rõ tác phẩm/chương nào đến hạn.
- Có biểu đồ và số liệu hữu ích.
- Có writing time tracker hoạt động local hoặc backend.
- Click event/list item có detail panel/action.

## 7. Author Notifications

### Cần nâng cấp

- Notification trong author section phải ưu tiên thông báo liên quan sáng tác.
- Không chuyển user về reader section khi bấm notification.

### Hướng điều chỉnh

- Route author-context: `/author/notifications`.
- Tabs:
  - `Tất cả`.
  - `Kiểm duyệt`.
  - `Lịch đăng`.
  - `Bình luận`.
  - `Hiệu suất`.
  - `Hệ thống`.
- Notification card:
  - Icon/type.
  - Title.
  - Message.
  - Related story/chapter.
  - Time.
  - Read/unread state.
  - CTA contextual:
    - Pending/approved/rejected moderation -> chapter/editor.
    - Missed schedule -> schedule.
    - New comment -> story/chapter.
- Actions:
  - Mark as read.
  - Mark all as read.
  - Filter unread.
  - Retry if load error.

### Acceptance criteria

- Author notification center dùng author shell.
- Click notification điều hướng đúng author route khi là author event.
- Unread count đồng bộ topbar.

## 8. Author Profile Page

### Vấn đề hiện tại

- Profile hiện quá đơn giản.
- Thiết kế chưa đủ hấp dẫn và chưa thể hiện vai trò tác giả.
- Cần thêm tab tương tự khu thông báo/tin tác giả.

### Hướng điều chỉnh

- Tạo profile presentation production:
  - Hero cover/banner.
  - Avatar.
  - Display name.
  - Username.
  - Author badge.
  - Bio.
  - Join date.
  - Reputation score.
  - Social/share actions nếu cần.
- Stats:
  - Tác phẩm đã đăng.
  - Chương đã xuất bản.
  - Tổng lượt đọc.
  - Rating trung bình.
  - Người theo dõi.
  - Tỷ lệ đúng lịch.
- Tabs:
  - `Tổng quan`.
  - `Tác phẩm`.
  - `Thông báo tác giả`.
  - `Lịch đăng`.
  - `Hoạt động`.
- Tab `Tổng quan`:
  - Bio.
  - Featured story.
  - Writing goals.
  - Recent achievements.
- Tab `Tác phẩm`:
  - List/grid tác phẩm public.
  - Status, chapter count, rating, views.
  - CTA edit nếu là chính chủ trong author context.
- Tab `Thông báo tác giả`:
  - Dùng để tác giả đăng thông báo tới độc giả.
  - Composer nếu là chính chủ:
    - Title/message.
    - Related story.
    - Visibility.
    - Publish/draft.
  - List announcements:
    - New chapter notice.
    - Delay notice.
    - Milestone.
    - Event/Q&A.
  - Nếu chưa có backend, local mock nhưng action không chết.
- Tab `Lịch đăng`:
  - Next scheduled chapters public.
  - Commitment progress nếu public được.
- Tab `Hoạt động`:
  - Recently published chapters.
  - Reviews received.
  - Comments/replies.
- Privacy:
  - Public profile không lộ email.
  - Owner profile có link settings.

### Backend/API đề xuất

- `GET /api/v1/profiles/{user_id}`
- `GET /api/v1/auth/profiles/me`
- `GET /api/v1/authors/{user_id}/stories`
- `GET /api/v1/authors/{user_id}/announcements`
- `POST /api/v1/authors/me/announcements`
- `PUT /api/v1/authors/me/announcements/{id}`
- `DELETE /api/v1/authors/me/announcements/{id}`

### Acceptance criteria

- Profile author đẹp hơn, đủ thông tin, không trống.
- Có tab `Thông báo tác giả`.
- Owner có thể tạo announcement local hoặc qua API.
- Public viewer không thấy action chỉnh sửa riêng tư.

## 9. Author Settings

### Cần nâng cấp

- Khi vào settings từ author section, nội dung phải ưu tiên thiết lập liên quan sáng tác.

### Hướng điều chỉnh

- Route author-context: `/author/settings`.
- Sections:
  - Hồ sơ tác giả.
  - Bảo mật tài khoản.
  - Thiết lập sáng tác.
  - AI Sidebar.
  - Lịch đăng & nhắc nhở.
  - Thông báo.
  - Membership/thanh toán nếu user cũng là reader.
- Thiết lập sáng tác:
  - Default editor font size.
  - Autosave interval display.
  - Default chapter visibility free/premium.
  - Default category.
  - Draft recovery preferences.
- AI Sidebar:
  - Default tone.
  - Suggestion length.
  - Safety mode.
  - Context limit note 1000 từ.
- Schedule reminders:
  - Reminder before deadline: 24h, 12h, 3h.
  - Missed schedule alert.
  - Weekly writing summary.
- Notification preferences:
  - Moderation result.
  - Comments/reviews.
  - Schedule reminders.
  - Story performance summary.

### Acceptance criteria

- Author settings không hiện như reader-only settings.
- Các toggle/select lưu localStorage hoặc API preference.
- Không có section trống hoặc button chết.

## 10. Data Accuracy và Content Cleanup

### Hướng điều chỉnh

- Không dùng hardcoded story id trong sidebar/nav.
- Không hiển thị metric giả như `Cam kết lịch đăng 100%` nếu chưa có dữ liệu thật.
- Với mọi metric chưa có backend:
  - Hiển thị `Chưa có dữ liệu` hoặc empty state.
  - Không bịa số liệu production.
- Format thống nhất:
  - Datetime: `dd/MM/yyyy HH:mm`.
  - Relative time: `5 phút trước`, `2 ngày trước`.
  - View count: `1.2K`, `3.4M`.
  - Percent: `82%`.
  - Duration: `1 giờ 25 phút`.
- Status mapping:
  - story `ongoing` -> `Đang cập nhật`.
  - story `completed` -> `Hoàn thành`.
  - story `paused` -> `Tạm dừng`.
  - chapter `draft` -> `Bản nháp`.
  - moderation `pending` -> `Đang duyệt`.
  - moderation `approved` -> `Đã duyệt`.
  - moderation `rejected` -> `Từ chối`.
  - moderation `flagged` -> `Cần xem xét`.

### Acceptance criteria

- Không còn text dư thừa hoặc sai ngữ cảnh.
- Metric không có data không bị render thành `undefined`, `NaN`, `null`.
- Status tiếng Việt nhất quán toàn author flow.

## 11. UI/UX Standards

### Checklist thiết kế

- Layout author dashboard ưu tiên mật độ thông tin vừa phải, dễ scan, không landing-page style.
- Card radius tối đa 8px trừ khi design system hiện tại khác.
- Không lồng card trong card gây rối.
- Button có icon khi là tool/action quen thuộc.
- Icon-only button có tooltip hoặc aria-label.
- Text trong button không tràn.
- Table/list có header hoặc label rõ.
- Empty state có CTA.
- Error state có retry.
- Loading skeleton giữ kích thước ổn định.
- Modal có close button, click outside hợp lý, Escape close.
- Mobile:
  - Sidebar thành drawer.
  - Charts/table chuyển thành stacked cards.
  - Calendar có week/list view để không vỡ layout.

## 12. Accessibility

### Checklist bắt buộc

- Mỗi input có `label` và `htmlFor`.
- Form error có `aria-invalid` và `aria-describedby`.
- Dropdown/menu có keyboard support.
- Calendar event có text label, không chỉ dùng màu.
- Chart có summary text hoặc table fallback.
- Focus ring rõ.
- Button disabled phải có lý do nếu hành động quan trọng.
- Heading order không nhảy lung tung.
- Không dùng màu duy nhất để phân biệt trạng thái schedule.

## 13. Performance và Reliability

### Hướng điều chỉnh

- Không fetch lại toàn bộ dashboard khi chỉ đổi một small action.
- Schedule/calendar dùng range query theo tháng/tuần.
- Analytics chart dùng API tổng hợp, không tính nặng ở frontend nếu data lớn.
- Debounce search/filter.
- Tránh interval/polling không clear.
- WebSocket/autosave phải cleanup khi unmount.
- Không để schedule charts render blank khi không có data.

### Acceptance criteria

- Author dashboard không blank khi backend lỗi.
- Calendar mở nhanh với dữ liệu tháng hiện tại.
- Studio không mất draft khi network chập chờn.

## 14. Backend Readiness Cho Author Flow

### Cần kiểm tra/mở rộng

- Stories:
  - My stories trả đủ: status, chapter_count, draft_count, pending_count, view_count, rating_avg, updated_at, next_schedule.
- Chapters:
  - Author chapters trả cả draft/pending/rejected của chính chủ.
  - Reader chapters chỉ trả approved/published.
- Publish:
  - Publish async queue qua RabbitMQ.
  - Response nhanh HTTP 202.
  - Moderation status update đúng.
- Schedule:
  - CRUD schedule/commitment.
  - Missed schedule cron.
  - Reputation score update.
- Notifications:
  - Author-specific notification types.
  - Target URL/context.
- Profile:
  - Public profile safe.
  - Owner profile editable.
- Analytics:
  - Summary endpoint cho author dashboard/schedule.

### Acceptance criteria

- Frontend không cần dựa vào mock để hiển thị author dashboard production.
- API phân quyền chính chủ rõ ràng.
- Reader không đọc được draft/pending chapter.

## 15. Manual Test Checklist Sau Khi Nâng Cấp

| ID | Area | Test case | Kỳ vọng |
|---|---|---|---|
| AU-PROD-01 | Sidebar | Mở `/author/stories` | Không còn Writing Space/Chapter Publishing tab |
| AU-PROD-02 | Sidebar | Click toàn bộ author nav | Không dead link |
| AU-PROD-03 | Context | Từ author click notifications | Vẫn giữ author sidebar |
| AU-PROD-04 | Context | Từ author click profile | Vẫn giữ author sidebar |
| AU-PROD-05 | Context | Từ author click settings | Vẫn giữ author sidebar |
| AU-PROD-06 | Works | Tạo tác phẩm mới | Validate, submit, hiển thị story mới |
| AU-PROD-07 | Works | Click Viết tiếp | Vào đúng `/author/stories/{id}/edit` |
| AU-PROD-08 | Works | Click Đăng chương | Vào đúng `/author/stories/{id}/publish` |
| AU-PROD-09 | Studio | Autosave | Có trạng thái lưu rõ |
| AU-PROD-10 | Studio | Offline draft | Có recovery banner |
| AU-PROD-11 | Studio | AI suggestion lỗi | Hiển thị warning, editor không block |
| AU-PROD-12 | Publish | Không chọn chapter | Không submit, hiện lỗi |
| AU-PROD-13 | Publish | Submit valid | Chương sang pending/moderation |
| AU-PROD-14 | Schedule | Mở `/author/schedule` | Có calendar, due list, commitment, charts |
| AU-PROD-15 | Schedule | Click event calendar | Mở detail/action panel |
| AU-PROD-16 | Schedule | Start writing session | Timer hoạt động |
| AU-PROD-17 | Schedule | Stop writing session | Session vào history |
| AU-PROD-18 | Schedule | Thêm cam kết | Commitment board cập nhật |
| AU-PROD-19 | Notifications | Mark all read | Unread count cập nhật |
| AU-PROD-20 | Notifications | Click moderation notification | Vào đúng editor/chapter |
| AU-PROD-21 | Profile | Mở author profile | Hiển thị hero, stats, tabs |
| AU-PROD-22 | Profile | Tab Thông báo tác giả | Composer/list hoạt động |
| AU-PROD-23 | Settings | Thiết lập sáng tác | Lưu và áp dụng local/API |
| AU-PROD-24 | Responsive | 360/390/768/1024/1440 | Không overlap/tràn text |
| AU-PROD-25 | Accessibility | Keyboard-only walkthrough | Không kẹt focus |

## 16. Technical Verification

- Frontend:
  - `cd src/frontend`
  - `npm run lint`
  - `npm run build`
- Backend:
  - `cd src/backend`
  - `pytest`
- Browser smoke test:
  - `/author/stories`
  - `/author/stories/{id}/edit`
  - `/author/stories/{id}/publish`
  - `/author/schedule`
  - `/author/notifications`
  - `/author/profile`
  - `/author/settings`
- Responsive screenshot:
  - 360px.
  - 390px.
  - 768px.
  - 1024px.
  - 1440px.
- Accessibility:
  - Keyboard navigation.
  - Focus visible.
  - Contrast check.
  - Screen reader label spot check.

## 17. Ưu tiên triển khai

| Priority | Hạng mục | Lý do |
|---|---|---|
| P0 | Author sidebar cleanup | Điều hướng sai làm workflow rối |
| P0 | Author context for shared pages | Tránh author bị đưa về reader section |
| P0 | Schedule dashboard upgrade | Trang hiện thiếu chức năng tác giả cần nhất |
| P1 | Author profile redesign + announcements | Cần profile đủ tốt cho web thật |
| P1 | Author works dashboard | Trung tâm quản lý tác phẩm |
| P1 | Publish workflow polish | Liên quan trực tiếp moderation/deployment |
| P2 | Studio polish | Đã có nền tốt, cần hoàn thiện UX |
| P2 | Notifications/settings author-specific | Tăng tính sản phẩm hoàn chỉnh |
| P2 | Analytics/charts backend | Có thể mock trước, production cần API |

## 18. Definition of Done

- Sidebar author không còn Writing Space và Chapter Publishing tab.
- Editor và publish vẫn truy cập đúng từ workflow trong từng tác phẩm.
- Notifications/profile/settings giữ author context khi đi từ author section.
- Schedule page hiển thị due works, commitments, charts, writing time tracker và history.
- Author profile có hero, stats, tabs và tab `Thông báo tác giả`.
- Không còn dead button/link trong author flow.
- Không hiển thị dữ liệu sai, dư thừa, `undefined`, `NaN`, `null`.
- UI responsive và accessible ở mức production-ready.
- Frontend build pass và backend tests pass trước deployment.
