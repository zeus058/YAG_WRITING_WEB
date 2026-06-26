# AGENTS.md — YAG Writing Novels Web

> **Đọc file này trước tiên.** Đây là bản đồ kỹ thuật toàn bộ dự án YAG dành cho AI Agent.
> Khi nhận bất kỳ task nào, agent phải tham chiếu file này thay vì scan raw codebase.

---

## 1. Tổng quan dự án

**Tên:** YAG — Writing Novels Web  
**Loại:** Web Application — Nền tảng viết và đọc tiểu thuyết mạng tích hợp AI  
**Môn học:** Nhập môn Công nghệ Phần mềm — HCMUS, 2025-2026  
**GitHub:** https://github.com/zeus058/SE_Writing_Web

### Mục tiêu cốt lõi
- Hỗ trợ tác giả sáng tác với AI Sidebar (gợi ý tình tiết, biên tập văn phong)
- Độc giả tìm truyện qua ngôn ngữ tự nhiên (AI Semantic Search với pgvector)
- Kiểm duyệt nội dung tự động bằng Gemini API qua RabbitMQ pipeline
- Thanh toán Membership qua PayOS để đọc chương Premium

### Thành viên nhóm & phân công module
| Thành viên | Module chính | API prefix |
|---|---|---|
| Gia Hiển | F1 — Authentication | `/api/v1/auth` |
| Duy Trường | F2 — PayOS Payment & Membership | `/api/v1/payment`, `/api/v1/membership` |
| Hương Trà | F3 — AI Engine (Search, Suggest, Recommend) | `/api/v1/ai`, `/api/v1/recommendations` |
| Yến Nhi | F4 — Stories, Chapters, Editor | `/api/v1/stories`, `/api/v1/chapters` |
| Phú Thọ | F5 — Admin, Moderation | `/api/v1/admin` |

---

## 2. Tech Stack

| Layer | Technology | Version | Ghi chú |
|---|---|---|---|
| Frontend | Next.js (App Router) | 16.x | TypeScript, TailwindCSS v4 |
| UI Framework | React | 19.x | Server Components + Client Components |
| Backend | FastAPI | ≥0.110 | Modular Monolith, sẵn sàng tách Microservice |
| ASGI Server | Gunicorn + Uvicorn | ≥22.0 / ≥0.28 | Production: gunicorn với UvicornWorker |
| ORM | SQLAlchemy | ≥2.0 | Declarative mapping |
| Database | PostgreSQL | 16 | pgvector extension cho AI search |
| Cache | Redis | 7 (Alpine) | Session, view count, pub/sub cho WebSocket |
| Message Queue | RabbitMQ | 3.13 | Async AI moderation pipeline |
| AI Engine | Google Gemini API | gemini-1.5-flash | text-embedding-004 cho embeddings |
| Media CDN | Cloudinary | ≥1.41 | Lưu ảnh bìa truyện, avatar |
| Payment | PayOS API | — | Webhook callback & API status query |
| Reverse Proxy | Nginx | 1.27 (Alpine) | SSL termination, Rate Limiting, Anti-crawling |
| Scheduler | APScheduler | ≥3.10 | Cron jobs cho schedule scan, view count flush |
| Containerization | Docker | Multi-stage builds | Separate images cho frontend & backend |
| CI/CD | GitHub Actions | — | Lint → Test → Build → Deploy |
| Realtime | WebSocket (native) | — | Autosave, Notifications, Comments |

### Python Dependencies chính (`requirements.txt`)
```
fastapi, gunicorn, uvicorn, sqlalchemy, psycopg2-binary, pgvector,
pydantic, pydantic-settings, python-jose (JWT), passlib[bcrypt],
python-multipart, redis, pika (RabbitMQ), apscheduler,
pytest, httpx, email-validator, cloudinary, google-genai
```

### Frontend Dependencies chính (`package.json`)
```
next@16.x, react@19.x, react-dom@19.x, socket.io-client@4.x
tailwindcss@4.x (devDep), typescript@5.x (devDep)
```

---

## 3. Cấu trúc thư mục repo (Thực tế)

```
SE_Writing_Web/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD pipeline
├── nginx/
│   ├── nginx.conf                    # Reverse proxy config (SSL, rate limiting)
│   └── certs/                        # SSL certificates (mounted read-only)
│       ├── fullchain.pem
│       └── privkey.pem
├── src/
│   ├── frontend/                     # ── Next.js App ──
│   │   ├── Dockerfile                # Multi-stage: deps → builder → runtime (node:20-alpine)
│   │   ├── .env.example              # Template biến môi trường frontend
│   │   ├── package.json
│   │   ├── next.config.ts            # Next.js config (standalone output)
│   │   ├── tsconfig.json
│   │   ├── postcss.config.mjs        # TailwindCSS PostCSS plugin
│   │   ├── eslint.config.mjs
│   │   └── src/
│   │       ├── app/                  # App Router — 21 screens
│   │       │   ├── layout.tsx        # Root layout (metadata, fonts)
│   │       │   ├── page.tsx          # S01: Landing Page
│   │       │   ├── globals.css       # Global styles + TailwindCSS
│   │       │   ├── prototype.css     # Prototype styles
│   │       │   ├── auth/             # S02: Đăng nhập/Đăng ký
│   │       │   ├── about/            # Giới thiệu
│   │       │   ├── admin/            # S19-S21: Admin Dashboard, Moderation, Stats
│   │       │   ├── author/           # S15-S18: Author Studio, Publish, Schedule
│   │       │   ├── contact/          # Liên hệ
│   │       │   ├── discover/         # S05: Khám phá & Tìm kiếm
│   │       │   ├── forum/            # S08: Diễn đàn
│   │       │   ├── home/             # S04: Home Feed
│   │       │   ├── library/          # S11: Thư viện cá nhân
│   │       │   ├── membership/       # S09: Membership
│   │       │   ├── notifications/    # S14: Trung tâm thông báo
│   │       │   ├── payment/          # S10: Kết quả thanh toán
│   │       │   ├── privacy/          # Chính sách bảo mật
│   │       │   ├── profile/          # S12: Hồ sơ cá nhân
│   │       │   ├── settings/         # S13: Cài đặt tài khoản
│   │       │   ├── stories/          # S06-S07: Chi tiết truyện, Reader Mode
│   │       │   └── terms/            # Điều khoản sử dụng
│   │       ├── components/           # React components
│   │       │   ├── auth/             # AuthGuard, LoginForm, RegisterForm
│   │       │   ├── features/         # Domain-specific components
│   │       │   ├── layout/           # Navbar, Footer, Sidebar
│   │       │   ├── runtime/          # Runtime utilities
│   │       │   └── ui/               # Reusable UI primitives (Button, Modal, Card...)
│   │       ├── data/                 # Mock data / JSON metadata
│   │       └── lib/                  # Shared utilities
│   │           ├── api.ts            # HTTP client (fetch wrapper, interceptors)
│   │           ├── auth.ts           # JWT token helpers
│   │           ├── auth-context.tsx  # React AuthContext provider
│   │           ├── env.ts            # Environment config (NEXT_PUBLIC_*)
│   │           ├── realtime.ts       # WebSocket connection manager
│   │           └── index.ts          # Re-exports
│   └── backend/                      # ── FastAPI App ──
│       ├── Dockerfile                # Multi-stage: builder → runtime (python:3.11-slim)
│       ├── .env.example              # Template biến môi trường backend (70 vars)
│       ├── requirements.txt          # Python dependencies
│       ├── worker.py                 # Entry point cho RabbitMQ worker container
│       ├── migrations/               # Versioned SQL migrations
│       │   ├── V1__initial_schema.sql
│       │   ├── V2__hotfix_users_lock_columns.sql
│       │   └── V3__p1_schema_alignment.sql
│       ├── uploads/                  # Local file uploads (dev only, .gitignored)
│       ├── tests/                    # pytest test suite
│       │   ├── test_auth.py
│       │   ├── test_database.py
│       │   ├── test_payment.py
│       │   ├── test_moderation.py
│       │   ├── test_publish.py
│       │   ├── test_admin.py
│       │   ├── test_ai_search_and_recommendations.py
│       │   ├── test_ai_suggestions.py
│       │   ├── test_membership.py
│       │   ├── test_notifications.py
│       │   ├── test_profile.py
│       │   ├── test_schedule.py
│       │   ├── test_role_separation.py
│       │   └── test_main.py
│       └── app/                      # FastAPI application package
│           ├── __init__.py
│           ├── main.py               # FastAPI entry point, lifespan, middleware, WebSocket routes
│           ├── manage_migrations.py  # Versioned SQL migration runner
│           ├── seed.py               # Database seeder (dev data)
│           ├── reset_dev_db.py       # Dev DB reset utility
│           ├── api/                  # Route handlers
│           │   ├── deps.py           # Dependency injection (get_db, get_current_user, role checks)
│           │   └── v1/
│           │       ├── router.py     # API router hub — registers all endpoint modules
│           │       └── endpoints/
│           │           ├── auth.py           # F1: Register, Login, Reset Password
│           │           ├── stories.py        # F4: CRUD Stories, Chapters listing, Reviews
│           │           ├── chapters.py       # F4: CRUD Chapters, Comments, Autosave WS, Search
│           │           ├── payment.py        # F2: PayOS checkout, webhook, Membership plans
│           │           ├── ai.py             # F3: AI suggestions, tools, MCP manifest
│           │           ├── recommendations.py # F3: AI recommendations
│           │           ├── admin.py          # F5: Moderation queue, Stats, User/Story management
│           │           ├── publish.py        # Publishing: submit chapter for moderation
│           │           └── notifications.py  # Notification listing, mark read
│           ├── ai/                   # Gemini agent core
│           │   ├── gateway.py        # Shared Gemini REST adapter, retries, JSON parsing, embeddings
│           │   ├── tools.py          # Typed internal tools + MCP-compatible manifest
│           │   ├── skills.py         # writing_coach, recommendation_curator, safety_moderator prompts
│           │   └── orchestrator.py   # Writing agent + recommendation reranker
│           ├── core/                 # Infrastructure
│           │   ├── config.py         # Pydantic Settings + production validator
│           │   ├── database.py       # SQLAlchemy engine & SessionLocal factory
│           │   └── security.py       # JWT encode/decode, Bcrypt hash/verify
│           ├── models/               # SQLAlchemy ORM models (16 models)
│           │   ├── user.py           # User
│           │   ├── profile.py        # Profile
│           │   ├── story.py          # Story
│           │   ├── chapter.py        # Chapter
│           │   ├── story_embedding.py # StoryEmbedding (pgvector)
│           │   ├── comment.py        # Comment
│           │   ├── review.py         # Review
│           │   ├── membership_plan.py # MembershipPlan
│           │   ├── transaction.py    # Transaction
│           │   ├── ai_moderation_log.py # AIModerationLog
│           │   ├── publish_schedule.py # PublishSchedule
│           │   ├── reading_history.py # ReadingHistory
│           │   ├── library.py        # Library (bookmark)
│           │   ├── notification.py   # Notification (NEW)
│           │   ├── admin_alert.py    # AdminAlert (NEW)
│           │   └── admin_audit_log.py # AdminAuditLog (NEW)
│           ├── schemas/              # Pydantic request/response schemas
│           │   ├── auth.py, user.py, profile.py
│           │   ├── story.py, chapter.py, comment.py, review.py
│           │   ├── search.py, ai.py
│           │   ├── membership.py, payment.py
│           │   ├── publish.py, admin.py, notification.py
│           │   └── common.py         # Shared schemas (pagination, error responses)
│           ├── services/             # Business logic layer
│           │   ├── auth_service.py   # Register, login, password reset, profile CRUD
│           │   ├── ai_service.py     # AI service facade: suggestions, search, recommendations, embeddings
│           │   ├── moderation_service.py # Layered AI moderation logic
│           │   ├── payos_service.py   # PayOS payment processing and verification
│           │   ├── membership_service.py # Membership plan queries
│           │   ├── publish_service.py # Chapter publish → RabbitMQ, connection factory
│           │   ├── schedule_service.py # APScheduler cron: schedule scan, reminders
│           │   ├── notification_service.py # Create, stream, mark-read notifications
│           │   ├── admin_service.py  # Admin dashboard, moderation queue, audit logs
│           │   ├── cloudinary_service.py # Image upload to Cloudinary
│           │   └── media_service.py  # Local media serving (dev fallback)
│           └── worker/               # RabbitMQ Background Worker
│               ├── __init__.py
│               └── main.py           # Consumer: moderation → Gemini → update DB → notify
├── docs/
│   ├── fix/                          # Bug fix documentation
│   └── task/                         # Task documentation
├── docker-compose.yml                # Full orchestration (6 services + 3 profiles)
├── .gitignore
├── README.md
└── AGENTS.md                         # ← File này
```

