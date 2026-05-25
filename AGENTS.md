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
- Thanh toán Membership qua VNPAY để đọc chương Premium

---

## 2. Tech Stack

| Layer | Technology | Ghi chú |
|---|---|---|
| Frontend | Next.js (SPA/SSR) | TypeScript, TailwindCSS |
| Backend | FastAPI (Python 3.10+) | Modular Monolith, sẵn sàng tách Microservice |
| Database | PostgreSQL | pgvector extension cho AI search |
| Cache | Redis (Upstash Serverless) | Session, view count, pub/sub cho WebSocket |
| Message Queue | RabbitMQ | Async AI moderation pipeline |
| AI Engine | Google Gemini API | Free tier: 15 RPM / 1M token/phút |
| Media CDN | Cloudinary | Lưu ảnh bìa truyện, avatar |
| Payment | VNPAY Sandbox | IPN backend-to-backend |
| Proxy | Nginx | Reverse proxy, Rate Limiting, Anti-crawling |
| Deployment | GCP + Docker | docker-compose cho local dev |

### Cài đặt môi trường local
```bash
# Prerequisites: Node.js v18+, Python 3.10+, Docker Desktop, Git
docker-compose up -d          # Khởi chạy PostgreSQL, Redis, RabbitMQ
pip install -r requirements.txt --break-system-packages
npm install                   # Trong thư mục frontend
# Cấu hình .env: DATABASE_URL, GEMINI_API_KEY, VNPAY_CONFIG, JWT_SECRET
```

---

## 3. Cấu trúc thư mục repo

```
SE_Writing_Web/
├── src/
│   ├── frontend/             # Next.js app
│   │   ├── src/              # Next.js source code
│   │   │   ├── app/          # App Router pages (21 screens)
│   │   │   ├── components/   # React components
│   │   │   ├── data/         # Mock data / JSON metadata
│   │   │   └── lib/          # API client, hooks, utils
│   │   ├── package.json      # Frontend package details
│   │   └── tsconfig.json     # TypeScript configuration
│   └── backend/              # FastAPI app
│       ├── app/              # FastAPI application package
│       │   ├── api/          # Route handlers (v1/endpoints/...)
│       │   ├── core/         # Config, security (JWT, Bcrypt), DB session setup
│       │   ├── models/       # SQLAlchemy ORM models
│       │   ├── schemas/      # Pydantic request/response schemas
│       │   ├── services/     # Business logic services (Auth, Payment, Story, AI)
│       │   ├── worker/       # RabbitMQ Background Workers
│       │   └── main.py       # FastAPI application entry point
│       ├── tests/            # Automated test suite (pytest)
│       ├── requirements.txt  # Python package dependencies
│       └── README.md         # FastAPI developer guidelines
├── docs/
│   ├── requirements/         # Requirement.md
│   ├── analysis and design/  # Design.md
│   └── management/           # Sprint logs, weekly reports
├── pa/                       # Submission artifacts (Proposal.md, etc.)
├── docker-compose.yml
└── AGENTS.md                 # ← File này
```

---

## 4. Database Schema — 13 bảng PostgreSQL

> Tất cả bảng dùng UUID làm PK. Timestamps: `created_at`, `updated_at` DEFAULT NOW().

### 4.1. Sơ đồ quan hệ nhanh

```
users (1) ──────── (1) profiles
users (1) ──────── (N) stories          [author_id → users.id]
stories (1) ─────── (N) chapters        [story_id → stories.id]
stories (1) ─────── (1) story_embeddings [story_id → stories.id]
stories (1) ─────── (N) reviews         [story_id → stories.id]
stories (1) ─────── (N) publish_schedules
chapters (1) ──────── (N) comments      [chapter_id → chapters.id]
chapters (1) ──────── (1) ai_moderation_logs
comments (N) ──────── (1) comments      [parent_id → comments.id] (self-ref)
users (N) ─────── (N) stories           via libraries (bookmarks)
users (N) ─────── (N) chapters          via reading_histories
users (1) ──────── (N) transactions     [user_id → users.id]
membership_plans (1) ── (N) transactions [plan_id → membership_plans.id]
```

### 4.2. Đặc tả chi tiết từng bảng

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

