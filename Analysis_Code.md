# 📋 Phân Tích Mã Nguồn Dự Án YAG — Writing Novels Web

> Phân tích codebase tại commit hiện tại trên nhánh `main`, ngày 2026-06-11.

---

## 1. Cây Thư Mục

```
SE_Writing_Web/
├── .github/workflows/ci.yml         # CI/CD pipeline
├── nginx/
│   ├── nginx.conf                    # Reverse proxy (SSL, rate limiting)
│   └── certs/                        # SSL certificates (mounted read-only)
├── docs/task/                        # Task documentation
├── docker-compose.yml                # 7 services, 3 profiles (default/app/prod)
├── AGENTS.md                         # Bản đồ kỹ thuật cho AI Agent (80KB)
├── README.md
│
├── src/backend/                      # ── FastAPI (Python 3.11) ──
│   ├── Dockerfile                    # Multi-stage build
│   ├── requirements.txt              # 21 dependencies
│   ├── worker.py                     # RabbitMQ worker entry point
│   ├── migrations/                   # 6 versioned SQL migration files (V1→V6)
│   ├── tests/                        # 25 test files (pytest)
│   └── app/
│       ├── main.py                   # FastAPI app, lifespan, middleware, WebSocket
│       ├── manage_migrations.py      # SQL migration runner
│       ├── seed.py                   # Dev data seeder
│       ├── reset_dev_db.py           # Dev DB reset utility
│       ├── api/
│       │   ├── deps.py               # Dependency injection (auth, DB, roles)
│       │   └── v1/
│       │       ├── router.py         # API router hub (10 endpoint modules)
│       │       └── endpoints/        # 11 endpoint files
│       │           ├── auth.py, stories.py, chapters.py, payment.py
│       │           ├── ai.py, recommendations.py, admin.py
│       │           ├── publish.py, notifications.py, internal.py
│       │           └── __init__.py
│       ├── ai/                       # Gemini agent core (5 files)
│       │   ├── gateway.py, tools.py, skills.py, orchestrator.py
│       │   └── __init__.py
│       ├── core/                     # Infrastructure (4 files)
│       │   ├── config.py, database.py, security.py
│       │   └── __init__.py
│       ├── models/                   # SQLAlchemy ORM (17 files, 16 bảng)
│       ├── schemas/                  # Pydantic schemas (16 files)
│       ├── services/                 # Business logic (12 files)
│       └── worker/                   # RabbitMQ consumer (2 files)
│
└── src/frontend/                     # ── Next.js 16 (TypeScript) ──
    ├── Dockerfile                    # Multi-stage build (node:20-alpine)
    ├── package.json                  # 4 deps + 7 devDeps
    ├── next.config.ts                # Standalone output, 57 redirects, prod validation
    ├── tsconfig.json, postcss.config.mjs, eslint.config.mjs
    └── src/
        ├── app/                      # App Router — 17 route directories + page.tsx root
        │   ├── layout.tsx            # Root layout (fonts, AuthProvider)
        │   ├── page.tsx              # S01: Landing Page (67KB — self-contained)
        │   ├── globals.css           # Global styles (38KB)
        │   ├── prototype.css         # Prototype styles (139KB)
        │   ├── auth/, about/, admin/, author/, contact/, discover/
        │   ├── forum/, home/, library/, membership/, notifications/
        │   ├── payment/, privacy/, profile/, settings/, stories/, terms/
        ├── components/
        │   ├── auth/RequireAuth.tsx
        │   ├── features/
        │   │   ├── admin/AdminScreens.tsx    (33KB)
        │   │   ├── author/AuthorScreens.tsx  (118KB — file lớn nhất)
        │   │   ├── reader/ReaderScreens.tsx  (136KB — file lớn nhất #2)
        │   │   └── info/InfoPage.tsx         (28KB)
        │   ├── layout/AppShell.tsx, ProductFooter.tsx
        │   ├── runtime/ClientInteractions.tsx
        │   └── ui/                   # 8 reusable UI primitives
        │       ├── BrandLogo, Charts, Cover, Feedback, Icon
        │       ├── Metrics, StoryCards, index.ts
        ├── data/yag.ts               # Screen/route metadata + types
        └── lib/                      # 7 shared utility files
            ├── api.ts, auth.ts, auth-context.tsx
            ├── env.ts, realtime.ts, mock-storage.ts, index.ts
```

