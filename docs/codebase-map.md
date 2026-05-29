# Codebase Map — YAG Writing Novels Web

> Tự động sinh bởi `scripts/index-codebase.py` lúc 2026-05-25 14:55:26
> **Không chỉnh sửa tay** — chạy lại script để cập nhật.

---

## Tổng quan

| Chỉ số | Giá trị |
|---|---|
| Tổng số file đã index | 73 |
| Tổng số functions/components | 116 |
| Tổng số API routes | 18 |
| Backend modules | 7 |
| Frontend modules | 4 |

---

## Tất cả API Routes

| Method | Path | Handler | Use Case | Mô tả |
|---|---|---|---|---|
| `POST` | `/` | `create_story` | U003 | — |
| `GET` | `/` | `read_root` | — | — |
| `POST` | `/chapters/{chapter_id}/publish` | `request_publish` | U004,U005,U007 | — |
| `GET` | `/dashboard/stats` | `get_stats` | — | — |
| `POST` | `/login` | `login` | U001 | — |
| `GET` | `/moderation/queue` | `get_moderation_queue` | U013 | — |
| `POST` | `/password-reset/request` | `reset_request` | — | — |
| `GET` | `/plans` | `get_plans` | — | — |
| `PUT` | `/profiles/me` | `update_profile` | U002 | — |
| `GET` | `/recommendations` | `ai_recommendations` | U009 | — |
| `POST` | `/register` | `register` | U001 | — |
| `POST` | `/search` | `semantic_search` | U008 | — |
| `POST` | `/suggestions` | `ai_suggestions` | U006 | — |
| `POST` | `/vnpay/checkout` | `checkout` | U012 | — |
| `POST` | `/vnpay/ipn` | `ipn_callback` | U012 | — |
| `GET` | `/{chapter_id}` | `get_chapter` | U004,U005,U007 | — |
| `POST` | `/{chapter_id}/comments` | `add_comment` | U004,U005,U007,U010 | — |
| `PUT` | `/{story_id}` | `update_story` | U003 | — |

---

## Backend — `src/backend/app`

### `root/`
*Module root*

#### `__init__.py` — Python module (157 bytes)

#### `main.py` — Routes: GET /

| Method | Path | Handler |
|---|---|---|
| `GET` | `/` | `read_root` |

### `api/`
*Module api*
Use Cases liên quan: **U001, U004, U005, U007, U012, U015**

#### `__init__.py` — Python module (136 bytes)

#### `deps.py` — Functions: get_db
Functions: `get_db`

#### `__init__.py` — Python module (119 bytes)

#### `__init__.py` — Python module (372 bytes)

#### `admin.py` — Routes: POST /chapters/{chapter_id}/publish, GET /moderation/queue, GET /dashboard/stats

| Method | Path | Handler |
|---|---|---|
| `POST` | `/chapters/{chapter_id}/publish` | `request_publish` |
| `GET` | `/moderation/queue` | `get_moderation_queue` |
| `GET` | `/dashboard/stats` | `get_stats` |

#### `ai.py` — Routes: POST /suggestions, POST /search, GET /recommendations

| Method | Path | Handler |
|---|---|---|
| `POST` | `/suggestions` | `ai_suggestions` |
| `POST` | `/search` | `semantic_search` |
| `GET` | `/recommendations` | `ai_recommendations` |

#### `auth.py` — Routes: POST /register, POST /login, POST /password-reset/request | (+1 route khác)

| Method | Path | Handler |
|---|---|---|
| `POST` | `/register` | `register` |
| `POST` | `/login` | `login` |
| `POST` | `/password-reset/request` | `reset_request` |
| `PUT` | `/profiles/me` | `update_profile` |

#### `chapters.py` — Routes: GET /{chapter_id}, POST /{chapter_id}/comments

| Method | Path | Handler |
|---|---|---|
| `GET` | `/{chapter_id}` | `get_chapter` |
| `POST` | `/{chapter_id}/comments` | `add_comment` |
Functions: `websocket_editor`

#### `payment.py` — Routes: GET /plans, POST /vnpay/checkout, POST /vnpay/ipn

| Method | Path | Handler |
|---|---|---|
| `GET` | `/plans` | `get_plans` |
| `POST` | `/vnpay/checkout` | `checkout` |
| `POST` | `/vnpay/ipn` | `ipn_callback` |

#### `stories.py` — Routes: POST /, PUT /{story_id}

| Method | Path | Handler |
|---|---|---|
| `POST` | `/` | `create_story` |
| `PUT` | `/{story_id}` | `update_story` |

#### `router.py` — Python module (937 bytes)

### `core/`
*Cấu hình, bảo mật, JWT, dependencies*