#### `transactions` — Lịch sử thanh toán VNPAY
| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id, ON DELETE SET NULL |
| `plan_id` | VARCHAR(30) | FK → membership_plans.id |
| `amount` | DECIMAL(12,2) | > 0 |
| `vnp_txn_ref` | VARCHAR(100) | UNIQUE, mã gửi sang VNPAY |
| `vnp_transaction_no` | VARCHAR(100) | UNIQUE NULLABLE, mã VNPAY phản hồi |
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

---

## 5. Luồng nghiệp vụ quan trọng (Business Flows)

### 5.1. Luồng xuất bản chương & kiểm duyệt AI (U005 → U013)

```
[Author nhấn "Xuất bản" trên S17]
        │
        ▼
[FastAPI] POST /api/chapters/{id}/publish
        │  → Lưu chapter với moderation_status = 'pending'
        │  → Trả HTTP 202 NGAY (< 500ms, không chờ AI)
        │
        ▼
[RabbitMQ] Queue: ai.moderation
        │  → Push message: { chapter_id, content, story_id }
        │
        ▼
[Background Worker: moderation_worker.py]
        │  → Gọi Gemini API (prompt: phân tích NSFW, bạo lực)
        │  → Nếu APPROVED:
        │       - UPDATE chapters SET moderation_status='approved'
        │       - Gọi Gemini Embeddings API → vector(1536)
        │       - UPSERT story_embeddings
        │       - INSERT ai_moderation_logs (is_violation=false)
        │  → Nếu REJECTED/FLAGGED:
        │       - UPDATE chapters SET moderation_status='rejected'/'flagged'
        │       - INSERT ai_moderation_logs (is_violation=true, reason=...)
        │       - Đẩy lên Admin Dashboard (U015)
        │
        ▼
[WebSocket / In-app] → Thông báo kết quả cho Author (S14)

⚠ Fallback: Nếu Gemini Rate Limit → Task ở lại RabbitMQ, retry sau 60s.
```

### 5.2. Luồng AI Semantic Search (U008)

```
[Reader nhập mô tả trên S05] "nam chính là hacker"
        │
        ▼
[FastAPI] POST /api/search/semantic
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

### 5.3. Luồng thanh toán VNPAY (U011 → U012)

```
[Reader chọn gói Membership trên S09]
        │
        ▼
[FastAPI] POST /api/membership/checkout
        │  → Tạo Transaction (status='pending', vnp_txn_ref=UUID)
        │  → Gọi VNPAY API → lấy payment URL
        │  → Trả URL cho Frontend redirect
        │
        ▼
[VNPAY xử lý thanh toán]
        │
        ├─ Thành công:
        │   [VNPAY] POST /api/payment/vnpay-ipn  (backend-to-backend)
        │       → Verify checksum (HMAC-SHA512)
        │       → UPDATE transactions SET status='success', vnp_transaction_no=...
        │       → UPDATE users SET premium_until = NOW() + interval 'N days'
        │
        └─ Thất bại / Hủy:
            [VNPAY] redirect → /payment/result?status=failed
                → UPDATE transactions SET status='failed'
```

### 5.4. Luồng Autosave soạn thảo (U004 — FR-05)

```
[Author gõ trong S16 Author Studio]
        │
        ▼ (debounce 3 giây)
[WebSocket] WS /ws/draft/{chapter_id}
        │  → FastAPI nhận delta, lưu vào Redis (key: draft:{chapter_id})
        │  → Định kỳ flush từ Redis → PostgreSQL (chapters.content)
        │  → Độ trễ < 200ms
```

### 5.5. Scheduler giám sát lộ trình (U014)

```
[Cron Job — mỗi 1 giờ]
        │
        ▼
SELECT * FROM publish_schedules
WHERE status = 'scheduled' AND scheduled_time <= NOW()

        ├─ Tác giả đúng hạn → UPDATE status='published', tăng reputation_score
        ├─ Còn ≤ 24h → Gửi reminder notification (WebSocket/in-app)
        └─ Trễ hạn → UPDATE status='missed', trừ reputation_score
                   → Gắn cờ cho Admin Dashboard (U015)