---

## 2. Code Frontend

### 2.1 Kiến trúc

| Aspect | Chi tiết |
|---|---|
| **Framework** | Next.js 16.2.6, React 19.2.4, TypeScript 5 |
| **Styling** | TailwindCSS v4 + prototype.css (legacy 139KB) + globals.css (38KB) |
| **State Management** | React Context (`AuthProvider`) — không dùng Redux/Zustand |
| **API Client** | Custom `apiFetch()` wrapper trong `api.ts` |
| **Realtime** | Native WebSocket qua `realtime.ts` |
| **Routing** | App Router (17 route directories), 57 legacy redirect rules |

### 2.2 Cấu trúc component

- **Monolithic Feature Files**: 3 file component chính cực lớn:
  - `ReaderScreens.tsx` — **136KB** (tất cả screen reader: Home, Discover, Library, Story Detail, Reader Mode, Forum, Membership, Payment, Profile, Settings, Notifications)
  - `AuthorScreens.tsx` — **118KB** (Author Studio, Editor, Publish, Schedule)
  - `AdminScreens.tsx` — **33KB** (Dashboard, Moderation, Stats)

- **Page components** (`app/*/page.tsx`): Rất mỏng (100-600 bytes), chỉ import và wrap feature component + `RequireAuth`

- **UI Primitives** (`components/ui/`): 8 file nhỏ — BrandLogo, Charts, Cover, Feedback, Icon, Metrics, StoryCards

### 2.3 Data Flow Frontend → Backend

```
Frontend Page → Feature Component → yagApi.xxx() → apiFetch()
                                                     ↓
                                            resolveApiUrl(path)
                                                     ↓
                                            fetch(apiBaseUrl + path)
                                                     ↓
                                            Backend FastAPI /api/v1/*
```

- **Token**: Lưu `localStorage` + cookie `access_token`, gửi qua header `Authorization: Bearer <token>`
- **WebSocket**: `ws://apiBaseUrl/ws/stories/{id}/chapters/{id}` (draft autosave) và `ws://apiBaseUrl/ws/notifications/{userId}`

---

## 3. Code Backend

### 3.1 Kiến trúc

| Layer | Mô tả |
|---|---|
| **Entry point** | `main.py` — FastAPI app, CORS, lifespan, middleware, WebSocket routes |
| **API Layer** | `router.py` → 11 endpoint modules |
| **Dependencies** | `deps.py` — `get_db`, `get_current_user`, `require_role`, `check_premium_access` |
| **Services** | 12 service files — business logic tách biệt khỏi routes |
| **AI** | `gateway.py`, `orchestrator.py`, `tools.py`, `skills.py` |
| **Models** | 17 ORM files mapping 16 bảng PostgreSQL |
| **Schemas** | 16 Pydantic schema files |
| **Worker** | RabbitMQ consumer cho AI moderation pipeline |
| **Infra** | `config.py` (376 dòng, production validator mạnh), `database.py`, `security.py` |

### 3.2 API Endpoints Mapping

| Prefix | Module | Router |
|---|---|---|
| `/api/v1/auth` | `auth.py` | Register, Login, Reset PW, `/me` |
| `/api/v1/payment` + `/payments` | `payment.py` | PayOS checkout, webhook, verify, history |
| `/api/v1/membership` | `payment.membership_router` | Plans listing, membership status |
| `/api/v1/stories` | `stories.py` | CRUD stories, reviews, search, library |
| `/api/v1/chapters` | `chapters.py` | CRUD chapters, comments, WebSocket editor |
| `/api/v1/author/chapters` | `chapters.author_router` | Draft save, publish |
| `/api/v1/ai` | `ai.py` | AI suggestions, tools, MCP manifest |
| `/api/v1/admin` | `admin.py` | Moderation, stats, audit |
| `/api/v1/recommendations` | `recommendations.py` | AI recommendations |
| `/api/v1/notifications` | `notifications.py` | List, mark read |
| `/api/v1/internal/*` | `internal.py` | Pub/Sub moderation push, schedule scan |
| (publish routes) | `publish.py` | Chapter publish workflow |