#### `__init__.py` — Python module (143 bytes)

#### `config.py` — Classes: Settings, Config

Classes: `Settings`, `Config`

#### `database.py` — Python module (650 bytes)

#### `security.py` — Functions: verify_password, get_password_hash, create_access_token
Functions: `verify_password`, `get_password_hash`, `create_access_token`

### `models/`
*SQLAlchemy ORM models — ánh xạ bảng DB*

#### `__init__.py` — Python module (306 bytes)

### `schemas/`
*Pydantic schemas — validate request/response*

#### `__init__.py` — Python module (127 bytes)

### `services/`
*Business logic layer — xử lý nghiệp vụ*

#### `__init__.py` — Python module (269 bytes)

### `worker/`
*Module worker*

#### `__init__.py` — Python module (223 bytes)

---

## Frontend — `src/frontend/src`

### `app/`
*Next.js App Router — pages và API routes*
Use Cases liên quan: **U001, U002, U003, U004, U005, U007, U011, U012, U013, U014, U015**

#### `page.tsx` — Components: AboutPage
Exports: `AboutPage`

#### `page.tsx` `S13` — Components: AccountSettingsPage | Screen: S13
Exports: `AccountSettingsPage`

#### `page.tsx` `S19` — Components: AdminDashboardPage | Screen: S19
Exports: `AdminDashboardPage`

#### `_auth-chrome.tsx` — Components: AuthBackdrop, AuthProductFooter
Exports: `AuthBackdrop`, `AuthProductFooter`

#### `page.tsx` — Components: AuthPage | Hooks: useMocks, useState, useEffect
Exports: `AuthPage`, `useMocks`, `useState`, `useEffect`, `useRouter`

#### `page.tsx` — Components: PasswordRecoveryPage | Hooks: useMocks, useState, useEffect
Exports: `PasswordRecoveryPage`, `useMocks`, `useState`, `useEffect`, `useRouter`

#### `page.tsx` `S16` — Components: AuthorStudioPage | Screen: S16
Exports: `AuthorStudioPage`

#### `page.tsx` — Components: AuthorWorksPage
Exports: `AuthorWorksPage`

#### `page.tsx` — Components: ContactPage
Exports: `ContactPage`

#### `page.tsx` `S20` — Components: ContentModerationPage | Screen: S20
Exports: `ContentModerationPage`

#### `page.tsx` — Components: DashboardPage | Hooks: useState, useEffect
Exports: `DashboardPage`, `useState`, `useEffect`

#### `page.tsx` `S05` — Components: DiscoverPage | Screen: S05
Exports: `DiscoverPage`

#### `page.tsx` `S08` — Components: ForumPage | Screen: S08
Exports: `ForumPage`

#### `layout.tsx` — Components: RootLayout
Exports: `RootLayout`

#### `page.tsx` `S11` — Components: LibraryPage | Screen: S11
Exports: `LibraryPage`

#### `page.tsx` `S09` — Components: MembershipPage | Screen: S09
Exports: `MembershipPage`

#### `page.tsx` `S14` — Components: NotificationsPage | Screen: S14
Exports: `NotificationsPage`

#### `page.tsx` — Components: LandingPage | Hooks: useState, useEffect, useRef
Exports: `LandingPage`, `useState`, `useEffect`, `useRef`

#### `page.tsx` `S10` — Components: PaymentResultPage | Screen: S10
Exports: `PaymentResultPage`

#### `page.tsx` — Components: PrivacyPage
Exports: `PrivacyPage`

#### `page.tsx` `S12` — Components: ProfilePage | Screen: S12
Exports: `ProfilePage`

#### `page.tsx` `S17` — Components: PublishChapterPage | Screen: S17
Exports: `PublishChapterPage`

#### `page.tsx` `S07` — Components: ReaderModePage | Screen: S07
Exports: `ReaderModePage`

#### `page.tsx` — Components: ReportsPage
Exports: `ReportsPage`

#### `page.tsx` `S18` — Components: ScheduleCommitmentPage | Screen: S18
Exports: `ScheduleCommitmentPage`

#### `page.tsx` `S06` — Components: StoryDetailPage | Screen: S06
Exports: `StoryDetailPage`

#### `page.tsx` — Components: TermsPage
Exports: `TermsPage`

### `components/`
*React components tái sử dụng*
Use Cases liên quan: **U001, U003, U015**

#### `AdminScreens.tsx` `S19` — Components: AdminDashboardScreen, ModerationScreen, ReportsScreen | Screen: S19
Exports: `AdminDashboardScreen`, `ModerationScreen`, `ReportsScreen`

#### `AuthScreens.tsx` — Components: PasswordField, AuthScreen, RecoveryScreen
Exports: `PasswordField`, `AuthScreen`, `RecoveryScreen`

