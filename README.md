<div align="center">

# ✦ YAG — Nền Tảng Tiểu Thuyết Thông Minh Tích Hợp AI ✦

### *"Viết truyện bằng cảm hứng, để AI lo phần còn lại."*

[![CI/CD Pipeline](https://github.com/zeus058/SE_Writing_Web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/zeus058/SE_Writing_Web/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-1.5_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![Google Cloud](https://img.shields.io/badge/Cloud_Run-Serverless-4285F4?logo=google-cloud&logoColor=white)](https://cloud.google.com/run)

---

**YAG (Writing Novels Web)** là nền tảng Web SaaS đột phá dành cho cộng đồng yêu thích truyện chữ. Tích hợp **Trợ lý Ảo Miu AI** hỗ trợ tác giả phát triển cốt truyện, tự động kiểm duyệt nội dung, tìm kiếm truyện bằng ngôn ngữ tự nhiên qua **Vector Database**, kết nối thời gian thực giữa tác giả và độc giả.

[🌐 Truy cập Website](#) &nbsp;·&nbsp; [📖 API Documentation](#) &nbsp;·&nbsp; [📋 Báo lỗi](https://github.com/zeus058/SE_Writing_Web/issues)

</div>

---

## 📌 Mục lục

1. [Tính năng nổi bật](#-tính-năng-nổi-bật)
2. [Kiến trúc Production & Công nghệ](#-kiến-trúc-production--công-nghệ)
3. [Sơ đồ hạ tầng triển khai](#-sơ-đồ-hạ-tầng-triển-khai)
4. [Kiến trúc hệ thống & Luồng vận hành](#-kiến-trúc-hệ-thống--luồng-vận-hành)
5. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
6. [Hướng dẫn khởi chạy Local Development](#-hướng-dẫn-khởi-chạy-local-development)
7. [Triển khai Production](#-triển-khai-production)
8. [CI/CD Pipeline](#-cicd-pipeline)
9. [Kiểm thử & Chất lượng](#-kiểm-thử--chất-lượng)
10. [Quy trình đóng góp](#-quy-trình-đóng-góp)
11. [Tác giả](#-tác-giả)
12. [Giấy phép](#-giấy-phép)

---

## 🚀 Tính năng nổi bật

<table>
<tr>
<td width="50%">

### 🤖 Trợ lý Ảo Miu AI
Tích hợp **Gemini API** tại Sidebar soạn thảo, phân tích ngữ cảnh bản thảo và đề xuất **3 phương án phát triển cốt truyện** khi tác giả bí ý tưởng.

### 🔍 AI Semantic Search
Tìm kiếm truyện bằng câu nói tự nhiên — *"nam chính hacker xuyên không"* — nhờ **pgvector** đo Cosine Similarity trên Vector Embeddings 1536 chiều.

### ⚡ Autosave Thời gian thực
Soạn thảo với **WebSocket** đồng bộ bản thảo tức thì, độ trễ **< 200ms**. Không bao giờ mất bản thảo.

</td>
<td width="50%">

### 🛡️ Kiểm duyệt AI tự động
Quét nội dung nhạy cảm qua **Cloud Pub/Sub** pipeline bất đồng bộ — tác giả không cần chờ, hệ thống tự thông báo kết quả qua WebSocket.

### 💎 Membership & Thanh toán
Mô hình phân quyền RBAC, thanh toán qua **PayOS (VietQR)** với xác thực **Webhook** backend-to-backend an toàn tuyệt đối.

### 📊 Admin Dashboard
Bảng điều khiển quản trị: kiểm duyệt nội dung, thống kê hệ thống, quản lý người dùng, audit log hành động.

</td>
</tr>
</table>

---

## 💻 Kiến trúc Production & Công nghệ

YAG được thiết kế theo kiến trúc **Serverless-First**, tối ưu chi phí với khả năng auto-scale, phân tách rõ ràng các phân hệ nghiệp vụ:

### Frontend & CDN
| Công nghệ | Vai trò |
|---|---|
| **Next.js 16** (React 19, TypeScript) | Framework frontend — App Router, SSR/SSG |
| **TailwindCSS v4** | Design system — Utility-first CSS |
| **Vercel** | Hosting & CDN toàn cầu — Auto build/deploy từ GitHub |
| **Cloudflare** | DNS, WAF chống DDoS (Proxy mode), ẩn IP hạ tầng |
| **Namecheap / Name.com** | Tên miền (`.tech` / `.me` miễn phí qua GitHub Student Pack) |

### Backend & Compute
| Công nghệ | Vai trò |
|---|---|
| **FastAPI** (Python 3.11) | API Backend — Modular Monolith, async-ready |
| **Gunicorn + Uvicorn** | ASGI Server — Production-grade với UvicornWorker |
| **Google Cloud Run** | Serverless container hosting — Auto-scale to zero |
| **Google Cloud Functions** | Worker xử lý tác vụ nền (AI moderation, email, webhook) |
| **Docker** | Multi-stage builds — Đóng gói backend & frontend |

### Database, Cache & Storage
| Công nghệ | Vai trò |
|---|---|
| **Supabase** (PostgreSQL 16 + pgvector) | CSDL chính — Connection Pooling (PgBouncer/Supavisor) |
| **Upstash** (Serverless Redis) | Cache chiến lược — Giảm 80-90% query vào DB |
| **Cloudinary** | CDN media — Ảnh bìa, avatar, auto-convert WebP/AVIF |
| **Google Cloud Storage** (GCS) | Backup database định kỳ tự động |

### AI & Messaging
| Công nghệ | Vai trò |
|---|---|
| **Google AI Studio** (Gemini 1.5 Flash) | AI Engine — Gợi ý cốt truyện, kiểm duyệt, embeddings |
| **Gemini text-embedding-004** | Vector Embeddings 1536 chiều cho Semantic Search |
| **Google Cloud Pub/Sub** | Message Queue bất đồng bộ — Retry tự động khi thất bại |

### Thanh toán & Tích hợp
| Công nghệ | Vai trò |
|---|---|
| **PayOS** (VietQR API) | Cổng thanh toán VietQR động — Webhook xác nhận tự động |

### Vận hành, Bảo mật & CI/CD
| Công nghệ | Vai trò |
|---|---|
| **GitHub Actions** | CI/CD Pipeline — Lint → Test → Build → Deploy |
| **Google Secret Manager** | Két sắt bảo mật trung tâm — API keys, DB passwords |
| **Google Cloud Logging & Error Reporting** | Giám sát log, cảnh báo lỗi 500/timeout |
| **APScheduler** | Cron jobs — Schedule scan, view count flush |

---

## 🏗 Sơ đồ hạ tầng triển khai

```mermaid
graph TD
    classDef user fill:#6366F1,stroke:#4338CA,stroke-width:2px,color:#fff,font-weight:bold;
    classDef cdn fill:#F97316,stroke:#C2410C,stroke-width:2px,color:#fff;
    classDef frontend fill:#000000,stroke:#333,stroke-width:2px,color:#fff;
    classDef compute fill:#4285F4,stroke:#1A73E8,stroke-width:2px,color:#fff;
    classDef db fill:#336791,stroke:#1B4F72,stroke-width:2px,color:#fff;
    classDef cache fill:#DC2626,stroke:#991B1B,stroke-width:2px,color:#fff;
    classDef ai fill:#0EA5E9,stroke:#0369A1,stroke-width:2px,color:#fff;
    classDef mq fill:#22C55E,stroke:#15803D,stroke-width:2px,color:#fff;
    classDef pay fill:#A855F7,stroke:#7C3AED,stroke-width:2px,color:#fff;
    classDef sec fill:#EAB308,stroke:#A16207,stroke-width:2px,color:#fff;
    classDef media fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff;
    classDef storage fill:#78716C,stroke:#44403C,stroke-width:2px,color:#fff;

    User["👤 Người dùng"]:::user

    subgraph EdgeLayer["🌐 Edge Layer"]
        CF["Cloudflare DNS + WAF + DDoS Protection"]:::cdn
        Vercel["Vercel CDN + Next.js 16 SSR"]:::frontend
    end

    subgraph GCP["☁️ Google Cloud Platform"]
        CloudRun["Cloud Run — FastAPI Backend (Auto-scale)"]:::compute
        CloudFn["Cloud Functions — AI Workers"]:::compute
        PubSub["Cloud Pub/Sub — Message Queue"]:::mq
        SecMgr["Secret Manager — Két sắt API Keys"]:::sec
        Logging["Cloud Logging & Error Reporting"]:::sec
        GCS["Cloud Storage — DB Backups"]:::storage
    end

    subgraph DataLayer["💾 Data Layer (Managed Services)"]
        Supabase["Supabase — PostgreSQL 16 + pgvector"]:::db
        Upstash["Upstash — Serverless Redis Cache"]:::cache
        Cloudinary["Cloudinary — Media CDN (WebP/AVIF)"]:::media
    end

    subgraph AILayer["🧠 AI Layer"]
        Gemini["Google AI Studio — Gemini 1.5 Flash"]:::ai
        Embed["text-embedding-004 — Vector 1536D"]:::ai
    end

    PayOS["💳 PayOS — VietQR Payment Gateway"]:::pay

    User --> CF
    CF --> Vercel
    Vercel -->|"/api/*, /ws/*"| CloudRun
    CloudRun --> Supabase
    CloudRun --> Upstash
    CloudRun --> PubSub
    CloudRun --> SecMgr
    CloudRun --> Logging
    CloudRun --> Cloudinary
    PubSub --> CloudFn
    CloudFn --> Gemini
    CloudFn --> Embed
    CloudFn --> Supabase
    Embed --> Supabase
    PayOS -->|"Webhook IPN"| CloudRun
    Supabase -.->|"Backup"| GCS
```

---

## 📐 Kiến trúc hệ thống & Luồng vận hành

### 1. Kiến trúc hệ thống tổng thể
```mermaid
graph TD
    classDef client fill:#3B82F6,stroke:#1D4ED8,stroke-width:2px,color:#fff;
    classDef gateway fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef service fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff;
    classDef store fill:#EF4444,stroke:#B91C1C,stroke-width:2px,color:#fff;

    Client["Next.js Web Portal (Reader / Creator Studio)"]:::client
    CF["Cloudflare (WAF, CDN, DDoS Protection)"]:::gateway
    GW["FastAPI API Gateway & Auth (JWT, Bcrypt)"]:::gateway
    
    StorySvc["Story & Content Service"]:::service
    CommSvc["Community & Realtime Service (WebSockets)"]:::service
    PaySvc["Payment & Membership Service (PayOS)"]:::service
    AISvc["AI Smart Engine (Gemini API)"]:::service
    
    Broker["Cloud Pub/Sub Message Queue"]:::gateway
    Worker["Cloud Functions — Async Workers"]:::service
    
    Postgres["Supabase PostgreSQL (Relational Storage)"]:::store
    PgVector["pgvector (Semantic Embeddings 1536D)"]:::store
    Redis["Upstash Redis (Cache, Session, View Count)"]:::store

    Client --> CF
    CF --> GW
    
    GW --> StorySvc
    GW --> CommSvc
    GW --> PaySvc
    GW --> AISvc
    
    StorySvc --> Broker
    Broker --> Worker
    Worker --> AISvc
    Worker --> Postgres
    
    StorySvc --> Postgres
    CommSvc --> Postgres
    PaySvc --> Postgres
    AISvc --> PgVector
    
    StorySvc --> Redis
    CommSvc --> Redis
    
    Postgres --> PgVector
```

### 2. Thiết kế Cơ sở Dữ liệu (16 bảng)
```mermaid
erDiagram
    users {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar role
        timestamp premium_until
        timestamp created_at
    }
    profiles {
        uuid user_id PK_FK
        varchar display_name
        varchar avatar_url
        text bio
        integer reputation_score
    }
    stories {
        uuid id PK
        uuid author_id FK
        varchar title UK
        text description
        varchar cover_url
        varchar category
        varchar status
        integer view_count
        decimal rating_avg
    }
    chapters {
        uuid id PK
        uuid story_id FK
        integer chapter_number
        varchar title
        text content
        varchar moderation_status
        boolean is_premium
        timestamp publish_at
    }
    story_embeddings {
        uuid story_id PK_FK
        vector embedding
        text plot_summary
    }
    comments {
        uuid id PK
        uuid user_id FK
        uuid chapter_id FK
        text content
        uuid parent_id FK
    }
    reviews {
        uuid id PK
        uuid user_id FK
        uuid story_id FK
        integer rating
        text content
    }
    transactions {
        uuid id PK
        uuid user_id FK
        varchar plan_id FK
        decimal amount
        varchar vnp_txn_ref UK
        varchar status
    }
    notifications {
        uuid id PK
        uuid user_id FK
        varchar type
        varchar title
        text message
        boolean is_read
    }

    users ||--|| profiles : "has"
    users ||--o{ stories : "writes"
    users ||--o{ transactions : "pays"
    users ||--o{ notifications : "receives"
    stories ||--|{ chapters : "contains"
    stories ||--|| story_embeddings : "embeds"
    stories ||--o{ reviews : "has"
    chapters ||--o{ comments : "has"
    comments ||--o{ comments : "replies"
```

### 3. Luồng kiểm duyệt AI tự động & Soạn thảo thời gian thực
```mermaid
sequenceDiagram
    autonumber
    actor Creator as Tác giả
    participant Client as Next.js (Vercel)
    participant API as FastAPI (Cloud Run)
    participant Queue as Cloud Pub/Sub
    participant DB as Supabase PostgreSQL
    participant Worker as Cloud Functions Worker
    participant AI as Gemini AI API
    participant WS as WebSocket Server

    Note over Creator, Client: Luồng 1: Autosave thời gian thực
    Creator->>Client: Nhập liệu chương truyện
    Client->>API: Gửi bản nháp qua WebSocket (debounce 3s)
    API->>DB: Cập nhật nội dung chương (Draft)
    API-->>Client: Phản hồi Đã lưu (< 200ms)

    Note over Creator, Client: Luồng 2: Xuất bản & Kiểm duyệt AI ngầm
    Creator->>Client: Nhấn nút "Xuất bản chương"
    Client->>API: HTTP POST /publish (ChapterID)
    API->>DB: Đổi trạng thái sang PENDING (Chờ duyệt)
    API->>Queue: Đẩy Task "Duyệt chương" vào Cloud Pub/Sub
    API-->>Client: HTTP 202 Accepted (< 500ms)
    
    Note over Queue, Worker: Xử lý ngầm (Serverless Worker)
    Queue->>Worker: Trigger Cloud Function xử lý task
    Worker->>AI: Gửi nội dung quét vi phạm (NSFW, bạo lực)
    AI-->>Worker: Trả kết quả (Confidence Score, Vi phạm)
    
    alt Nội dung An toàn (Approved)
        Worker->>DB: APPROVED + Sinh Vector Embedding (1536D)
        Worker->>DB: INSERT notification (user_id=author)
    else Phát hiện vi phạm (Rejected/Flagged)
        Worker->>DB: REJECTED + Ghi ai_moderation_logs
        Worker->>DB: INSERT notification + admin_alert
    end
    
    Worker->>WS: Phát sự kiện "Duyệt hoàn tất"
    WS-->>Client: Push thông báo real-time qua WebSocket
    Client->>Creator: Hiển thị trạng thái trên Dashboard
```

### 4. Luồng thanh toán PayOS (VietQR) an toàn
```mermaid
sequenceDiagram
    autonumber
    actor Reader as Độc giả
    participant Client as Next.js (Vercel)
    participant API as FastAPI (Cloud Run)
    participant Pay as PayOS Gateway (VietQR)
    participant DB as Supabase PostgreSQL

    Reader->>Client: Chọn gói Membership (Tháng/Quý/Năm)
    Client->>API: HTTP POST /membership/checkout
    API->>DB: Khởi tạo giao dịch (status: PENDING)
    API-->>Client: Trả về URL thanh toán PayOS + mã VietQR
    Client->>Reader: Hiển thị QR Code thanh toán
    Reader->>Pay: Quét QR bằng Banking App & xác nhận
    
    Note over Pay, API: Xác thực Webhook Backend-to-Backend
    Pay->>API: Gửi Webhook xác nhận giao dịch
    API->>API: Verify chữ ký Webhook (HMAC checksum)
    
    alt Giao dịch Hợp lệ & Thành công
        API->>DB: UPDATE transaction → SUCCESS
        API->>DB: UPDATE user.premium_until += duration_days
        API-->>Pay: HTTP 200 OK
    else Chữ ký không khớp / Thất bại
        API->>DB: UPDATE transaction → FAILED
        API-->>Pay: HTTP 400 Bad Request
    end

    Pay-->>Client: Redirect về Return URL
    Client->>API: Query trạng thái giao dịch
    API->>DB: SELECT transaction status
    API-->>Client: Trả về kết quả thực tế
    Client->>Reader: Hiển thị màn hình kết quả thanh toán
```

### 5. Luồng tìm kiếm ngữ nghĩa AI Semantic Search
```mermaid
sequenceDiagram
    autonumber
    actor Reader as Độc giả
    participant Client as Next.js (Vercel)
    participant API as FastAPI (Cloud Run)
    participant Gemini as Gemini Embedding API
    participant PG as Supabase pgvector

    Reader->>Client: Nhập mô tả truyện ("nam chính hacker xuyên không")
    Client->>API: HTTP POST /search/semantic
    API->>Gemini: Gọi text-embedding-004 → Vector 1536D
    Gemini-->>API: Trả về mảng Vector (1536 floats)
    API->>PG: SELECT ... ORDER BY embedding <=> query_vector LIMIT 20
    Note over PG: Cosine Similarity trên ivfflat index
    PG-->>API: Danh sách Story ID + Similarity Score
    API->>PG: JOIN stories để lấy metadata (title, cover, rating)
    API-->>Client: Trả về kết quả (< 1.5 giây)
    Client->>Reader: Hiển thị thẻ truyện xếp theo độ khớp
```

---

## 📂 Cấu trúc thư mục

```text
SE_Writing_Web/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD Pipeline (Lint → Test → Build → Deploy)
├── nginx/
│   ├── nginx.conf                    # Reverse proxy (SSL, Rate Limiting, WebSocket)
│   └── certs/                        # SSL certificates
├── src/
│   ├── frontend/                     # ── Next.js 16 App ──
│   │   ├── Dockerfile                # Multi-stage: deps → builder → runtime
│   │   ├── src/
│   │   │   ├── app/                  # App Router — 21+ screens (S01-S21)
│   │   │   ├── components/           # React components (auth, features, layout, ui)
│   │   │   ├── data/                 # Mock data / JSON metadata
│   │   │   └── lib/                  # API client, Auth context, WebSocket, env config
│   │   └── package.json
│   └── backend/                      # ── FastAPI App ──
│       ├── Dockerfile                # Multi-stage: builder → runtime (python:3.11-slim)
│       ├── worker.py                 # Entry point cho Background Worker
│       ├── migrations/               # Versioned SQL migrations (V1, V2, V3...)
│       ├── tests/                    # pytest test suite (14 test files)
│       └── app/
│           ├── main.py               # FastAPI entry, middleware, WebSocket routes
│           ├── manage_migrations.py  # SQL migration runner
│           ├── seed.py               # Database seeder
│           ├── api/                  # Route handlers (v1/endpoints/)
│           ├── core/                 # Config, Database, Security (JWT, Bcrypt)
│           ├── models/               # 16 SQLAlchemy ORM models
│           ├── schemas/              # Pydantic request/response schemas
│           ├── services/             # 11 Business logic services
│           └── worker/               # Message Queue consumer (moderation pipeline)
├── docs/
│   ├── tools_deloy.md                # Quy hoạch hạ tầng triển khai Production
│   ├── fix/                          # Bug fix documentation
│   └── task/                         # Task documentation
├── docker-compose.yml                # 7 services, 3 profiles (default, app, prod)
├── AGENTS.md                         # Bản đồ kỹ thuật toàn dự án cho AI Agent
└── README.md                         # ← File này
```

---

## 🛠 Hướng dẫn khởi chạy Local Development

### Yêu cầu hệ thống
- **Node.js** ≥ 20.x &nbsp;·&nbsp; **Python** ≥ 3.11 &nbsp;·&nbsp; **Docker Desktop** &nbsp;·&nbsp; **Git**

### 1. Clone & khởi chạy Infrastructure

```bash
git clone https://github.com/zeus058/SE_Writing_Web.git
cd SE_Writing_Web

# Khởi chạy PostgreSQL (pgvector), Redis, RabbitMQ
docker-compose up -d
```

### 2. Setup Backend (FastAPI)

```bash
cd src/backend
cp .env.example .env          # Điền GEMINI_API_KEY và các secrets

# Tạo virtual environment
python -m venv .venv
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # macOS/Linux

pip install -r requirements.txt

# Apply database migrations
python -m app.manage_migrations

# (Optional) Seed dữ liệu mẫu
python -m app.seed

# Khởi chạy API server
uvicorn app.main:app --reload --port 8000
```

### 3. Setup Worker (Terminal riêng)

```bash
cd src/backend
.venv\Scripts\activate
python worker.py               # RabbitMQ moderation consumer
```

### 4. Setup Frontend (Terminal riêng)

```bash
cd src/frontend
cp .env.example .env
npm install
npm run dev                    # → http://localhost:3000
```

### 5. Biến môi trường quan trọng

<details>
<summary>📋 <strong>Backend (.env)</strong> — Click để mở</summary>

```env
# Application
ENVIRONMENT=development
SECRET_KEY=your_random_secret_key

# Database (Docker default)
DATABASE_URL=postgresql://yag_user:yag_secret@localhost:5432/yag_db

# Redis & RabbitMQ (Docker default)
REDIS_HOST=localhost
RABBITMQ_HOST=localhost
RABBITMQ_USER=yag_mq
RABBITMQ_PASSWORD=yag_mq_secret

# AI Engine (Bắt buộc cho AI features)
GEMINI_API_KEY=your_google_gemini_api_key

# Cloudinary (Bắt buộc cho upload ảnh)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

</details>

<details>
<summary>📋 <strong>Frontend (.env)</strong> — Click để mở</summary>

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NEXT_PUBLIC_DEPLOY_ENV=development
NEXT_PUBLIC_USE_MOCKS=false
```

</details>

### 6. Verify

| Service | URL | Mô tả |
|---|---|---|
| Frontend | http://localhost:3000 | Web Portal |
| Backend API Docs | http://localhost:8000/docs | Swagger UI |
| Health Check | http://localhost:8000/health/ready | DB + Redis + RabbitMQ status |
| RabbitMQ Dashboard | http://localhost:15672 | User: `yag_mq` / `yag_mq_secret` |

### 7. Full-stack Docker (Alternative)

```bash
# Chạy tất cả trong Docker (không cần install Node/Python)
docker-compose --profile app up -d --build
# → Nginx: http://localhost (port 80)
```

---

## 🚢 Triển khai Production

YAG sử dụng kiến trúc **Serverless-First** để tối ưu chi phí và khả năng chịu tải:

### Tổng quan hạ tầng Production

```
┌────────────────────────────────────────────────────────────────────┐
│                    🌐 PRODUCTION INFRASTRUCTURE                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Cloudflare]  DNS + WAF + DDoS Protection                        │
│       │                                                            │
│       ▼                                                            │
│  [Vercel]  Next.js 16 Frontend (CDN toàn cầu, auto-deploy)       │
│       │                                                            │
│       ▼  /api/*, /ws/*                                            │
│  [Cloud Run]  FastAPI Backend (Docker, auto-scale to zero)        │
│       │                                                            │
│       ├──▶ [Supabase]  PostgreSQL 16 + pgvector (Connection Pool) │
│       ├──▶ [Upstash]   Serverless Redis (Cache, Session)          │
│       ├──▶ [Cloud Pub/Sub]  Message Queue (→ Cloud Functions)     │
│       ├──▶ [Cloudinary]    Media CDN (WebP/AVIF auto-convert)     │
│       ├──▶ [Secret Manager]  API Keys, DB passwords               │
│       └──▶ [PayOS]  VietQR Payment Gateway (Webhook)             │
│                                                                    │
│  [Cloud Functions]  AI Workers (Gemini moderation + embeddings)   │
│  [Cloud Logging]    Monitoring & Error Reporting                  │
│  [GCS]              Database Backup (daily cron)                  │
│                                                                    │
│  [Gemini AI]  gemini-1.5-flash + text-embedding-004               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Bước triển khai

<details>
<summary>📋 <strong>Bước 1: Cấu hình Managed Services</strong></summary>

```bash
# 1. Supabase — Tạo project, bật pgvector extension
#    Dashboard → SQL Editor → CREATE EXTENSION IF NOT EXISTS vector;
#    Connection string: postgresql://postgres.xxx:pass@aws-0-region.pooler.supabase.com:6543/postgres

# 2. Upstash — Tạo Redis database
#    Connection: rediss://default:TOKEN@REGION.upstash.io:6379

# 3. Cloudinary — Tạo account, lấy API credentials

# 4. Google Cloud — Bật APIs: Cloud Run, Cloud Functions, Pub/Sub, Secret Manager
gcloud services enable run.googleapis.com cloudfunctions.googleapis.com pubsub.googleapis.com secretmanager.googleapis.com

# 5. PayOS — Đăng ký merchant, lấy API Key + Webhook Secret
```

</details>

<details>
<summary>📋 <strong>Bước 2: Deploy Backend lên Cloud Run</strong></summary>

```bash
# Build & push Docker image
gcloud builds submit --tag gcr.io/PROJECT_ID/yag-backend ./src/backend

# Deploy Cloud Run service
gcloud run deploy yag-backend \
  --image gcr.io/PROJECT_ID/yag-backend \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production \
  --set-secrets DATABASE_URL=yag-db-url:latest,SECRET_KEY=yag-secret-key:latest,GEMINI_API_KEY=yag-gemini-key:latest
```

</details>

<details>
<summary>📋 <strong>Bước 3: Deploy Frontend lên Vercel</strong></summary>

```bash
# Kết nối GitHub repo với Vercel
# Settings → Environment Variables:
#   NEXT_PUBLIC_APP_URL = https://yourdomain.com
#   NEXT_PUBLIC_API_BASE_URL = https://yag-backend-xxx.run.app
#   NEXT_PUBLIC_WS_BASE_URL = wss://yag-backend-xxx.run.app
#   NEXT_PUBLIC_DEPLOY_ENV = production

# Auto-deploy khi push to main branch
```

</details>

<details>
<summary>📋 <strong>Bước 4: Cấu hình Cloudflare DNS</strong></summary>

```
yourdomain.com    → CNAME → cname.vercel-dns.com (Proxied ☁️)
api.yourdomain.com → CNAME → yag-backend-xxx.run.app (Proxied ☁️)

# Bật: SSL Full (Strict), Always Use HTTPS, HSTS
# Bật: Under Attack Mode (khi cần chống DDoS)
```

</details>

<details>
<summary>📋 <strong>Bước 5: Secrets & Monitoring</strong></summary>

```bash
# Lưu secrets vào Google Secret Manager
echo -n "your_db_url" | gcloud secrets create yag-db-url --data-file=-
echo -n "your_secret_key" | gcloud secrets create yag-secret-key --data-file=-
echo -n "your_gemini_key" | gcloud secrets create yag-gemini-key --data-file=-

# Cấu hình Cloud Logging alerts cho 5xx errors
# Console → Logging → Log-based Metrics → Create Alert Policy
```

</details>

---

## ⚙ CI/CD Pipeline

```mermaid
graph LR
    classDef trigger fill:#6366F1,stroke:#4338CA,stroke-width:2px,color:#fff;
    classDef job fill:#3B82F6,stroke:#1D4ED8,stroke-width:2px,color:#fff;
    classDef deploy fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef fail fill:#EF4444,stroke:#B91C1C,stroke-width:2px,color:#fff;

    Push["Push / PR to dev, main"]:::trigger
    
    Backend["🐍 Backend CI<br/>Python 3.11<br/>Flake8 + pytest --cov"]:::job
    Frontend["⚛ Frontend CI<br/>Node.js 20<br/>ESLint + next build"]:::job
    
    Deploy["🚀 Auto Deploy<br/>Migrations → Production DB<br/>Vercel rebuild<br/>Cloud Run redeploy"]:::deploy
    
    Push --> Backend
    Push --> Frontend
    Backend -->|"✅ Pass"| Deploy
    Frontend -->|"✅ Pass"| Deploy
```

| Branch | CI | CD |
|---|---|---|
| `dev` | ✅ Lint + Test + Build | ❌ |
| `main` | ✅ Lint + Test + Build | ✅ Auto-deploy migrations + Vercel + Cloud Run |
| Feature branches | ✅ (on PR) | ❌ |

---

## 🧪 Kiểm thử & Chất lượng

### Backend Test Suite (pytest — 14 test files)

```bash
cd src/backend
pytest --cov=app --cov-report=term-missing -v
```

| Test File | Module | Coverage |
|---|---|---|
| `test_auth.py` | F1: Authentication | Register, Login, JWT, Password Reset |
| `test_payment.py` | F2: VNPAY/PayOS | Checkout, IPN/Webhook Verify |
| `test_membership.py` | F2: Membership | Plans, Status |
| `test_ai_suggestions.py` | F3: AI Engine | Plot Suggestions |
| `test_ai_search_and_recommendations.py` | F3: AI Search | Semantic Search, Recommendations |
| `test_database.py` | Core: DB | Models, Relationships, Migrations |
| `test_moderation.py` | F5: Moderation | AI Content Pipeline |
| `test_publish.py` | F4: Publishing | Chapter Publish Workflow |
| `test_admin.py` | F5: Admin | Dashboard, Queue, Audit |
| `test_notifications.py` | Notifications | CRUD, WebSocket Push |
| `test_profile.py` | F1: Profile | Update, Avatar |
| `test_schedule.py` | F4: Schedule | Cron Jobs, Reminders |
| `test_role_separation.py` | Core: RBAC | Role-based Access Control |
| `test_main.py` | Core: App | Startup, Health Checks |

### Frontend Checks

```bash
cd src/frontend
npm run lint          # ESLint
npm run build         # Type-safe compilation check
```

### Tài liệu QA chuyên sâu
- 📋 [Kế hoạch Kiểm thử (Test_Plan.md)](docs/test/Test_Plan.md) — Môi trường, thiết bị, chỉ tiêu chất lượng
- 🎨 [Kiểm thử UX (Usability Tests)](docs/test/UX_Usability_Tests.md) — 10 kịch bản theo Nguyên lý Nielsen
- ♿ [Kiểm thử A11y (Accessibility)](docs/test/Accessibility_A11y_Tests.md) — WCAG 2.1 AA compliance

---

## 🤝 Quy trình đóng góp

### Branching Strategy

```
main ─────────────────────────────── (stable, auto-deploy)
  │
  ├── dev ────────────────────────── (integration branch)
  │     │
  │     ├── feature/WebSocketAutosave
  │     ├── feature/AISemanticSearch
  │     └── fix/VNPAYSignature
  │
  └── hotfix/critical-bug ────────── (emergency fixes)
```

### Conventional Commits

```
feat: tích hợp trợ lý Miu AI vào Author Studio
fix: khắc phục lỗi trễ hẹn lịch đăng chương
docs: bổ sung kịch bản kiểm thử WCAG A11y
refactor: tối ưu hóa câu lệnh so khớp vector pgvector
perf: thêm Redis cache cho chapter content
test: bổ sung test case cho VNPAY IPN verification
```

### Database Migration Rules

```bash
# ⚠ KHÔNG BAO GIỜ sửa file migration đã apply
# Luôn tạo file MỚI cho thay đổi schema:
migrations/
├── V1__initial_schema.sql          # ✅ Đã apply — KHÔNG SỬA
├── V2__hotfix_users_lock_columns.sql
├── V3__p1_schema_alignment.sql
└── V4__add_new_feature.sql         # ← Thêm ở đây
```

---

## 👥 Tác giả

<div align="center">

Dự án được phát triển bởi **Nhóm 1** — Nhập môn Công nghệ Phần mềm, HCMUS 2025-2026.

Mỗi thành viên đảm nhận **20%** khối lượng công việc, phối hợp nhịp nhàng.

</div>

| Thành viên | Vai trò | Module |
|---|---|---|
| **Trần Gia Hiển** | Product Owner & Testing Lead | F1 — Authentication |
| **Nguyễn Duy Trường** | Software Architect & DB Designer | F2 — Payment & Membership |
| **Phạm Hương Trà** | Business Analyst & QA Engineer | F3 — AI Engine |
| **Huỳnh Yến Nhi** | UI/UX Designer & Conceptualizer | F4 — Stories & Editor |
| **Nguyễn Phú Thọ** | DevOps & Infrastructure Lead | F5 — Admin & Moderation |

---

## 📄 Giấy phép

Dự án được phân phối công khai dưới **MIT License**. Xem chi tiết tại file `LICENSE`.

---

<div align="center">

**⭐ Star repo nếu bạn thấy dự án hữu ích!**

Được xây dựng với ❤️ bởi Nhóm 1 — HCMUS

</div>