### 3.3 Docker & Deployment

| Service | Role | Profile |
|---|---|---|
| `postgres` | pgvector/pgvector:pg16 | default |
| `redis` | redis:7-alpine | default |
| `rabbitmq` | rabbitmq:3.13-management-alpine | default |
| `migrate` | SERVICE_ROLE=migrate → apply SQL then exit | app, prod |
| `backend` | SERVICE_ROLE=api → Gunicorn + Uvicorn | app, prod |
| `scheduler` | SERVICE_ROLE=scheduler → cron jobs | app, prod |
| `moderation-worker` | SERVICE_ROLE=worker → RabbitMQ consumer | app, prod |
| `frontend` | Next.js standalone | app, prod |
| `nginx` | Reverse proxy + SSL | app, prod |

---

## 4. Code DB (Database)

### 4.1 Schema Overview — 16 bảng PostgreSQL

| Bảng | Columns chính | Quan hệ |
|---|---|---|
| `users` | id, username, email, password_hash, role, premium_until, is_locked | → profiles (1:1), → stories (1:N) |
| `profiles` | user_id (PK/FK), display_name, avatar_url, bio, reputation_score | ← users (1:1) |
| `stories` | id, author_id, title, description, cover_url, category, status, view_count, rating_avg | → chapters (1:N), → reviews (1:N) |
| `chapters` | id, story_id, chapter_number, title, content, moderation_status, is_premium, publish_at | → comments (1:N), → moderation_logs (1:1) |
| `story_embeddings` | story_id (PK/FK), embedding (vector 1536), plot_summary | Semantic search (pgvector cosine) |
| `comments` | id, chapter_id, user_id, content, parent_id | Self-referential (nested comments) |
| `reviews` | id, story_id, user_id, rating, content | FK → stories, users |
| `membership_plans` | id, name, code, price, duration_days | → transactions (1:N) |
| `transactions` | id, user_id, plan_id, amount, status, vnp_txn_ref | FK → users, membership_plans |
| `ai_moderation_logs` | id, chapter_id, is_violation, confidence_score, reason, model_name | FK → chapters (1:1) |
| `publish_schedules` | id, story_id, cadence, next_publish_at, is_active | FK → stories |
| `reading_histories` | user_id, chapter_id, read_at | FK → users, chapters |
| `libraries` | user_id, story_id | FK → users, stories (bookmarks) |
| `notifications` | id, user_id, type, title, body, is_read | FK → users |
| `admin_alerts` | id, alert_type, message, resolved | Standalone |
| `admin_audit_logs` | id, admin_id, action, target_type, target_id | Standalone |

### 4.2 Migration Files

| File | Nội dung |
|---|---|
| `V1__initial_schema.sql` | Schema gốc (22KB) — tất cả bảng, constraints, indexes |
| `V2__hotfix_users_lock_columns.sql` | Thêm `is_locked`, `lock_reason`, `locked_at` cho users |
| `V3__p1_schema_alignment.sql` | Căn chỉnh P1: admin_alerts, admin_audit_logs, notifications, story_metadata |
| `V4__init_membership_plans.sql` | Seed membership plans data |
| `V5__add_story_metadata.sql` | Thêm metadata columns cho stories |
| `V6__add_story_style_reference_fields.sql` | Thêm style reference fields cho AI |

### 4.3 ORM ↔ Migration Alignment

- Tất cả 16 model ORM trong `models/` kế thừa `Base` từ `database.py`
- Schema được quản lý bởi versioned SQL migrations — `AUTO_CREATE_TABLES` và `APPLY_MIGRATIONS_ON_STARTUP` đều **disabled** trong production
- Migration runner: `manage_migrations.py` chạy qua Docker `migrate` service

---

## 5. Sự Liên Kết Giữa Các Phần