---

## 4. Kiến trúc Docker & Container

### 4.1. Docker Compose Profiles

File `docker-compose.yml` sử dụng **Docker Compose profiles** để tách biệt môi trường:

| Profile | Services khởi chạy | Mục đích |
|---|---|---|
| *(default — không profile)* | `postgres`, `redis`, `rabbitmq` | Local dev: chỉ chạy infrastructure, app chạy native |
| `app` | Tất cả 7 services | Full-stack local testing trong Docker |
| `prod` | Tất cả 7 services | Production deployment |

```bash
# Chỉ infrastructure (dev mode — chạy backend/frontend bằng terminal)
docker-compose up -d

# Full-stack trong Docker
docker-compose --profile app up -d

# Production
docker-compose --profile prod up -d
```

### 4.2. Service Map (7 services)

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (:80/:443)                        │
│  SSL termination · Rate Limiting · Reverse Proxy               │
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│  /api/*, /ws/*  ─────┤──────▶  BACKEND (:8000)                 │
│                      │         FastAPI + Gunicorn/Uvicorn       │
│                      │         SERVICE_ROLE=api                 │
│  /*  ────────────────┤──────▶  FRONTEND (:3000)                │
│                      │         Next.js standalone               │
│                      │                                          │
└──────────────────────┴──────────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────┐
       │                           │                         │
       ▼                           ▼                         ▼
  POSTGRESQL (:5432)          REDIS (:6379)           RABBITMQ (:5672)
  pgvector/pgvector:pg16      redis:7-alpine          rabbitmq:3.13-alpine
  Data: postgres_data         Data: redis_data         Data: rabbitmq_data
                                                            │
                                                            ▼
                                                   MODERATION-WORKER
                                                   SERVICE_ROLE=worker
                                                   (same Docker image as backend)
                                                            │
                                                   MIGRATE (init container)
                                                   SERVICE_ROLE=migrate
                                                   (runs once, then exits)
```

### 4.3. SERVICE_ROLE — Phân vai container

Backend sử dụng **cùng một Docker image** nhưng phân biệt behavior qua biến `SERVICE_ROLE`:

| Role | Command | Chức năng |
|---|---|---|
| `api` | `gunicorn app.main:app -k uvicorn.workers.UvicornWorker` | API server chính |
| `worker` | `python worker.py` | RabbitMQ consumer (moderation) |
| `migrate` | `python -m app.manage_migrations` | Apply SQL migrations rồi exit |
| `scheduler` | (reserved) | Cron jobs riêng biệt (future) |

> **Thứ tự khởi chạy:** `postgres` (healthy) → `migrate` (completed) → `backend` + `moderation-worker` + `frontend` → `nginx`

### 4.4. Dockerfile — Backend (Multi-stage)

```dockerfile
# Stage 1: Builder — cài dependencies
FROM python:3.11-slim AS builder
# Stage 2: Runtime — copy site-packages + source code
FROM python:3.11-slim AS runtime
# Non-root user: appuser
# HEALTHCHECK: /health/live (cho api), skip cho worker/migrate
# CMD: phân nhánh theo SERVICE_ROLE
```

### 4.5. Dockerfile — Frontend (Multi-stage)

```dockerfile
# Stage 1: deps — npm ci (production only)
FROM node:20-alpine AS deps
# Stage 2: builder — npm ci (full) + next build
FROM node:20-alpine AS builder
# Build-time args: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_WS_BASE_URL
# Stage 3: runtime — standalone output
FROM node:20-alpine AS runtime
# Non-root user: nextjs:nodejs
# CMD: node server.js
```

> **Quan trọng:** Biến `NEXT_PUBLIC_*` được inject lúc **build time** (Docker build args), không phải runtime. Thay đổi URL production cần **rebuild image**.

---

## 5. Database Schema — 16 bảng PostgreSQL

> Tất cả bảng dùng UUID làm PK. Timestamps: `created_at`, `updated_at` DEFAULT NOW().
> Schema được quản lý bởi versioned SQL migrations (xem mục 6).

### 5.1. Sơ đồ quan hệ nhanh

```
users (1) ──────── (1) profiles
users (1) ──────── (N) stories              [author_id → users.id]
users (1) ──────── (N) notifications        [user_id → users.id]
stories (1) ─────── (N) chapters            [story_id → stories.id]
stories (1) ─────── (1) story_embeddings    [story_id → stories.id]
stories (1) ─────── (N) reviews             [story_id → stories.id]
stories (1) ─────── (N) publish_schedules   [story_id → stories.id]
chapters (1) ──────── (N) comments          [chapter_id → chapters.id]
chapters (1) ──────── (N) ai_moderation_logs [chapter_id → chapters.id]
comments (N) ──────── (1) comments          [parent_id → comments.id] (self-ref)
users (N) ─────── (N) stories               via libraries (bookmarks)
users (N) ─────── (N) chapters              via reading_histories
users (1) ──────── (N) transactions         [user_id → users.id]
membership_plans (1) ── (N) transactions    [plan_id → membership_plans.id]
admin_alerts (standalone)                   [Cảnh báo admin]
admin_audit_logs (standalone)               [Nhật ký hành động admin]
```

### 5.2. Đặc tả chi tiết từng bảng

#### `users` — Tài khoản & phân quyền
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Định danh tài khoản |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | Tên đăng nhập |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | Email xác thực |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hash |
| `role` | VARCHAR(20) | IN ('admin','author','reader') | Phân quyền RBAC |
| `premium_until` | TIMESTAMP | NULLABLE | Hạn Membership (null = chưa đăng ký) |

#### `profiles` — Hồ sơ chi tiết
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `user_id` | UUID | PK, FK → users.id, CASCADE | 1-1 với users |
| `display_name` | VARCHAR(100) | NOT NULL | Bút danh hiển thị |
| `avatar_url` | VARCHAR(255) | NULL | URL Cloudinary |
| `bio` | TEXT | NULL | Giới thiệu bản thân |
| `reputation_score` | INTEGER | DEFAULT 100, 0-100 | Điểm uy tín tác giả (trừ khi trễ lịch) |

#### `stories` — Tác phẩm
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `author_id` | UUID | FK → users.id, CASCADE | |
| `title` | VARCHAR(255) | NOT NULL, UNIQUE | |
| `description` | TEXT | NOT NULL | Tóm tắt cốt truyện |
| `cover_url` | VARCHAR(255) | NULL | Cloudinary URL |
| `category` | VARCHAR(50) | NOT NULL | Thể loại (Kiếm hiệp, Kỳ ảo...) |
| `status` | VARCHAR(20) | IN ('ongoing','completed','paused') | |
| `view_count` | INTEGER | DEFAULT 0 | Đồng bộ từ Redis định kỳ |
| `rating_avg` | DECIMAL(3,2) | DEFAULT 0.00, 0-5 | Tính từ bảng reviews |

#### `chapters` — Chương truyện
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `story_id` | UUID | FK → stories.id, CASCADE | |
| `chapter_number` | INTEGER | NOT NULL, > 0 | Số thứ tự |
| `title` | VARCHAR(255) | NOT NULL | |
| `content` | TEXT | NOT NULL | Nội dung chương |
| `moderation_status` | VARCHAR(20) | IN ('pending','approved','rejected','flagged') | Trạng thái kiểm duyệt AI |
| `is_premium` | BOOLEAN | DEFAULT FALSE | TRUE = cần Membership |
| `publish_at` | TIMESTAMP | DEFAULT NOW() | Giờ công bố |

#### `story_embeddings` — Vector AI Search (pgvector)
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `story_id` | UUID | PK, FK → stories.id | |
| `embedding` | vector(1536) | NOT NULL | Gemini text-embedding-004 |
| `plot_summary` | TEXT | NOT NULL | Tóm tắt đã vector hóa |

> **Quan trọng:** Dùng Cosine Similarity (`<=>`) để semantic search. Index: `CREATE INDEX ON story_embeddings USING ivfflat (embedding vector_cosine_ops)`.

#### `comments` — Bình luận
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `chapter_id` | UUID | FK → chapters.id |
| `content` | TEXT | NOT NULL |
| `parent_id` | UUID | FK → comments.id, NULLABLE (self-ref cho reply) |

#### `reviews` — Đánh giá tác phẩm
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `story_id` | UUID | FK → stories.id |
| `rating` | INTEGER | 1-5 sao, UNIQUE (user_id, story_id) |
| `content` | TEXT | NULLABLE |

#### `membership_plans` — Gói hội viên
| Column | Type | Mô tả |
|---|---|---|
| `id` | VARCHAR(30) | PK (VD: 'MONTHLY', 'YEARLY') |
| `name` | VARCHAR(100) | Tên hiển thị |
| `duration_days` | INTEGER | Số ngày hiệu lực |
| `price` | DECIMAL(12,2) | Đơn vị VND |

#### `transactions` — Lịch sử thanh toán PayOS
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id, ON DELETE SET NULL |
| `plan_id` | VARCHAR(30) | FK → membership_plans.id |
| `amount` | DECIMAL(12,2) | > 0 |
| `vnp_txn_ref` | VARCHAR(100) | UNIQUE, mã tham chiếu gửi sang PayOS (orderCode) |
| `vnp_transaction_no` | VARCHAR(100) | UNIQUE NULLABLE, mã giao dịch của PayOS |
| `status` | VARCHAR(20) | IN ('pending','success','failed') |

#### `ai_moderation_logs` — Nhật ký kiểm duyệt
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `chapter_id` | UUID | FK → chapters.id |
| `is_violation` | BOOLEAN | NOT NULL |
| `violation_category` | VARCHAR(50) | NULLABLE (NSFW, bạo lực...) |
| `confidence_score` | FLOAT | 0.0-1.0 |
| `reason` | TEXT | NULLABLE, trích dẫn vi phạm |

#### `publish_schedules` — Lịch đăng chương
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `story_id` | UUID | FK → stories.id |
| `scheduled_time` | TIMESTAMP | NOT NULL |
| `status` | VARCHAR(20) | IN ('scheduled','published','missed') |

#### `reading_histories` — Lịch sử đọc
| Column | Type | Mô tả |
|---|---|---|
| `user_id` | UUID | PK, FK → users.id |
| `chapter_id` | UUID | PK, FK → chapters.id |
| `read_at` | TIMESTAMP | DEFAULT NOW() |

#### `libraries` — Thư viện cá nhân (bookmarks)
| Column | Type | Mô tả |
|---|---|---|
| `user_id` | UUID | PK, FK → users.id |
| `story_id` | UUID | PK, FK → stories.id |
| `bookmarked_at` | TIMESTAMP | DEFAULT NOW() |

#### `notifications` — Thông báo người dùng *(MỚI)*
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `type` | VARCHAR(50) | Loại thông báo (chapter_moderation_result, schedule_reminder...) |
| `title` | VARCHAR(255) | Tiêu đề |
| `message` | TEXT | Nội dung |
| `payload` | JSONB | NULLABLE, dữ liệu bổ sung |
| `is_read` | BOOLEAN | DEFAULT FALSE |

#### `admin_alerts` — Cảnh báo admin *(MỚI)*
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `type` | VARCHAR(50) | Loại cảnh báo |
| `title` | VARCHAR(255) | Tiêu đề |
| `message` | TEXT | Chi tiết |
| `severity` | VARCHAR(20) | Mức độ (info, warning, critical) |
| `is_resolved` | BOOLEAN | DEFAULT FALSE |

#### `admin_audit_logs` — Nhật ký hành động admin *(MỚI)*
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `admin_id` | UUID | FK → users.id |
| `action` | VARCHAR(100) | Hành động (approve_chapter, reject_chapter, ban_user...) |
| `target_type` | VARCHAR(50) | Đối tượng (chapter, user, story) |
| `target_id` | UUID | ID đối tượng |
| `details` | JSONB | NULLABLE, chi tiết hành động |

#### `schema_migrations` — Migration tracking *(hệ thống)*
| Column | Type | Mô tả |
|---|---|---|
| `version` | VARCHAR(100) | PK (VD: 'V1', 'V2') |
| `filename` | VARCHAR(255) | Tên file SQL |
| `checksum` | VARCHAR(64) | SHA-256 của nội dung SQL |
| `applied_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

## 6. Hệ thống Migration

### 6.1. Cơ chế hoạt động

YAG sử dụng **versioned SQL migration** tự xây (không dùng Alembic) tại `app/manage_migrations.py`:

1. Quét thư mục `migrations/` tìm file `*.sql`, sắp xếp theo tên
2. So sánh với bảng `schema_migrations` trong DB
3. File chưa apply → execute SQL → ghi checksum vào `schema_migrations`
4. File đã apply nhưng checksum khác → **FAIL** (không cho sửa migration đã apply)

### 6.2. Quy tắc viết migration

```bash
# Naming convention: V{number}__{description}.sql
migrations/
├── V1__initial_schema.sql              # Schema ban đầu (21KB)
├── V2__hotfix_users_lock_columns.sql   # Hotfix
├── V3__p1_schema_alignment.sql         # Phase 1 alignment
└── V4__add_new_feature.sql             # ← Thêm migration mới ở đây
```

**Rules:**
- **KHÔNG BAO GIỜ** sửa file migration đã apply (checksum mismatch → crash)
- Luôn tạo file MỚI cho thay đổi schema
- File phải idempotent khi có thể (dùng `IF NOT EXISTS`, `IF EXISTS`)
- Prefix `V{N}__` để đảm bảo thứ tự apply

### 6.3. Commands

```bash
# Apply migrations (dùng trong CI/CD và docker-compose migrate service)
python -m app.manage_migrations

# Kiểm tra có migration pending không (dùng trong CI check)
python -m app.manage_migrations --check
```

---

## 7. Biến môi trường (Environment Variables)

### 7.1. Backend (`.env` — 70+ biến)

#### Application
| Biến | Default | Production | Mô tả |
|---|---|---|---|
| `ENVIRONMENT` | `development` | `production` | Bật production validators |
| `SERVICE_ROLE` | `api` | `api`/`worker`/`migrate`/`scheduler` | Phân vai container |
| `SECRET_KEY` | `yag_development_...` | **BẮT BUỘC thay đổi** | JWT signing key |
| `API_V1_STR` | `/api/v1` | `/api/v1` | API prefix |
| `CORS_ORIGINS` | `http://localhost:3000` | **HTTPS domain** | Comma-separated origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | `60` | JWT expiry |
| `ALLOW_WEBSOCKET_QUERY_TOKEN` | `true` | **`false`** (bắt buộc) | Cho phép token qua query param |

#### Database
| Biến | Default | Mô tả |
|---|---|---|
| `DATABASE_URL` | *(auto-build từ components)* | Connection string đầy đủ (ưu tiên hơn components) |
| `POSTGRES_SERVER` | `localhost` | Host |
| `POSTGRES_USER` | `postgres` | User |
| `POSTGRES_PASSWORD` | `postgres` | Password |
| `POSTGRES_DB` | `yag` | Database name |
| `DB_POOL_SIZE` | `5` | Connection pool |
| `DB_MAX_OVERFLOW` | `10` | Max overflow connections |
| `DB_POOL_TIMEOUT` | `30` | Pool timeout (seconds) |
| `DB_POOL_RECYCLE_SECONDS` | `1800` | Connection recycle interval |

#### Redis
| Biến | Default | Mô tả |
|---|---|---|
| `REDIS_URL` | *(auto-build)* | Full URL (ưu tiên). Production: `rediss://...` (TLS) |
| `REDIS_HOST` | `localhost` | Host |
| `REDIS_PORT` | `6379` | Port |

#### RabbitMQ
| Biến | Default | Mô tả |
|---|---|---|
| `RABBITMQ_URL` | *(auto-build)* | Full URL. Production: `amqps://...` (TLS) |
| `RABBITMQ_HOST` | `localhost` | Host |
| `RABBITMQ_PORT` | `5672` | Port |
| `RABBITMQ_USER` | `guest` | User |
| `RABBITMQ_PASSWORD` | `guest` | Password |
| `RABBITMQ_MODERATION_QUEUE` | `ai.moderation` | Queue chính |
| `RABBITMQ_MODERATION_RETRY_QUEUE` | `ai.moderation.retry` | Retry queue (TTL 60s) |
| `RABBITMQ_MODERATION_DLQ` | `ai.moderation.dlq` | Dead letter queue |
| `RABBITMQ_MODERATION_MAX_RETRIES` | `5` | Max retries trước khi vào DLQ |

#### AI Engine
| Biến | Default | Mô tả |
|---|---|---|
| `GEMINI_API_KEY` | *(empty)* | **BẮT BUỘC** cho AI features |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Model cho suggest/moderate |
| `GEMINI_EMBEDDING_MODEL` | `text-embedding-004` | Model cho embeddings |
| `GEMINI_MAX_OUTPUT_TOKENS` | `1024` | Max output tokens |
| `GEMINI_TIMEOUT_SECONDS` | `10.0` | API timeout |
| `AI_CONTEXT_WORD_LIMIT` | `1000` | Giới hạn context cho AI suggest |

#### Cloudinary
| Biến | Default | Mô tả |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | — | **BẮT BUỘC** production |
| `CLOUDINARY_API_KEY` | — | **BẮT BUỘC** production |
| `CLOUDINARY_API_SECRET` | — | **BẮT BUỘC** production |
| `CLOUDINARY_COVER_FOLDER` | `yag/covers` | Folder trên Cloudinary |

#### PayOS
| Biến | Default | Mô tả |
|---|---|---|
| `PAYOS_CLIENT_ID` | — | Client ID do PayOS cấp |
| `PAYOS_API_KEY` | — | API Key do PayOS cấp |
| `PAYOS_CHECKSUM_KEY` | — | Checksum Key do PayOS cấp |
| `PAYOS_RETURN_URL` | `http://localhost:3000/payment/result` | Return URL. Production: **HTTPS** |

#### Background Jobs
| Biến | Default | Mô tả |
|---|---|---|
| `SCHEDULER_ENABLED` | `false` | Bật schedule scan cron |
| `SCHEDULE_SCAN_HOUR_UTC` | `17` | Giờ quét schedule (UTC) |
| `SCHEDULE_SCAN_MINUTE_UTC` | `5` | Phút quét schedule |
| `VIEW_COUNT_FLUSH_ENABLED` | `false` | Bật flush view count Redis → PG |
| `AUTO_CREATE_TABLES` | `false` | **KHÔNG bật** cho production |
| `APPLY_MIGRATIONS_ON_STARTUP` | `false` | **KHÔNG bật** cho production |

### 7.2. Frontend (`.env`)

| Biến | Default | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Frontend public URL |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `NEXT_PUBLIC_WS_BASE_URL` | `ws://localhost:8000` | WebSocket URL |
| `NEXT_PUBLIC_DEPLOY_ENV` | `development` | Environment tag |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | `12000` | API request timeout |
| `NEXT_PUBLIC_USE_MOCKS` | `false` | Mock mode (UI demo without backend) |

> **⚠ QUAN TRỌNG:** Tất cả biến `NEXT_PUBLIC_*` được inject lúc **build time** vào JavaScript bundle. Khi deploy Docker, chúng phải được truyền qua Docker build args, KHÔNG phải runtime env.

### 7.3. Docker Compose Variables

Các biến dùng trong `docker-compose.yml` (truyền qua `.env` tại root hoặc shell):

| Biến | Default | Mô tả |
|---|---|---|
| `POSTGRES_PORT` | `5432` | Host port cho PostgreSQL |
| `POSTGRES_USER` | `yag_user` | DB user |
| `POSTGRES_PASSWORD` | `yag_secret` | DB password |
| `POSTGRES_DB` | `yag_db` | DB name |
| `REDIS_PORT` | `6379` | Host port cho Redis |
| `REDIS_PASSWORD` | *(empty)* | Redis password |
| `RABBITMQ_PORT` | `5672` | Host port cho RabbitMQ |
| `RABBITMQ_DASHBOARD_PORT` | `15672` | RabbitMQ Management UI |
| `RABBITMQ_USER` | `yag_mq` | RabbitMQ user |
| `RABBITMQ_PASSWORD` | `yag_mq_secret` | RabbitMQ password |
| `NGINX_HTTP_PORT` | `80` | Nginx HTTP port |
| `NGINX_HTTPS_PORT` | `443` | Nginx HTTPS port |
| `FRONTEND_PUBLIC_URL` | `http://localhost` | Next.js public URL (build arg) |
| `API_PUBLIC_URL` | `http://localhost/api` | API public URL (build arg) |
| `WS_PUBLIC_URL` | `ws://localhost/ws` | WebSocket public URL (build arg) |

---

## 8. Production Safeguards (config.py validator)

Khi `ENVIRONMENT=production`, class `Settings` tự động validate và **từ chối khởi chạy** nếu:

| Check | Mô tả |
|---|---|
| `SECRET_KEY` = default | JWT secret chưa thay đổi |
| `PAYOS_CLIENT_ID` = None | PayOS client ID chưa cấu hình |
| `PAYOS_API_KEY` = None | PayOS API Key chưa cấu hình |
| Missing essential URIs | `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `GEMINI_API_KEY` phải có |
| Missing Cloudinary config | 3 biến Cloudinary phải có |
| `ALLOW_WEBSOCKET_QUERY_TOKEN` = true | Phải tắt trong production |
| `AUTO_CREATE_TABLES` = true | Không cho auto-create schema |
| `APPLY_MIGRATIONS_ON_STARTUP` = true | Không cho auto-migrate |
| `SCHEDULER_ENABLED` = true + role=api | Scheduler phải chạy riêng, không cùng API |
| `DATABASE_URL` → localhost | DB không được local |
| `REDIS_URL` → localhost | Redis không được local |
| `RABBITMQ_URL` → localhost | RabbitMQ không được local |
| `PAYOS_RETURN_URL` → localhost | Return URL phải remote |
| `PAYOS_RETURN_URL` không HTTPS | Phải HTTPS |
| `CORS_ORIGINS` chứa `*` hoặc localhost | Phải explicit HTTPS origins |
| `CORS_ORIGINS` không HTTPS | Tất cả origins phải HTTPS |

---

## 9. Luồng nghiệp vụ quan trọng (Business Flows)

### 9.1. Luồng xuất bản chương & kiểm duyệt AI (U005 → U013)

```
[Author nhấn "Xuất bản" trên S17]
        │
        ▼
[FastAPI] POST /api/v1/chapters/{story_id}/chapters/{chapter_id}/publish
        │  → Lưu chapter với moderation_status = 'pending'
        │  → Trả HTTP 202 NGAY (< 500ms, không chờ AI)
        │
        ▼
[RabbitMQ] Queue: ai.moderation
        │  → Push message: { task_type: "publish_chapter", chapter_id, content, requested_by }
        │
        ▼
[Background Worker: worker/main.py]
        │  → Gọi Gemini API (moderate_content → phân tích NSFW, bạo lực)
        │  → Nếu APPROVED:
        │       - UPDATE chapters SET moderation_status='approved'
        │       - Gọi Gemini Embeddings API → vector(1536)
        │       - UPSERT story_embeddings (sync_story_embedding)
        │       - INSERT ai_moderation_logs (is_violation=false)
        │       - INSERT notifications (user_id=author, type=chapter_moderation_result)
        │  → Nếu REJECTED/FLAGGED:
        │       - UPDATE chapters SET moderation_status='rejected'/'flagged'
        │       - INSERT ai_moderation_logs (is_violation=true, reason=...)
        │       - INSERT notifications
        │       - Đẩy lên Admin Dashboard (U015)
        │  → Nếu ERROR (Gemini 429/timeout):
        │       - Push vào retry queue (TTL 60s → tự quay lại main queue)
        │       - Max 5 retries → Dead Letter Queue (DLQ)
        │
        ▼
[WebSocket /ws/notifications/{user_id}] → Push real-time notification cho Author

⚠ Queue topology:
   ai.moderation ← main consumer
   ai.moderation.retry ← TTL 60s, dead-letter back to ai.moderation
   ai.moderation.dlq ← after 5 retries, manual inspection required
```

### 9.2. Luồng AI Semantic Search (U008)

```
[Reader nhập mô tả trên S05] "nam chính là hacker"
        │
        ▼
[FastAPI] POST /api/v1/search/semantic (trong chapters.py)
        │  → Gọi Gemini text-embedding-004 → vector query
        │
        ▼
[PostgreSQL pgvector]
        SELECT story_id, plot_summary,
               1 - (embedding <=> $query_vector) AS similarity
        FROM story_embeddings
        ORDER BY embedding <=> $query_vector
        LIMIT 20;
        │
        ▼
[Response] Danh sách story_id xếp hạng theo Cosine Similarity
           → Join với stories để lấy metadata
           → Trả về trong < 1.5 giây
```

### 9.3. Luồng thanh toán PayOS (U011 → U012)

```
[Reader chọn gói Membership trên S09]
        │
        ▼
[FastAPI] POST /api/v1/membership/checkout
        │  → Tạo Transaction (status='pending', vnp_txn_ref=UUID)
        │  → Gọi PayOS API → tạo link thanh toán (paymentLink)
        │  → Trả URL cho Frontend redirect
        │
        ▼
[PayOS xử lý thanh toán bằng mã QR]
        │
        ├─ Thành công:
        │   [PayOS Webhook] POST /api/v1/payment/payos/webhook  (backend-to-backend)
        │       - Verify checksum bằng PAYOS_CHECKSUM_KEY
        │       - UPDATE transactions SET status='success', vnp_transaction_no=...
        │       - UPDATE users SET premium_until = NOW() + interval 'N days'
        │
        └─ Client Redirect (Verify an toàn):
            [Client Redirect] GET /payment/result?orderCode=...
                - Frontend gửi orderCode lên /payos/verify
                - Backend gọi trực tiếp PayOS API check status link thanh toán
                - Nếu trạng thái là PAID -> cập nhật Premium (nếu webhook chưa xử lý)
```

### 9.4. Luồng Autosave soạn thảo (U004 — FR-05)

```
[Author gõ trong S16 Author Studio]
        │
        ▼ (debounce 3 giây)
[WebSocket] WS /ws/stories/{story_id}/chapters/{chapter_id}
        │  → FastAPI nhận delta, lưu vào Redis (key: draft:{chapter_id})
        │  → Định kỳ flush từ Redis → PostgreSQL (chapters.content)
        │  → Độ trễ < 200ms
```

### 9.5. Scheduler giám sát lộ trình (U014)

```
[APScheduler Cron Job — cấu hình qua SCHEDULE_SCAN_HOUR_UTC/MINUTE_UTC]
        │
        ▼
SELECT * FROM publish_schedules
WHERE status = 'scheduled' AND scheduled_time <= NOW()

        ├─ Tác giả đúng hạn → UPDATE status='published', tăng reputation_score
        ├─ Còn ≤ 24h → Gửi reminder notification (INSERT notifications + WebSocket push)
        └─ Trễ hạn → UPDATE status='missed', trừ reputation_score
                   → Gắn cờ cho Admin Dashboard (U015)
```

### 9.6. Luồng View Count Flush

```
[Reader mở chương → GET /api/v1/chapters/{id}]
        │  → INCR Redis key "story:{story_id}:views"
        │  → Trả content ngay (không UPDATE PostgreSQL)
        │
[Periodic Task — mỗi 600s khi VIEW_COUNT_FLUSH_ENABLED=true]
        │  → Scan Redis keys "story:*:views"
        │  → UPDATE stories SET view_count = view_count + delta
        │  → DELETE Redis keys đã flush
```

---

## 10. Use Cases — 15 Use Cases (U001–U015)

| ID | Use Case | Actor | Screen | FR |
|---|---|---|---|---|
| U001 | Đăng ký / Đăng nhập | User | S02 | FR-01 |
| U002 | Quản lý hồ sơ | User | S12, S13 | FR-03 |
| U003 | Tạo & Quản lý Tác phẩm | Author | S15 | FR-04 |
| U004 | Soạn thảo chương | Author | S16 | FR-05 |
| U005 | Xuất bản chương | Author, AI Engine | S17 | FR-07 |
| U006 | Gợi ý tình tiết AI | Author, AI Engine | S16 (AI Sidebar) | FR-06 |
| U007 | Đọc truyện | Reader | S06, S07 | FR-08 |
| U008 | Tìm kiếm thông minh AI | Reader, AI Engine | S05 | FR-09 |
| U009 | Đề xuất truyện | Reader, AI Engine | S04 | FR-10 |
| U010 | Bình luận & Đánh giá | Reader | S06, S07 | FR-11 |
| U011 | Đăng ký Membership | Reader | S09 | FR-12 |
| U012 | Thanh toán PayOS | Reader, PayOS | S09, S10 | FR-12 |
| U013 | Kiểm duyệt nội dung AI | AI Engine, Admin | S20 | FR-13 |
| U014 | Giám sát cam kết lộ trình | System Scheduler, Author, Admin | S18 | FR-14 |
| U015 | Quản trị hệ thống | Admin | S19, S20, S21 | FR-15 |

---

## 11. Màn hình (21+ Screens) — S01 đến S21

| ID | Tên màn hình | Route (thực tế) | Actor | Use Case |
|---|---|---|---|---|
| S01 | Landing Page | `/` | Public | — |
| S02 | Đăng nhập / Đăng ký | `/auth` | Public | U001 |
| S03 | Khôi phục mật khẩu | `/auth/reset` | Public | U001 |
| S04 | Home Feed | `/home` | Reader | U009 |
| S05 | Khám phá & Tìm kiếm | `/discover` | Reader | U008 |
| S06 | Chi tiết truyện | `/stories/[id]` | Reader | U007, U010 |
| S07 | Reader Mode | `/stories/[id]/chapters/[num]` | Reader | U007 |
| S08 | Diễn đàn | `/forum` | Reader, Author | U010 |
| S09 | Membership | `/membership` | Reader | U011, U012 |
| S10 | Kết quả thanh toán | `/payment/result` | Reader | U012 |
| S11 | Thư viện cá nhân | `/library` | Reader | U007 |
| S12 | Hồ sơ cá nhân | `/profile/[id]` | User | U002 |
| S13 | Cài đặt tài khoản | `/settings` | User | U002 |
| S14 | Trung tâm thông báo | `/notifications` | User | U013, U014 |
| S15 | Thư viện tác phẩm (Author) | `/author/stories` | Author | U003 |
| S16 | Author Studio (Editor) | `/author/stories/[id]/edit` | Author | U004, U006 |
| S17 | Xuất bản chương | `/author/stories/[id]/publish` | Author | U005 |
| S18 | Lịch đăng & Cam kết | `/author/schedule` | Author | U014 |
| S19 | Admin Dashboard | `/admin` | Admin | U015 |
| S20 | Kiểm duyệt nội dung | `/admin/moderation` | Admin | U013, U015 |
| S21 | Thống kê & Báo cáo | `/admin/stats` | Admin | U015 |
| — | Giới thiệu | `/about` | Public | — |
| — | Liên hệ | `/contact` | Public | — |
| — | Điều khoản | `/terms` | Public | — |
| — | Chính sách bảo mật | `/privacy` | Public | — |

---

## 12. API Backend — FastAPI Routes (Thực tế)

> **Base URL:** Tất cả API endpoints có prefix `/api/v1/`.
> Đăng ký tại `app/api/v1/router.py`.

### Auth (`/api/v1/auth`) — `endpoints/auth.py`
```
POST /api/v1/auth/register       → U001: Đăng ký, hash Bcrypt, tạo users+profiles
POST /api/v1/auth/login          → U001: Đăng nhập, trả JWT access token
POST /api/v1/auth/reset-password → U001: Gửi OTP qua email
GET  /api/v1/auth/me             → Lấy thông tin user hiện tại từ JWT
PUT  /api/v1/auth/me/profile     → U002: Cập nhật profile (display_name, bio, avatar)
```

### Stories (`/api/v1/stories`) — `endpoints/stories.py`
```
GET    /api/v1/stories                     → Danh sách (filter: category, status, search)
POST   /api/v1/stories                     → U003: Tạo tác phẩm mới (Author)
GET    /api/v1/stories/{id}                → Chi tiết tác phẩm + metadata
PUT    /api/v1/stories/{id}                → U003: Cập nhật thông tin
DELETE /api/v1/stories/{id}                → U003: Xóa tác phẩm
GET    /api/v1/stories/{id}/chapters       → Danh sách chương
POST   /api/v1/stories/{id}/reviews        → U010: Đánh giá tác phẩm
GET    /api/v1/stories/{id}/reviews        → Danh sách reviews
```

### Chapters (`/api/v1/chapters`) — `endpoints/chapters.py`
```
POST   /api/v1/chapters                    → U004: Tạo chương mới (draft)
GET    /api/v1/chapters/{id}               → U007: Đọc nội dung chương (+ incr view_count)
PUT    /api/v1/chapters/{id}               → U004: Cập nhật chương
DELETE /api/v1/chapters/{id}               → Xóa chương
GET    /api/v1/chapters/{id}/comments      → Danh sách bình luận
POST   /api/v1/chapters/{id}/comments      → U010: Đăng bình luận
GET    /api/v1/search?q=...                → Tìm kiếm theo từ khóa
POST   /api/v1/search/semantic             → U008: AI semantic search qua pgvector
```

### Author Chapters (`/api/v1/author/chapters`) — `endpoints/chapters.py`
```
PUT    /api/v1/author/chapters/{id}/autosave → U004: REST autosave endpoint
```

### Publishing — `endpoints/publish.py`
```
POST   /api/v1/stories/{story_id}/chapters/{chapter_id}/publish → U005: Xuất bản → RabbitMQ
GET    /api/v1/stories/{story_id}/chapters/{chapter_id}/status  → Kiểm tra moderation status
```

### AI (`/api/v1/ai`) — `endpoints/ai.py`
```
POST   /api/v1/ai/suggest              → U006: Gợi ý tình tiết (context ≤ 1000 từ)
```

### Recommendations (`/api/v1/recommendations`) — `endpoints/recommendations.py`
```
POST   /api/v1/recommendations         → U009: Đề xuất truyện cá nhân hóa
```

### Payment (`/api/v1/payment`, `/api/v1/payments`) — `endpoints/payment.py`
```
POST   /api/v1/payment/payos/checkout   → Khởi tạo hóa đơn PayOS
POST   /api/v1/payment/payos/verify     → Xác thực kết quả thanh toán
POST   /api/v1/payment/payos/webhook    → Webhook nhận callback từ PayOS
GET    /api/v1/payment/transactions/{ref} → Tra cứu trạng thái giao dịch
GET    /api/v1/payment/transactions     → Lịch sử giao dịch (user)
```

### Membership (`/api/v1/membership`) — `endpoints/payment.py`
```
GET    /api/v1/membership/plans         → Danh sách gói
POST   /api/v1/membership/checkout      → Khởi tạo checkout Membership qua PayOS
GET    /api/v1/membership/status        → Kiểm tra trạng thái membership
```

### Notifications (`/api/v1/notifications`) — `endpoints/notifications.py`
```
GET    /api/v1/notifications            → Danh sách thông báo (user)
PUT    /api/v1/notifications/{id}/read  → Đánh dấu đã đọc
PUT    /api/v1/notifications/read-all   → Đánh dấu tất cả đã đọc
```

### Admin (`/api/v1/admin`) — `endpoints/admin.py`
```
GET    /api/v1/admin/moderation-queue              → U015: Danh sách chương flagged/pending
POST   /api/v1/admin/moderation/{id}/approve       → U013: Admin duyệt
POST   /api/v1/admin/moderation/{id}/reject        → U013: Admin từ chối
GET    /api/v1/admin/stats                         → U015: Số liệu tổng quan
GET    /api/v1/admin/users                         → Danh sách users
PUT    /api/v1/admin/users/{id}/role               → Thay đổi role user
GET    /api/v1/admin/audit-logs                    → Nhật ký hành động admin
```

### WebSocket (đăng ký trực tiếp trên app — `main.py`)
```
WS /ws/stories/{story_id}/chapters/{chapter_id}  → U004: Autosave real-time (< 200ms)
WS /ws/notifications/{user_id}                   → U013, U014: Push kết quả duyệt, nhắc lịch
WS /api/v1/ws/notifications/{user_id}            → Alias cho frontend flexibility
```

### Health Check (không cần auth — `main.py`)
```
GET /                    → Service info (project name, docs link)
GET /health              → Basic health (status: ok)
GET /health/live         → Liveness probe (cho Docker/K8s)
GET /health/ready        → Readiness probe (kiểm tra DB + Redis + RabbitMQ)
```

---

## 13. Worker & Message Queue Architecture

### 13.1. Queue Topology

```
                    ┌─────────────────────┐
                    │   ai.moderation     │ ← Main queue (durable)
                    │   (consumer: worker)│
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │  handle_publish_     │
                    │  chapter()           │
                    │  → moderate_content()│
                    │  → apply_result()    │
                    │  → sync_embedding()  │
                    │  → create_notif()    │
                    └────┬────────────┬────┘
                         │            │
                    success       RetryableModerationError
                    (ACK)              │
                              ┌───────▼───────────────┐
                              │ ai.moderation.retry   │
                              │ TTL=60s               │
                              │ DLX → ai.moderation   │
                              └───────┬───────────────┘
                                      │ after 60s
                                      ▼
                              (quay lại ai.moderation)
                                      │
                              retry_count > 5?
                              ┌───────▼───────────────┐
                              │ ai.moderation.dlq     │
                              │ (Dead Letter Queue)   │
                              │ → Manual inspection   │
                              └───────────────────────┘
```

### 13.2. Message Format

```json
{
  "task_type": "publish_chapter",
  "chapter_id": "uuid-string",
  "content": "chapter content (optional, fallback to DB)",
  "story_id": "uuid-string",
  "requested_by": "author-user-id"
}
```

### 13.3. Error Handling
| Error Type | Class | Behavior |
|---|---|---|
| Gemini 429 / timeout | `RetryableModerationError` | Push vào retry queue (TTL 60s) |
| Chapter not found | `PermanentWorkerError` | ACK & drop (log error) |
| Empty content | `PermanentWorkerError` | ACK & drop |
| Unknown exception | `Exception` | Push vào retry queue |
| Max retries exceeded | — | Push vào DLQ |

### 13.4. Worker Configuration

```bash
# Worker chạy với prefetch_count=1 (xử lý 1 message tại 1 thời điểm)
# Auto-reconnect khi mất connection RabbitMQ (retry mỗi 5s)
# Graceful shutdown khi nhận SIGINT (KeyboardInterrupt)
```

---

## 14. Class Model nhanh

```python
# ── SQLAlchemy ORM Models (16 models) ──
User              → login(), register()
Profile           → update_profile()
Story             → updateInfo(), delete()
Chapter           → saveDraft(), publish()        # publish() → RabbitMQ
Comment           → edit(), delete()
Review            → submitReview()                # UNIQUE (user_id, story_id)
MembershipPlan    → getDetails()
Transaction       → processPayment()              # Tạo PayOS URL
AIModerationLog   → logResult()                   # Ghi kết quả Gemini
PublishSchedule   → checkSchedule()               # Cron trigger
StoryEmbedding    → generateVector()              # Gọi Gemini Embeddings API
ReadingHistory    → trackRead()
Library           → bookmark(), unbookmark()
Notification      → create(), markRead(), stream() # WebSocket push
AdminAlert        → create(), resolve()
AdminAuditLog     → logAction()                    # Audit trail

# ── Service Layer (11 services) ──
AuthService       → register, login, verify_token, update_profile
AIService         → suggest_plot, moderate_content, generate_embedding, semantic_search, recommend
ModerationService → moderate_content, apply_moderation_result
PaymentService    → create_checkout, verify_ipn, process_refund
MembershipService → get_plans, check_status
PublishService    → submit_for_moderation (→ RabbitMQ), get_rabbitmq_connection
ScheduleService   → start_schedule_scheduler, scan_schedules, send_reminders
NotificationService → create_notification, stream_user_notifications (WebSocket)
AdminService      → get_moderation_queue, approve/reject, get_stats, audit_log
CloudinaryService → upload_image, delete_image
MediaService      → serve_local_file (dev only)
```

---

## 15. Quy tắc quan trọng khi code

### Bảo mật
- Mật khẩu: **luôn dùng Bcrypt** (passlib), không MD5/SHA1
- Auth: **JWT** — header `Authorization: Bearer <token>`
- Payment: PayOS verify **signature/API status**, không tin Frontend
- **Không lưu thông tin thẻ/tài khoản ngân hàng** vào DB
- Rate Limiting tại Nginx:
  - `/api/v1/(auth|ai|payment|payments)/`: **5 req/phút** (zone: api_sensitive)
  - `/api/*`: **10 req/giây** (zone: api_general)
- Security headers (Nginx + FastAPI middleware):
  - `Strict-Transport-Security` (HSTS 1 năm)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Non-root user trong Docker containers (`appuser` cho backend, `nextjs` cho frontend)
- `X-Request-ID` tracking cho mọi HTTP request

### Hiệu năng
- Gemini API call: **luôn qua RabbitMQ** cho moderation (async), không gọi trực tiếp trong request handler
- AI suggest (U006): **giới hạn context ≤ 1000 từ** mỗi lần gọi (config: `AI_CONTEXT_WORD_LIMIT`)
- Chapter content: **ưu tiên Redis cache**, fallback PostgreSQL
- `view_count`: tăng trong Redis, **flush về PostgreSQL mỗi 600s** (không UPDATE mỗi request)
- WebSocket autosave: **debounce 3 giây** phía client trước khi gửi
- DB connection pooling: `pool_size=5`, `max_overflow=10`, `pool_recycle=1800s`
- Frontend: Next.js `standalone` output mode cho minimal Docker image

### Xử lý lỗi AI
- Gemini Rate Limit (429): **retry queue** (TTL 60s), max 5 retries → DLQ
- Gemini timeout: `GEMINI_TIMEOUT_SECONDS=10.0`, fallback graceful
- pgvector không có kết quả: fallback sang full-text search thông thường
- `GEMINI_API_KEY` rỗng: AI features trả 503 Service Unavailable

### Frontend
- `moderation_status = 'pending'`: hiển thị badge "Đang duyệt", không ẩn chương khỏi Author
- Chapter Premium (`is_premium=true`) + user chưa có `premium_until`: hiển thị paywall S09
- Reader Mode (S07): cấu hình đọc lưu `localStorage` (font size, dark mode, width)
- Author Studio (S16): AI Sidebar dùng context 1000 từ gần nhất, hiển thị 3 gợi ý
- Mock mode: `NEXT_PUBLIC_USE_MOCKS=true` cho demo UI không cần backend
- API client (`lib/api.ts`): timeout `NEXT_PUBLIC_API_TIMEOUT_MS=12000`, auto-attach JWT
- WebSocket (`lib/realtime.ts`): auto-reconnect, auth context

### Database
- Dùng **`gen_random_uuid()`** cho tất cả PK (không auto-increment)
- pgvector index: `ivfflat` với `vector_cosine_ops` cho bảng `story_embeddings`
- `ON DELETE CASCADE` cho quan hệ parent-child (story→chapters, chapter→comments)
- `ON DELETE SET NULL` cho `transactions.user_id` (giữ lịch sử dù xóa tài khoản)
- Migrations: file-based versioned SQL, checksum validation, **không sửa file đã apply**

---

## 16. Non-Functional Requirements (NFR) — Tham chiếu khi thiết kế

| NFR | Yêu cầu | Giải pháp kỹ thuật |
|---|---|---|
| AI Search response | < 1.5 giây | pgvector ivfflat index |
| Autosave latency | < 200ms | WebSocket + Redis pub/sub |
| Chapter load | < 0.5 giây | Redis cache + Next.js SSR |
| Publish response | < 500ms | HTTP 202 + async RabbitMQ |
| AI Suggest | < 5 giây | Gemini API trực tiếp, context ≤ 1000 từ |
| PayOS update | < 2 giây | Webhook/API status verify |
| AI Moderation | < 5 phút | Background Worker + retry queue |
| Uptime | ≥ 99.5% | GCP + Docker + Health checks |
| Schedule reminder | < 10 phút | APScheduler cron job |

---

## 17. CI/CD Pipeline

### 17.1. GitHub Actions (`.github/workflows/ci.yml`)

```
┌──────────────────────────────────────────────────────────────────┐
│                  ON: push/PR to dev, main                        │
├──────────────────────┬───────────────────────────────────────────┤
│                      │                                           │
│  JOB 1: Backend CI   │  JOB 2: Frontend CI                      │
│  ─────────────────   │  ──────────────────                       │
│  Python 3.11         │  Node.js 20                               │
│  Services:           │                                           │
│    - pgvector:pg16   │  Steps:                                   │
│    - redis:alpine    │    1. npm ci                               │
│    - rabbitmq:3      │    2. npm run lint (ESLint)                │
│  Steps:              │    3. npm run build                        │
│    1. pip install     │                                           │
│    2. flake8 lint    │                                           │
│    3. Run migrations │                                           │
│    4. pytest --cov   │                                           │
│                      │                                           │
├──────────────────────┴───────────────────────────────────────────┤
│                                                                   │
│  JOB 3: Deploy (chỉ khi push to main + cả 2 jobs CI pass)       │
│  ──────────────────────────────────────────────────────────       │
│  → Apply database migrations lên production DB                    │
│  → Sử dụng GitHub Secret: DATABASE_URL                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 17.2. GitHub Secrets cần cấu hình

| Secret | Mô tả |
|---|---|
| `DATABASE_URL` | Production PostgreSQL connection string |

### 17.3. Branch Strategy

| Branch | Mục đích | CI | CD |
|---|---|---|---|
| `dev` | Development integration | ✅ Lint + Test + Build | ❌ |
| `main` | Production release | ✅ Lint + Test + Build | ✅ Auto-deploy migrations |
| Feature branches | PRs vào dev | ✅ (on PR) | ❌ |

---

## 18. Deployment Production — Hướng dẫn chi tiết

### 18.1. Kiến trúc Production đề xuất (GCP)

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GCE VM (hoặc Cloud Run)                             │   │
│  │  docker-compose --profile prod up -d                  │   │
│  │                                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Nginx   │ │ Frontend│ │ Backend  │ │ Worker   │  │   │
│  │  │ :80/443 │ │ :3000   │ │ :8000    │ │          │  │   │
│  │  └────┬────┘ └─────────┘ └────┬─────┘ └────┬─────┘  │   │
│  │       │                        │             │        │   │
│  └───────┼────────────────────────┼─────────────┼────────┘   │
│          │                        │             │            │
│  ┌───────▼────────┐  ┌───────────▼───────────┐ │            │
│  │ Cloud DNS      │  │ Cloud SQL (PostgreSQL) │ │            │
│  │ + SSL (Let's   │  │ pgvector extension     │ │            │
│  │   Encrypt)     │  └───────────────────────┘ │            │
│  └────────────────┘                             │            │
│                      ┌──────────────────────────▼──────┐    │
│                      │ CloudAMQP (Managed RabbitMQ)    │    │
│                      └─────────────────────────────────┘    │
│                      ┌─────────────────────────────────┐    │
│                      │ Upstash Redis (Serverless)      │    │
│                      └─────────────────────────────────┘    │
│                                                              │
│  External Services:                                          │
│  ├── Cloudinary CDN (ảnh bìa, avatar)                       │
│  ├── Google Gemini API (AI features)                         │
│  └── PayOS Production (thanh toán)                             │
│                                                              │
│  Backup: GCS daily backup cho PostgreSQL                     │
└─────────────────────────────────────────────────────────────┘
```

### 18.2. Bước deploy chi tiết

#### Bước 1: Chuẩn bị Infrastructure

```bash
# 1a. Tạo GCE VM (Ubuntu 22.04, e2-medium trở lên)
gcloud compute instances create yag-prod \
  --zone=asia-southeast1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB

# 1b. Cài Docker & Docker Compose trên VM
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER

# 1c. Hoặc dùng Managed Services:
# - Cloud SQL for PostgreSQL (bật pgvector extension)
# - Upstash Redis (free tier đủ dùng)
# - CloudAMQP (free tier: 100 messages/ngày)
```

#### Bước 2: SSL Certificate

```bash
# Dùng Let's Encrypt (miễn phí)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates vào project
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/

# Auto-renew cron
echo "0 0 1 * * certbot renew --quiet && docker-compose restart nginx" | crontab -
```

#### Bước 3: Cấu hình Environment

```bash
# Tạo file .env tại root project
cat > .env << 'EOF'
# ── Application ──
ENVIRONMENT=production
SECRET_KEY=$(openssl rand -hex 32)

# ── Database ──
POSTGRES_USER=yag_prod
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=yag_prod

# ── Redis ──
REDIS_PASSWORD=$(openssl rand -hex 16)

# ── RabbitMQ ──
RABBITMQ_USER=yag_prod_mq
RABBITMQ_PASSWORD=$(openssl rand -hex 16)

# ── CORS ──
CORS_ORIGINS=https://yourdomain.com

# ── Frontend Build Args ──
FRONTEND_PUBLIC_URL=https://yourdomain.com
API_PUBLIC_URL=https://yourdomain.com/api
WS_PUBLIC_URL=wss://yourdomain.com/ws

# ── PayOS Production ──
PAYMENT_PROVIDER=payos
PAYOS_CLIENT_ID=YOUR_PRODUCTION_CLIENT_ID
PAYOS_API_KEY=YOUR_PRODUCTION_API_KEY
PAYOS_CHECKSUM_KEY=YOUR_PRODUCTION_CHECKSUM_KEY
PAYOS_RETURN_URL=https://yourdomain.com/payment/result

# ── Gemini AI ──
GEMINI_API_KEY=your_production_gemini_api_key

# ── Cloudinary ──
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EOF
```

#### Bước 4: Deploy

```bash
# Clone repo
git clone https://github.com/zeus058/SE_Writing_Web.git
cd SE_Writing_Web

# Đặt .env đã cấu hình ở bước 3

# Build & Deploy (profile prod)
docker-compose --profile prod up -d --build

# Kiểm tra services
docker-compose ps
docker-compose logs -f backend
docker-compose logs -f moderation-worker

# Verify health
curl https://yourdomain.com/health/ready
```

#### Bước 5: Database Seeding (lần đầu)

```bash
# Seed dữ liệu mẫu (membership plans, admin user...)
docker-compose exec backend python -m app.seed
```

### 18.3. Cập nhật (Update/Redeploy)

```bash
# Pull code mới
git pull origin main

# Rebuild & restart (zero-downtime với rolling update)
docker-compose --profile prod up -d --build

# Chỉ rebuild specific service
docker-compose --profile prod up -d --build backend moderation-worker

# Kiểm tra migration đã apply
docker-compose logs migrate
```

### 18.4. Backup & Recovery

```bash
# Backup PostgreSQL (daily cron)
docker-compose exec postgres pg_dump -U yag_prod yag_prod > backup_$(date +%Y%m%d).sql

# Upload to GCS
gsutil cp backup_*.sql gs://yag-backups/daily/

# Restore
docker-compose exec -T postgres psql -U yag_prod yag_prod < backup_20260604.sql
```

### 18.5. Monitoring & Logs

```bash
# View logs theo service
docker-compose logs -f --tail=100 backend
docker-compose logs -f --tail=100 moderation-worker
docker-compose logs -f --tail=100 nginx

# Health check
curl -s https://yourdomain.com/health/ready | python -m json.tool

# RabbitMQ Management UI (nếu expose port 15672)
# http://yourdomain.com:15672 (user: yag_prod_mq)
```

### 18.6. Alternatives: Deploy không dùng Docker Compose

| Platform | Frontend | Backend | Database |
|---|---|---|---|
| **Vercel + Railway** | Vercel (free) | Railway (backend + worker) | Supabase (free, có pgvector) |
| **Render** | Render Static | Render Web Service + Background Worker | Render PostgreSQL |
| **Fly.io** | Fly.io | Fly.io (multi-process) | Fly.io PostgreSQL |

Ví dụ **Vercel + Railway + Supabase**:
```bash
# Frontend → Vercel
cd src/frontend
vercel --prod

# Backend → Railway
# Cấu hình Dockerfile path: src/backend/Dockerfile
# Env vars: DATABASE_URL=supabase_url, REDIS_URL=upstash_url, ...

# Database → Supabase
# Bật pgvector extension trong Supabase dashboard
# Connection string: postgresql://postgres.xxx:xxx@aws-0-region.pooler.supabase.com:6543/postgres
```

---

## 19. Nginx & Security Configuration

### 19.1. Routing Rules (nginx.conf)

| Location | Target | Rate Limit | Mô tả |
|---|---|---|---|
| `/health` | `backend:8000` | Không | Health check probe |
| `/api/v1/(auth\|ai\|payment\|payments)/` | `backend:8000` | 5 req/phút | Sensitive endpoints |
| `/api/` | `backend:8000` | 10 req/giây | General API |
| `/ws/` | `backend:8000` | Không | WebSocket (upgrade) |
| `/api/v1/ws/` | `backend:8000` | Không | WebSocket v1 alias |
| `/media/` | `backend:8000` | Không | Local media (dev) |
| `/` (catch-all) | `frontend:3000` | Không | Next.js pages |

### 19.2. SSL & Security Headers

```nginx
# SSL
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

# Security Headers
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()

# Limits
client_max_body_size: 10m
WebSocket proxy_read_timeout: 3600s

# HTTP → HTTPS redirect (port 80 → 443)
```

---

## 20. Testing

### 20.1. Backend Test Suite (pytest)

```bash
cd src/backend

# Chạy toàn bộ tests
pytest --cov=app --cov-report=term-missing -v

# Chạy test specific module
pytest tests/test_auth.py -v
pytest tests/test_payment.py -v
```

| Test File | Module | Mô tả |
|---|---|---|
| `test_auth.py` | F1 | Register, login, JWT, password reset |
| `test_database.py` | Core | DB connection, models, relationships |
| `test_payment.py` | F2 | PayOS checkout, payment link verification |
| `test_membership.py` | F2 | Membership plans, status |
| `test_ai_suggestions.py` | F3 | AI suggest endpoint |
| `test_ai_search_and_recommendations.py` | F3 | Semantic search, recommendations |
| `test_moderation.py` | F5 | Content moderation pipeline |
| `test_publish.py` | F4 | Chapter publish workflow |
| `test_admin.py` | F5 | Admin dashboard, moderation queue |
| `test_notifications.py` | — | Notification CRUD, WebSocket |
| `test_profile.py` | F1 | Profile update, avatar |
| `test_schedule.py` | F4 | Publish schedule, cron jobs |
| `test_role_separation.py` | Core | RBAC role checks |
| `test_main.py` | Core | App startup, health checks |

### 20.2. Frontend Checks

```bash
cd src/frontend

# Lint
npm run lint          # ESLint

# Build check (type-safe compilation)
npm run build
```

---

## 21. Cài đặt môi trường Local Development

### 21.1. Prerequisites
- **Node.js** v20+
- **Python** 3.11+
- **Docker Desktop** (cho PostgreSQL, Redis, RabbitMQ)
- **Git**

### 21.2. Setup từng bước

```bash
# 1. Clone repo
git clone https://github.com/zeus058/SE_Writing_Web.git
cd SE_Writing_Web

# 2. Khởi chạy infrastructure (chỉ databases, không cần profile)
docker-compose up -d
# → PostgreSQL :5432, Redis :6379, RabbitMQ :5672 (Dashboard :15672)

# 3. Setup Backend
cd src/backend
cp .env.example .env           # Điền GEMINI_API_KEY, các biến khác giữ default
python -m venv .venv
.venv/Scripts/activate         # Windows
# source .venv/bin/activate    # Linux/Mac
pip install -r requirements.txt

# 4. Apply migrations
python -m app.manage_migrations

# 5. Seed data (optional)
python -m app.seed

# 6. Chạy backend API
uvicorn app.main:app --reload --port 8000

# 7. Chạy RabbitMQ Worker (terminal riêng)
python worker.py

# 8. Setup Frontend (terminal riêng)
cd src/frontend
cp .env.example .env           # Giữ default cho local dev
npm install
npm run dev                    # → http://localhost:3000

# 9. Verify
# Backend API docs: http://localhost:8000/docs
# Frontend: http://localhost:3000
# RabbitMQ Dashboard: http://localhost:15672 (yag_mq / yag_mq_secret)
```

### 21.3. Full-stack Docker (alternative)

```bash
# Chạy tất cả trong Docker (không cần install Node/Python)
docker-compose --profile app up -d --build

# → Nginx: http://localhost (port 80/443)
# Cần self-signed cert hoặc comment SSL trong nginx.conf cho local
```

---

## 22. Troubleshooting

### Khi debug

| Triệu chứng | Nguyên nhân có thể | Giải pháp |
|---|---|---|
| `moderation_status` không đổi | Worker không chạy hoặc không connect RabbitMQ | `docker-compose logs moderation-worker`, kiểm tra `RABBITMQ_URL` |
| Semantic search không ra kết quả | `story_embeddings` chưa có data | Kiểm tra worker log, `GEMINI_API_KEY` có giá trị không |
| PayOS webhook không nhận | Checksum/Signature sai hoặc Nginx routing sai | Verify `PAYOS_CHECKSUM_KEY`, check Nginx routing `/api/v1/payment/payos/webhook` |
| WebSocket ngắt liên tục | Redis pub/sub connection lost | Kiểm tra `REDIS_URL`, Redis container health |
| `moderation_status` stuck ở `pending` | Message trong DLQ sau 5 retries | Kiểm tra queue `ai.moderation.dlq` trong RabbitMQ Dashboard |
| Frontend API calls fail | CORS hoặc sai API URL | Kiểm tra `CORS_ORIGINS`, `NEXT_PUBLIC_API_BASE_URL` |
| `422 Unprocessable Entity` | Schema validation fail | Xem Pydantic error detail trong response body |
| Backend crash on startup (prod) | Production validator reject config | Đọc error message, fix biến trong `.env` theo mục 8 |
| Migration checksum mismatch | File migration đã apply bị sửa | KHÔNG sửa file cũ, tạo migration MỚI |
| Docker build fail (frontend) | Missing build args `NEXT_PUBLIC_*` | Truyền qua docker-compose env hoặc `.env` root |
| Health check `degraded` | Một service infrastructure down | `curl /health/ready` → xem field nào `error` |

### Logs quan trọng

```bash
# Backend API logs
docker-compose logs -f backend

# Worker logs (moderation pipeline)
docker-compose logs -f moderation-worker

# Migration logs
docker-compose logs migrate

# Nginx access/error logs
docker-compose logs -f nginx

# PostgreSQL logs
docker-compose logs -f postgres
```

---

## 23. Hướng dẫn cho Agent khi nhận task

### Khi viết Backend (FastAPI)
1. Xác định Use Case ID (U001-U015) liên quan
2. Tìm table cần thao tác trong mục 5.2
3. Kiểm tra luồng nghiệp vụ ở mục 9 trước khi viết handler
4. Với AI: moderation luôn đi qua RabbitMQ/PubSub worker; suggestion/search/recommendation có thể gọi Gemini qua `app/ai/gateway.py` với timeout, fallback và không log raw content/secrets
5. Với payment: xác minh signature/PayOS API status trước khi cập nhật DB
6. Endpoint mới: thêm vào file tương ứng trong `endpoints/`, đăng ký trong `router.py`
7. Model mới: thêm vào `models/`, import trong `models/__init__.py`
8. Schema mới: thêm vào `schemas/`, export trong `schemas/__init__.py`
9. Service mới: thêm vào `services/`, inject qua `deps.py` nếu cần
10. Database change: tạo file migration mới `V{N}__description.sql`, **KHÔNG sửa file cũ**

### Khi viết Frontend (Next.js)
1. Xác định Screen ID (S01-S21) và route tương ứng (mục 11)
2. Kiểm tra actor/role có quyền truy cập screen này không
3. S16 Author Studio: 3 cột (dàn ý | editor | AI sidebar)
4. S07 Reader Mode: ẩn navbar, lưu config vào localStorage
5. API calls: dùng `lib/api.ts` (có interceptor, timeout, JWT)
6. Auth state: dùng `lib/auth-context.tsx` (React Context)
7. WebSocket: dùng `lib/realtime.ts`
8. Components: tổ chức theo `components/{auth|features|layout|runtime|ui}/`
9. Styling: TailwindCSS v4

### Khi debug
1. `moderation_status` không đổi → kiểm tra RabbitMQ consumer có đang chạy
2. Semantic search không ra kết quả → kiểm tra `story_embeddings` đã có data chưa
3. PayOS Webhook không nhận → kiểm tra signature webhook và endpoint đúng
4. WebSocket ngắt → kiểm tra Redis pub/sub connection
5. DLQ có messages → kiểm tra RabbitMQ Dashboard, xem `x-last-error` header
6. Production startup fail → đọc error message từ `config.py` production validator

### Khi thêm tính năng mới
1. Cập nhật Use Case table ở mục 10
2. Nếu cần bảng DB mới: tuân thủ UUID PK, timestamps, CASCADE rules
3. Tạo migration file mới: `V{N}__{description}.sql`
4. Tính năng AI mới: luôn có fallback khi Gemini down
5. Giữ nguyên pattern: Nginx → FastAPI → Service → Repository → PostgreSQL/Redis
6. Thêm test: tạo `tests/test_{feature}.py`
7. **Cập nhật AGENTS.md** với thay đổi mới

### Khi deploy
1. Đọc mục 18 (Deployment Production) để hiểu flow
2. Kiểm tra mục 8 (Production Safeguards) — config.py sẽ reject nếu thiếu config
3. SSL certificates phải có trong `nginx/certs/`
4. `.env` production phải khác hoàn toàn với development defaults
5. Luôn chạy `docker-compose --profile prod` (không phải profile mặc định)
6. Sau deploy: verify `/health/ready` trả `status: ok`
7. Kiểm tra logs: `docker-compose logs -f backend moderation-worker`

---

*Tài liệu gốc: Proposal.md, Requirement.md, Design.md — Nhóm 1, Intro2SE HCMUS 2025-2026*