#### `AuthorScreens.tsx` — Components: AuthorWorksScreen, AuthorStudioScreen, PublishScreen
Exports: `AuthorWorksScreen`, `AuthorStudioScreen`, `PublishScreen`, `ScheduleScreen`

#### `index.ts` — TS/TSX module (728 bytes)

#### `index.ts` — TS/TSX module (40 bytes)

#### `InfoPage.tsx` — Components: InfoPage | Hooks: useState
Exports: `InfoPage`, `useState`

#### `ReaderScreens.tsx` `S07` — Components: HomeFeedScreen, DiscoverScreen, StoryDetailScreen | Screen: S07
Exports: `HomeFeedScreen`, `DiscoverScreen`, `StoryDetailScreen`, `ReaderScreen`, `ForumScreen`, `MembershipScreen`

#### `AppShell.tsx` — Components: AppShell
Exports: `AppShell`

#### `index.ts` — TS/TSX module (90 bytes)

#### `ProductFooter.tsx` — Components: ProductFooter
Exports: `ProductFooter`

#### `ClientInteractions.tsx` — Components: ClientInteractions | Hooks: useMocks, useEffect, useRouter
Exports: `ClientInteractions`, `useMocks`, `useEffect`, `useRouter`

#### `BrandLogo.tsx` — Components: BrandLogo
Exports: `BrandLogo`

#### `Charts.tsx` — Components: LineChart, BarChart
Exports: `LineChart`, `BarChart`

#### `Cover.tsx` — Components: Cover
Exports: `Cover`

#### `Feedback.tsx` — Components: ErrorGuide
Exports: `ErrorGuide`

#### `Icon.tsx` — Components: Icon
Exports: `Icon`

#### `index.ts` — TS/TSX module (375 bytes)

#### `Metrics.tsx` — Components: MetricCard
Exports: `MetricCard`

#### `StoryCards.tsx` — Components: StoryBadge, HomeStoryCard, ReadingCard
Exports: `StoryBadge`, `HomeStoryCard`, `ReadingCard`, `RankingItem`, `UpdateStoryRow`, `QuickStories`

### `data/`
*Module data*

#### `yag.ts` — TS/TSX module (7074 bytes)
Exports: `getScreenId`, `getPageById`, `getRoleForPage`

### `lib/`
*Utilities, API client, custom hooks*
Use Cases liên quan: **U001**

#### `api.ts` — TS/TSX module (5528 bytes)
Exports: `apiFetch`

#### `auth.ts` — TS/TSX module (841 bytes)
Exports: `getAccessToken`, `setAuthTokens`, `clearAuthTokens`

#### `env.ts` — Hooks: useMocks
Exports: `resolveApiUrl`, `useMocks`

#### `index.ts` — TS/TSX module (104 bytes)

#### `realtime.ts` — TS/TSX module (1343 bytes)
Exports: `createDraftSocket`

---

## Phân công thành viên (mapping → code)

| Thành viên | MSSV | Feature / Use Cases | Backend phụ trách | Frontend phụ trách |
|---|---|---|---|---|
| Trần Gia Hiển | 23120123 | F1 - Authentication & User Profile (U001, U002) | `auth.py` router/service | S02, S03, S12, S13 |
| Nguyễn Duy Trường | 23120182 | F2 - Premium Membership & VNPAY Payment (U011, U012) | `payment.py` router/service | S09, S10 |
| Phạm Hương Trà | 23120177 | F3 - AI Smart Novel Engine (U006, U008, U009) | `ai.py` router/service | S04, S05, S16 (AI Sidebar) |
| Huỳnh Yến Nhi | 23120151 | F4 - Story & Chapter Management (U003, U004, U007, U010) | `stories.py`, `chapters.py` router/service | S01, S06, S07, S08, S11, S15, S16 (Editor) |
| Nguyễn Phú Thọ | 23120169 | F5 - Async Queue Publishing & AI Moderation (U005, U013, U014, U015) | `admin.py` router/service | S14, S17, S18, S19, S20, S21 |

---

## Hướng dẫn cho AI Agent

- Để tìm route cụ thể → xem bảng **Tất cả API Routes** ở trên
- Để hiểu một Use Case → tìm Use Case ID trong cột **Use Cases liên quan**
- Để thêm tính năng mới → xem module tương ứng rồi đọc file đó
- Thông tin schema DB đầy đủ → xem `AGENTS.md` mục 4
- Luồng nghiệp vụ (RabbitMQ, VNPAY, pgvector) → xem `AGENTS.md` mục 5

---
*Cập nhật: 2026-05-25 14:55:26 — Chạy lại: `python scripts/index-codebase.py`*