### 5.1 Frontend ↔ Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend :3000                      │
│                    (fetch /api/v1/*, WebSocket /ws/*)           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx :80/:443                              │
│              (SSL termination, proxy_pass)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend :8000                           │
└───────┬──────────────────┬──────────────────┬───────────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
  PostgreSQL :5432    Redis :6379       RabbitMQ :5672
  (SQLAlchemy)        (redis-py)        (pika)
                                              │
                                              ▼
                                     Moderation Worker
                                              │
                                              ▼
                                     Google Gemini API
```

| Frontend API call (`yagApi.xxx`) | Backend endpoint | Service layer |
|---|---|---|
| `auth.login()` | `POST /api/v1/auth/login` | `auth_service.py` |
| `auth.register()` | `POST /api/v1/auth/register` | `auth_service.py` |
| `reader.listStories()` | `GET /api/v1/stories/` | `stories.py` endpoint |
| `reader.searchStories()` | `POST /api/v1/stories/search` | `ai_service.py` |
| `author.createStory()` | `POST /api/v1/stories/` | `stories.py` + `cloudinary_service.py` |
| `author.requestAiSuggestion()` | `POST /api/v1/ai/suggestions` | `ai_service.py` → `orchestrator.py` |
| `author.publishChapter()` | `POST /api/v1/author/chapters/{id}/publish` | `publish_service.py` → RabbitMQ |
| `billing.createPayosCheckout()` | `POST /api/v1/payments/payos/checkout` | `payos_service.py` |
| `admin.moderationQueue()` | `GET /api/v1/admin/moderation` | `admin_service.py` |
| `notifications.list()` | `GET /api/v1/notifications/` | `notification_service.py` |

### 5.2 Backend ↔ Database

- **ORM**: SQLAlchemy 2.0 declarative mapping, `SessionLocal` factory
- **Connection pool**: Configurable `DB_POOL_SIZE` (default 5), `DB_MAX_OVERFLOW` (10)
- **pgvector**: Extension cho `story_embeddings` bảng — cosine similarity search
- **View count**: Buffered trong Redis, flush vào PostgreSQL định kỳ (10 phút)

### 5.3 Backend ↔ External Services

| Service | Library | Mục đích |
|---|---|---|
| Gemini API | `google-genai` | AI suggestions, semantic search, moderation, recommendations |
| Cloudinary | `cloudinary` | Upload/serve ảnh bìa truyện, avatar |
| PayOS | Custom HTTP client | Thanh toán membership |
| RabbitMQ/Pub/Sub | `pika` / `google-cloud-pubsub` | Async moderation pipeline |
| SMTP | `smtplib` (stdlib) | Password reset OTP, schedule notifications |

### 5.4 Config Synchronization

- **Backend**: `config.py` — production validator rất mạnh (~200 dòng validation)
- **Frontend**: `env.ts` — production URL validation
- **Next.js**: `next.config.ts` — build-time production readiness checks
- **Docker**: `docker-compose.yml` — YAML anchors cho shared env

---

## 6. Code / File / Hàm Dư Thừa & Không Sử Dụng

### 6.1 🔴 Schemas Trùng Lặp (Nghiêm trọng)

> ⚠️ **WARNING**: Hai file schema `schemas/user.py` và `schemas/auth.py` chứa **các class trùng tên** nhưng **khác cấu trúc**. Điều này gây nhầm lẫn và tiềm ẩn bug.

| Class | `schemas/user.py` | `schemas/auth.py` | Ai dùng thực tế? |
|---|---|---|---|
| `UserResponse` | Có (L72) — dùng `alias="id"` | Có (L31) — dùng `id` trực tiếp | `auth.py` endpoint dùng bản ở `schemas/auth.py` |
| `UserLogin` | Có (L35) — `EmailStr` | Có (L43) — `str` (chấp nhận username) | `auth.py` endpoint dùng bản ở `schemas/auth.py` |
| `PasswordResetConfirm` | Có (L48) — cơ bản | Có (L61) — có alias, regex pattern | `auth.py` endpoint dùng bản ở `schemas/auth.py` |
| `PasswordChange` | Có (L58) — cơ bản | Có (L73) — có alias | Chưa rõ endpoint nào dùng bản nào |
| `TokenResponse` | Có (L97) — có `expires_in`, `UserInToken` | Có (L48) — có `accessToken` alias | `auth.py` endpoint dùng bản ở `schemas/auth.py` |
| `ProfileUpdate` | — | Có (L89) | Trùng với `schemas/profile.py` (L41) |
| `ProfileResponse` | — | Có (L94) | Trùng với `schemas/profile.py` (L18) — khác fields |

**Kết quả**: `schemas/user.py` chứa bản "spec gốc" nhưng **không được sử dụng trực tiếp** bởi bất kỳ endpoint nào. Tất cả endpoint auth import từ `schemas/auth.py`. Các class trong `schemas/user.py` chỉ được re-export qua `schemas/__init__.py`.

### 6.2 🟠 Schemas Không Được Sử Dụng Trong Endpoints

| Schema | File | Export | Dùng ở đâu? |
|---|---|---|---|
| `SearchResultItem` | `search.py` | ✅ `__init__.py` | ❌ Không endpoint nào import |
| `SearchResponse` | `search.py` | ✅ `__init__.py` | ❌ Không endpoint nào import |
| `SemanticSearchRequest` | `search.py` | ✅ `__init__.py` | ❌ Không endpoint nào import (endpoint dùng `AISemanticSearchRequest` từ `ai.py`) |
| `SemanticSearchResponse` | `search.py` | ✅ `__init__.py` | ❌ Không endpoint nào import (endpoint dùng `AISemanticSearchResponse` từ `ai.py`) |
| `SemanticSearchResultItem` | `search.py` | ✅ `__init__.py` | ❌ Chỉ dùng nội bộ trong `search.py` |
| `AISuggestRequest` | `ai.py` | ✅ `__init__.py` | ❌ Endpoint dùng `AISuggestionRequest` thay thế |
| `SuggestionItem` | `ai.py` | ✅ `__init__.py` | ❌ Endpoint dùng `AISuggestionItem` thay thế |
| `AISuggestResponse` | `ai.py` | ✅ `__init__.py` | ❌ Endpoint dùng `AISuggestionResponse` thay thế |
| `AIRecommendRequest` | `ai.py` | ✅ `__init__.py` | ❌ Endpoint recommendations không dùng request body |
| `AIRecommendResponse` | `ai.py` | ✅ `__init__.py` | ❌ Endpoint dùng `AIRecommendationResponse` thay thế |

> ℹ️ **NOTE**: File `schemas/search.py` **toàn bộ** không được sử dụng bởi bất kỳ endpoint/service nào (ngoại trừ re-export). Đây là phiên bản spec cũ, đã bị thay thế bởi các schema tương ứng trong `schemas/ai.py`.

### 6.3 🟠 Hàm `get_db()` Trùng Lặp

| Vị trí | Được dùng bởi |
|---|---|
| `core/database.py:30` | Chỉ `test_database_utils.py` (1 test) |
| `api/deps.py:20` | **Tất cả endpoints** qua `Depends(deps.get_db)` |

→ `database.py::get_db()` **dư thừa** vì tất cả production code dùng bản ở `deps.py`.

### 6.4 🟠 Hàm `decode_access_token()` Không Dùng Trong App

- Định nghĩa: `security.py:48`
- Chỉ được dùng trong `test_security_utils.py` (testing)
- App production decode JWT qua `jose.jwt.decode()` trực tiếp trong `deps.py`

### 6.5 🟡 Frontend: Exports Không Được Import

| Export | File | Status |
|---|---|---|
| `screenStaticSlugs` | `yag.ts:155` | ❌ Không file nào import |
| `getScreenId()` | `yag.ts:159` | ❌ Không file nào import |
| `screenRouteMap` | `yag.ts:100` | ❌ Chỉ dùng nội bộ bởi 2 hàm trên (cũng không dùng) |
| `stories: Story[]` | `yag.ts:157` | ❌ Exported empty array `[]`, import ở `ReaderScreens.tsx` nhưng luôn rỗng — dead code |
| `BarChart`, `LineChart` | `Charts.tsx` | ❌ Export qua `index.ts` nhưng **không file nào import** |

### 6.6 🟡 Dependency NPM Không Sử Dụng

| Package | Lý do |
|---|---|
| `socket.io-client` | Cài trong `package.json` nhưng **không import** ở bất kỳ file `.ts/.tsx` nào. Frontend dùng Native WebSocket API. |

### 6.7 🟡 Dependency Python Không Trực Tiếp Sử Dụng Trong App Code

| Package | Lý do |
|---|---|
| `passlib[bcrypt]` | Cài trong `requirements.txt` nhưng `security.py` dùng `bcrypt` trực tiếp, không import `passlib`. |

### 6.8 🟡 File `prototype.css` — Legacy Cực Lớn

- `prototype.css` — **139KB**
- Import trong `layout.tsx:12` (`import "./prototype.css"`)
- Đây là file CSS prototype legacy, load toàn bộ trên mọi page
- Cần audit xem CSS classes nào thực sự được dùng vs dead CSS

### 6.9 🟢 Code Hợp Lệ Nhưng Cần Lưu Ý

| Item | Chi tiết |
|---|---|
| `AIModerationLog` alias | Alias `AIModerationLog = AiModerationLog` ở `ai_moderation_log.py:59`. **Đang sử dụng** — `admin_service.py` và `moderation_service.py` import alias. Hợp lệ. |
| `require_author_role` alias | Alias `require_author_role = get_current_author` ở `deps.py:97`. **Đang sử dụng** bởi `ai.py` endpoint. Hợp lệ. |
| `reset_dev_db.py` | Utility script chạy thủ công. **Chỉ dùng local dev**. Hợp lệ. |
| `seed.py` | Dev data seeder. **Chỉ dùng local dev**. Hợp lệ. |
| `mock-storage.ts` | Quản lý mock data cho `useMocks` mode. Import trong `auth-context.tsx`. Hợp lệ. |
| `isLegacyDemoValue()`, `getStoredJsonArray()` | Cleanup functions trong `mock-storage.ts`. Import qua `lib/index.ts` re-export. Có thể unused nếu không có consumer bên ngoài lib. |
| `auth.py` (schemas) có `CurrentUserProfile`, `CurrentUserResponse` | Dùng thực tế bởi endpoint `/auth/me`. Hợp lệ. |

---

## 7. Tóm Tắt Recommendations

### Cần xử lý sớm (🔴)

1. **Hợp nhất `schemas/user.py` và `schemas/auth.py`**: Loại bỏ duplicates, chọn 1 bản chuẩn cho mỗi class
2. **Xóa toàn bộ `schemas/search.py`**: Thay thế hoàn toàn bởi schemas trong `schemas/ai.py`
3. **Xóa schema specs cũ**: `AISuggestRequest`, `SuggestionItem`, `AISuggestResponse`, `AIRecommendRequest`, `AIRecommendResponse` trong `schemas/ai.py` (chỉ giữ bản `AISuggestion*` và `AIRecommendation*`)

### Nên xử lý (🟠)

4. **Xóa `database.py::get_db()`**: Chỉ giữ bản ở `deps.py`
5. **Xóa hoặc đánh dấu `decode_access_token()`**: Chỉ dùng cho test
6. **Audit `prototype.css`**: 139KB CSS prototype — cần purge unused classes

### Nice-to-have (🟡)

7. **Xóa `socket.io-client`** từ `package.json` — unused dependency
8. **Xóa `passlib[bcrypt]`** từ `requirements.txt` — dùng `bcrypt` trực tiếp
9. **Cleanup `yag.ts`**: Xóa `screenStaticSlugs`, `getScreenId()`, `screenRouteMap`, `stories: Story[]`
10. **Xóa `Charts.tsx`**: `BarChart` và `LineChart` không được import ở đâu
11. **Tách file monolithic**: `ReaderScreens.tsx` (136KB) và `AuthorScreens.tsx` (118KB) nên chia nhỏ theo screen