```

---

## 6. Use Cases — 15 Use Cases (U001–U015)

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
| U012 | Thanh toán VNPAY | Reader, VNPAY | S09, S10 | FR-12 |
| U013 | Kiểm duyệt nội dung AI | AI Engine, Admin | S20 | FR-13 |
| U014 | Giám sát cam kết lộ trình | System Scheduler, Author, Admin | S18 | FR-14 |
| U015 | Quản trị hệ thống | Admin | S19, S20, S21 | FR-15 |

---

## 7. Màn hình (21 Screens) — S01 đến S21

| ID | Tên màn hình | Route (gợi ý) | Actor | Use Case |
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

---

## 8. API Backend — FastAPI Routes (theo module)

### Auth (`/api/auth`)
```
POST /api/auth/register       → U001: Đăng ký, hash Bcrypt, lưu users+profiles
POST /api/auth/login          → U001: Đăng nhập, trả JWT
POST /api/auth/reset-password → U001: Gửi OTP qua email
```

### Stories (`/api/stories`)
```
GET    /api/stories                  → Danh sách (filter: category, status)
POST   /api/stories                  → U003: Tạo tác phẩm mới (Author)
GET    /api/stories/{id}             → Chi tiết tác phẩm
PUT    /api/stories/{id}             → U003: Cập nhật thông tin
GET    /api/stories/{id}/chapters    → Danh sách chương
```

### Chapters (`/api/chapters`)
```
POST   /api/chapters                 → U004: Tạo chương mới (draft)
PUT    /api/chapters/{id}            → U004: Lưu nháp / autosave
POST   /api/chapters/{id}/publish   → U005: Xuất bản → push RabbitMQ
GET    /api/chapters/{id}            → U007: Đọc nội dung chương
```

### Search (`/api/search`)
```
GET    /api/search?q=...             → Tìm kiếm theo từ khóa
POST   /api/search/semantic          → U008: AI semantic search qua pgvector
```

### AI (`/api/ai`)
```
POST   /api/ai/suggest              → U006: Gợi ý tình tiết (context ≤ 1000 từ)
POST   /api/ai/recommend            → U009: Đề xuất truyện cá nhân hóa
```

### Comments & Reviews (`/api`)
```
GET    /api/chapters/{id}/comments   → Danh sách bình luận
POST   /api/chapters/{id}/comments   → U010: Đăng bình luận
POST   /api/stories/{id}/reviews     → U010: Đánh giá tác phẩm
```

### Membership & Payment (`/api`)
```
GET    /api/membership/plans         → Danh sách gói
POST   /api/membership/checkout      → U011+U012: Tạo transaction + VNPAY URL
POST   /api/payment/vnpay-ipn        → U012: IPN callback từ VNPAY (verify checksum)
```

### Admin (`/api/admin`)
```
GET    /api/admin/moderation-queue   → U015: Danh sách chương flagged/pending
POST   /api/admin/moderation/{id}/approve  → U013: Admin duyệt
POST   /api/admin/moderation/{id}/reject   → U013: Admin từ chối
GET    /api/admin/stats              → U015: Số liệu tổng quan
```

### WebSocket
```
WS /ws/draft/{chapter_id}           → U004: Autosave real-time (< 200ms)
WS /ws/notifications/{user_id}      → U013, U014: Push kết quả duyệt, nhắc lịch
WS /ws/comments/{chapter_id}        → U010: Real-time comments
```

---

## 9. Class Model nhanh

```python
# Các class nghiệp vụ chính
User          → login(), register()
Story         → updateInfo()
Chapter       → saveDraft(), publish()   # publish() → RabbitMQ
Comment       → edit(), delete()
Review        → submitReview()           # UNIQUE (user_id, story_id)
MembershipPlan → getDetails()
Transaction   → processPayment()         # Tạo VNPAY URL
AIModerationLog → logResult()           # Ghi kết quả Gemini
PublishSchedule → checkSchedule()       # Cron trigger
StoryEmbedding → generateVector()       # Gọi Gemini Embeddings API
```

---

## 10. Quy tắc quan trọng khi code

### Bảo mật
- Mật khẩu: **luôn dùng Bcrypt**, không MD5/SHA1
- Auth: **JWT** — header `Authorization: Bearer <token>`
- Payment: VNPAY IPN verify **HMAC-SHA512 checksum**, không tin Frontend
- **Không lưu thông tin thẻ/tài khoản ngân hàng** vào DB
- Rate Limiting tại Nginx cho tất cả `/api/` endpoints

### Hiệu năng
- Gemini API call: **luôn qua RabbitMQ** cho moderation (async), không gọi trực tiếp trong request handler
- AI suggest (U006): **giới hạn context ≤ 1000 từ** mỗi lần gọi
- Chapter content: **ưu tiên Redis cache**, fallback PostgreSQL
- `view_count`: tăng trong Redis, **flush về PostgreSQL định kỳ** (không UPDATE mỗi request)
- WebSocket autosave: **debounce 3 giây** phía client trước khi gửi

### Xử lý lỗi AI
- Gemini Rate Limit (429): **giữ task trong RabbitMQ**, retry sau 60s — không mất task
- Gemini timeout: fallback graceful, báo lỗi user-friendly
- pgvector không có kết quả: fallback sang full-text search thông thường

### Frontend
- `moderation_status = 'pending'`: hiển thị badge "Đang duyệt", không ẩn chương khỏi Author
- Chapter Premium (`is_premium=true`) + user chưa có `premium_until`: hiển thị paywall S09
- Reader Mode (S07): cấu hình đọc lưu `localStorage` (font size, dark mode, width)
- Author Studio (S16): AI Sidebar dùng context 1000 từ gần nhất, hiển thị 3 gợi ý

### Database
- Dùng **`gen_random_uuid()`** cho tất cả PK (không auto-increment)
- pgvector index: `ivfflat` với `vector_cosine_ops` cho bảng `story_embeddings`
- `ON DELETE CASCADE` cho quan hệ parent-child (story→chapters, chapter→comments)
- `ON DELETE SET NULL` cho `transactions.user_id` (giữ lịch sử dù xóa tài khoản)

---

## 11. Non-Functional Requirements (NFR) — Tham chiếu khi thiết kế

| NFR | Yêu cầu | Giải pháp kỹ thuật |
|---|---|---|
| AI Search response | < 1.5 giây | pgvector ivfflat index |
| Autosave latency | < 200ms | WebSocket + Redis pub/sub |
| Chapter load | < 0.5 giây | Redis cache + Next.js SSR |
| Publish response | < 500ms | HTTP 202 + async RabbitMQ |
| AI Suggest | < 5 giây | Gemini API trực tiếp, context ≤ 1000 từ |
| VNPAY update | < 2 giây | IPN backend-to-backend |
| AI Moderation | < 5 phút | Background Worker |
| Uptime | ≥ 99.5% | GCP + Daily backup GCS |
| Schedule reminder | < 10 phút | Cron job mỗi 1 giờ |

---

## 12. Hướng dẫn cho Agent khi nhận task

### Khi viết Backend (FastAPI)
1. Xác định Use Case ID (U001-U015) liên quan
2. Tìm table cần thao tác trong mục 4.2
3. Kiểm tra luồng nghiệp vụ ở mục 5 trước khi viết handler
4. Với mọi task AI: đẩy RabbitMQ, không gọi Gemini trong request handler
5. Với payment: xác minh checksum VNPAY trước khi cập nhật DB

### Khi viết Frontend (Next.js)
1. Xác định Screen ID (S01-S21) và route tương ứng (mục 7)
2. Kiểm tra actor/role có quyền truy cập screen này không
3. S16 Author Studio: 3 cột (dàn ý | editor | AI sidebar)
4. S07 Reader Mode: ẩn navbar, lưu config vào localStorage

### Khi debug
1. `moderation_status` không đổi → kiểm tra RabbitMQ consumer có đang chạy
2. Semantic search không ra kết quả → kiểm tra `story_embeddings` đã có data chưa
3. VNPAY IPN không nhận → kiểm tra checksum HMAC-SHA512 và endpoint đúng
4. WebSocket ngắt → kiểm tra Redis pub/sub connection

### Khi thêm tính năng mới
1. Cập nhật Use Case table ở mục 6
2. Nếu cần bảng DB mới: tuân thủ UUID PK, timestamps, CASCADE rules
3. Tính năng AI mới: luôn có fallback khi Gemini down
4. Giữ nguyên pattern: Nginx → FastAPI → Service → Repository → PostgreSQL/Redis

---

*Tài liệu gốc: Proposal.md, Requirement.md, Design.md — Nhóm 1, Intro2SE HCMUS 2025-2026*