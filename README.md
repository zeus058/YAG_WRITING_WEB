# YAG - Nền Tảng Đọc Và Sáng Tác Tiểu Thuyết Thông Minh Hỗ Trợ Bởi AI

<!-- Badges -->
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg)](https://nodejs.org)
[![Docker Support](https://img.shields.io/badge/docker-supported-blue.svg)](https://www.docker.com)
[![Next.js Support](https://img.shields.io/badge/Next.js-v15.x-black.svg)](https://nextjs.org)
[![FastAPI Support](https://img.shields.io/badge/FastAPI-v0.x-009688.svg)](https://fastapi.tiangolo.com)

**YAG (Writing Novels Web)** là một nền tảng Web SaaS đột phá dành cho cộng đồng yêu thích truyện chữ. Khác biệt với các trang đọc truyện truyền thống, YAG định hình **Cá tính Sáng tạo Riêng** bằng việc tích hợp người bạn đồng hành **Trợ lý Ảo Miu AI** hỗ trợ tác giả phát triển bối cảnh, đồng thời tự động hóa khâu kiểm duyệt nội dung, tối ưu hóa tìm kiếm cốt truyện qua Vector Database, và kết nối thời gian thực (Real-time) sâu sắc giữa tác giả và độc giả.

---

## 📌 Mục lục
1. [Giới thiệu & Tính năng](#-giới-thiệu--tính-năng)
2. [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
3. [Hướng dẫn khởi chạy cục bộ](#-hướng-dẫn-khởi-chạy-cục-bộ)
4. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
5. [Kiến trúc & Luồng vận hành (Architectural Flows)](#-kiến-trúc--luồng-vận-hành-architectural-flows)
6. [Quy trình đóng góp (Git Flow)](#-quy-trình-đóng-góp-git-flow)
7. [Chất lượng & Kiểm thử (QA Testing)](#-chất-lượng--kiểm-thử-qa-testing)
8. [Tác giả](#-tác-giả)
9. [Giấy phép](#-giấy-phép)

---

## 🚀 Giới thiệu & Tính năng

YAG giải quyết bài toán nhức nhối của các tác giả trực tuyến (thiếu ý tưởng giữa chừng, mất bản thảo do kết nối mạng kém, cướp bản quyền) và độc giả (tìm kiếm truyện khó khăn, thiếu không gian thảo luận trực tiếp). Đối tượng hướng tới là hàng triệu độc giả mê đọc sách trực tuyến và các nhà sáng tạo nội dung tự do trên toàn cầu.

### Các tính năng cốt lõi mang cá tính riêng:
- **Trợ lý ảo Miu AI (AI Creator Sidebar):** Được tích hợp mượt mà ở Sidebar bên phải khung soạn thảo, sử dụng **Gemini API** phân tích ngữ cảnh bản thảo để đưa ra 3 phương án phát triển cốt truyện hữu ích khi tác giả bị "bí" ý tưởng.
- **Soạn thảo & Autosave thời gian thực:** Trình soạn thảo văn bản tự động đếm từ và đồng bộ hóa bản thảo tức thời lên hệ thống qua giao thức **WebSockets** với độ trễ cực thấp (< 200ms).
- **Tìm kiếm ngữ nghĩa (AI Semantic Search):** Độc giả tìm kiếm truyện dựa trên mô tả nội dung bằng câu nói tự nhiên thay vì từ khóa cứng nhờ ứng dụng **pgvector** đo lường khoảng cách Vector.
- **Kiểm duyệt tự động & Cam kết lịch đăng:** Quét vi phạm nội dung nhạy cảm tự động bằng AI qua hàng đợi tác vụ **RabbitMQ**, kết hợp Cron Scheduler theo dõi cam kết lộ trình, chấm điểm uy tín tác giả.
- **Membership & Thanh toán VNPay:** Mô hình kinh doanh phân quyền hội viên (RBAC) để xem trước chương Premium, thanh toán bảo mật qua **VNPAY Sandbox IPN**.

---

## 💻 Công nghệ sử dụng

Hệ thống được thiết kế theo kiến trúc **Modular Monolith** kết hợp triết lý **Domain-Driven Design (DDD)** phân tách rõ ràng các phân hệ nghiệp vụ:

- **Frontend:** Next.js 15 (React), CSS (Vanilla CSS & Tailwind CSS), HTML5, WebSockets
- **Backend:** Python (FastAPI), Uvicorn server, RabbitMQ (Message Broker), Redis (Task Queue & Cache)
- **Database:** PostgreSQL (Relational Database), pgvector (Vector Database), Redis (In-memory Cache & View Counter)
- **Cloud Infrastructure & DevOps:** Google Cloud Run (Serverless containers), Supabase Database Cloud, Firebase Storage (Media), Cloudflare (WAF & CDN)

---

## 🛠 Hướng dẫn khởi chạy cục bộ

Để cài đặt và khởi động thử nghiệm dự án YAG trên máy tính của bạn, hãy làm theo các bước tuần tự dưới đây:

### 1. Yêu cầu hệ thống tiên quyết
- **Node.js** (Phiên bản `>= 18.x.x`)
- **Python** (Phiên bản `>= 3.10.x`)
- **Docker & Docker Compose**
- **Git**

### 2. Cài đặt các bước tuần tự
```bash
# Bước 1: Clone dự án về máy
git clone https://github.com/zeus058/SE_Writing_Web.git

# Bước 2: Di chuyển vào thư mục dự án
cd SE_Writing_Web

# Bước 3: Khởi chạy cơ sở hạ tầng nền tảng (PostgreSQL + pgvector, Redis, RabbitMQ)
docker-compose up -d
```

### 3. Cấu hình Biến môi trường (Environment Variables)

#### Backend (FastAPI):
Di chuyển tới `src/backend`, copy file `.env.example` thành `.env` và điền cấu hình thực tế:
```bash
cp .env.example .env
```
Các thông số mẫu quan trạng:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yag
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://yag_mq:yag_mq_secret@localhost:5672/
GEMINI_API_KEY=your_actual_google_gemini_api_key
```

#### Frontend (Next.js):
Di chuyển tới `src/frontend`, copy file `.env.example` thành `.env.local` và điền cấu hình thực tế:
```bash
cp .env.example .env.local
```

### 4. Khởi chạy ứng dụng

#### Chạy Backend FastAPI:
```bash
cd src/backend
python -m venv .venv
source .venv/bin/activate # macOS/Linux hoặc .venv\Scripts\activate trên Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Chạy Frontend Next.js:
```bash
cd src/frontend
npm install
npm run dev
```
*Giao diện Web sẽ sẵn sàng truy cập tại địa chỉ: [http://localhost:3000](http://localhost:3000).*

---

## 📂 Cấu trúc thư mục

Sơ đồ thư mục thể hiện rõ nét thiết kế phân lớp và kiến trúc Modular Monolith của YAG:

```text
├── docs/                      # Các tài liệu đặc tả chất lượng cao qua các giai đoạn
│   ├── requirements/          # Tài liệu Phân tích yêu cầu (Requirement.md)
│   ├── analysis_and_design/   # Tài liệu Thiết kế hệ thống, ERD, Class Diagram (Design.md)
│   ├── management/            # Tài liệu Đề xuất và phân bổ dự án (Proposal.md)
│   └── test/                  # Tài liệu và kịch bản Test Cases (Test_Plan.md)
├── src/                       # Mã nguồn ứng dụng
│   ├── backend/               # FastAPI Server (Python)
│   │   ├── app/
│   │   │   ├── api/           # API Endpoints (Routing)
│   │   │   ├── core/          # Cấu hình hệ thống, biến môi trường
│   │   │   ├── models/        # Database models (SQLAlchemy)
│   │   │   ├── services/      # Business logic (AI Engine, Payment)
│   │   │   └── worker/        # Các consumer chạy ngầm (RabbitMQ Worker)
│   │   └── Dockerfile
│   └── frontend/              # Next.js Web Portal (React/TSX)
│       ├── src/
│       │   ├── app/           # Pages & Routes (App Router)
│       │   ├── components/    # Components chia theo nhóm giao diện (Author, Reader)
│       │   └── lib/           # APIs, Realtime & Auth Helpers
│       └── package.json
├── docker-compose.yml         # Đóng gói hạ tầng DB, Redis, RabbitMQ chạy Local
└── README.md                  # Hướng dẫn sản phẩm này
```

---

## 📐 Kiến trúc & Luồng vận hành (Architectural Flows)

### 1. Kiến trúc Hệ thống Tổng thể
```mermaid
graph TD
    classDef client fill:#3B82F6,stroke:#1D4ED8,stroke-width:2px,color:#fff;
    classDef gateway fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef service fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff;
    classDef store fill:#EF4444,stroke:#B91C1C,stroke-width:2px,color:#fff;

    Client["Next.js Web Portal (Reader / Creator Studio)"]:::client
    CF["Cloudflare (WAF, CDN, HTTPS)"]:::gateway
    GW["FastAPI API Gateway & Auth (JWT, Bcrypt)"]:::gateway
    
    StorySvc["Story & Content Service"]:::service
    CommSvc["Community & Forum Service (WebSockets)"]:::service
    PaySvc["Payment & Membership Service (VNPAY)"]:::service
    AISvc["AI Smart Engine (Gemini API)"]:::service
    
    Broker["RabbitMQ Task Broker"]:::gateway
    Worker["Async Background Worker"]:::service
    
    Postgres["PostgreSQL (Relational Storage)"]:::store
    PgVector["pgvector (Semantic Embeddings)"]:::store
    Redis["Redis (Cache, Session, View Count)"]:::store

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

### 2. Thiết kế Cơ sở Dữ liệu
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
        uuid user_id PK, FK
        varchar display_name
        varchar avatar_url
        text bio
        integer reputation_score
    }
    stories {
        uuid id PK
        uuid author_id FK
        varchar title
        text description
        varchar cover_url
        varchar category
        varchar status
        integer view_count
        decimal rating_avg
        timestamp created_at
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
        timestamp created_at
    }
    story_embeddings {
        uuid story_id PK, FK
        text plot_summary
        vector embedding
        timestamp updated_at
    }
    transactions {
        uuid id PK
        uuid user_id FK
        varchar plan_id FK
        decimal amount
        varchar vnp_txn_ref UK
        varchar vnp_transaction_no UK
        varchar status
        timestamp created_at
    }

    users ||--|| profiles : "has"
    users ||--o{ stories : "writes"
    stories ||--|{ chapters : "contains"
    stories ||--|| story_embeddings : "embeds"
    users ||--o{ transactions : "pays"
```

### 3. Luồng kiểm duyệt tự động & Soạn thảo thời gian thực
```mermaid
sequenceDiagram
    autonumber
    actor Creator as Tác giả
    participant Client as Next.js Web Portal
    participant API as FastAPI Backend
    participant Queue as RabbitMQ Message Queue
    participant DB as PostgreSQL / Supabase
    participant Worker as Async Moderation Worker
    participant AI as Gemini Moderation API
    participant WS as WebSocket Server

    Note over Creator, Client: Luồng 1: Autosave thời gian thực
    Creator->>Client: Nhập liệu chương truyện
    Client->>API: Gửi bản nháp qua WebSocket (autosave)
    API->>DB: Cập nhật nội dung chương (Draft)
    API-->>Client: Phản hồi Đã lưu (<200ms)

    Note over Creator, Client: Luồng 2: Xuất bản và Kiểm duyệt AI ngầm
    Creator->>Client: Nhấn nút "Xuất bản chương"
    Client->>API: HTTP POST /publish (ChapterID)
    API->>DB: Đổi trạng thái sang PENDING (Chờ duyệt)
    API->>Queue: Đẩy Task "Duyệt chương" vào Hàng đợi
    API-->>Client: HTTP 202 Accepted (Báo tác giả đóng tab rảnh tay)
    
    Note over Queue, Worker: Xử lý ngầm (Background Job)
    Queue->>Worker: Lấy Task duyệt chương ra xử lý
    Worker->>AI: Gửi nội dung chương quét từ cấm & nhạy cảm
    AI-->>Worker: Trả kết quả (Confidence Score, Lỗi vi phạm)
    
    alt Nội dung An toàn (Approved)
        Worker->>DB: Đổi trạng thái chapter sang APPROVED & sinh Vector Embedding
    else Phát hiện vi phạm (Rejected)
        Worker->>DB: Đổi trạng thái chapter sang REJECTED
    end
    
    Worker->>WS: Phát sự kiện "Duyệt hoàn tất"
    WS-->>Client: Đẩy thông báo thời gian thực qua WebSocket
    Client->>Creator: Hiển thị trạng thái chương trên Dashboard
```

### 4. Luồng thanh toán gói Membership VNPAY an toàn
```mermaid
sequenceDiagram
    autonumber
    actor Reader as Độc giả
    participant Client as Next.js Web Portal
    participant API as FastAPI Backend
    participant VNP as Cổng VNPAY Gateway
    participant DB as PostgreSQL / Supabase

    Reader->>Client: Chọn gói Membership (Tháng/Quý/Năm)
    Client->>API: HTTP POST /transactions/create
    API->>DB: Khởi tạo giao dịch (Trạng thái: PENDING)
    API-->>Client: Trả về URL thanh toán VNPAY chứa chữ ký số bảo mật
    Client->>Reader: Điều hướng sang trang thanh toán VNPAY
    Reader->>VNP: Thực hiện xác thực & Thanh toán (OTP/Banking App)
    VNP-->>Reader: Hiển thị kết quả thanh toán trên cổng
    
    Note over VNP, API: Xác thực hai chiều an toàn (IPN Callback)
    VNP->>API: Gửi thông báo kết quả ngầm (IPN Backend-to-Backend)
    API->>API: Kiểm tra và xác thực Chữ ký số (HMAC-SHA512 Checksum)
    
    alt Giao dịch Hợp lệ & Thành công
        API->>DB: Đổi trạng thái giao dịch sang SUCCESS
        API->>DB: Cập nhật premium_until cho User tài khoản
        API-->>VNP: Trả về phản hồi {"RspCode":"00", "Message":"Confirm Success"}
    else Chữ ký không khớp hoặc Thất bại
        API->>DB: Đổi trạng thái giao dịch sang FAILED
        API-->>VNP: Trả về phản hồi {"RspCode":"97", "Message":"Invalid Signature"}
    end

    VNP-->>Client: Redirect độc giả về Return URL của Web Portal
    Client->>API: Gửi yêu cầu truy vấn trạng thái giao dịch
    API->>DB: Đọc trạng thái giao dịch thực tế trong PostgreSQL
    API-->>Client: Trả về trạng thái giao dịch hiện tại
    Client->>Reader: Hiển thị màn hình S10 thông báo giao dịch thành công/thất bại
```

### 5. Luồng tìm kiếm ngữ nghĩa bằng AI Semantic Search
```mermaid
sequenceDiagram
    autonumber
    actor Reader as Độc giả
    participant Client as Next.js Web Portal
    participant API as FastAPI Backend
    participant Gemini as Gemini Embedding API
    participant PG as PostgreSQL (pgvector)

    Reader->>Client: Nhập mô tả truyện cần tìm (Ví dụ: "nam chính hacker xuyên không")
    Client->>API: HTTP GET /stories/search?q="..." (Tab AI Semantic)
    API->>Gemini: Gọi API biến text thành Vector Embedding (1536 chiều)
    Gemini-->>API: Trả về mảng số Vector (1536 floats)
    API->>PG: SELECT * FROM story_embeddings ORDER BY embedding <=> query_vector LIMIT 10
    Note over PG: Đo độ tương đồng Cosine Similarity trong Vector Database
    PG-->>API: Trả về danh sách Story ID và điểm tương đồng (Similarity Score)
    API->>PG: Lấy chi tiết thông tin truyện (Title, Author, Cover, Rating)
    API-->>Client: Trả về danh sách truyện khớp nhất (< 1.5 giây)
    Client->>Reader: Hiển thị kết quả tìm kiếm trực quan bằng thẻ truyện
```

---

## 🤝 Quy trình đóng góp (Git Flow)

Để đảm bảo dự án hoạt động ổn định và nhất quán, các thành viên cam kết tuân thủ quy chuẩn đóng góp sau:

1. **Phân nhánh phát triển (Branching strategy):**
   - Nhánh chính thức: `main` (luôn giữ mã nguồn stable).
   - Nhánh chức năng: `feature/TenChucNang` (ví dụ: `feature/WebSocketAutosave`).
   - Nhánh sửa lỗi: `fix/TenLoi` (ví dụ: `fix/VNPAYSignature`).
   
2. **Quy chuẩn thông điệp Commit (Conventional Commits):**
   - `feat: tích hợp trợ lý Miu AI vào Author Studio`
   - `fix: khắc phục lỗi trễ hẹn lịch đăng chương`
   - `docs: bổ sung kịch bản kiểm thử WCAG A11y`
   - `refactor: tối ưu hóa câu lệnh so khớp vector pgvector`

---

## 🧪 Chất lượng & Kiểm thử (QA Testing)

Mã nguồn dự án được bảo chứng chất lượng nhờ quy trình rà soát và các bộ kịch bản kiểm thử tự động/thủ công nghiêm ngặt đính kèm trong thư mục [docs/test/](file:///d:/SE/PROJECT/SE_Writing_Web/docs/test):
- **[Kế hoạch Kiểm thử (Test_Plan.md)](file:///d:/SE/PROJECT/SE_Writing_Web/docs/test/Test_Plan.md):** Tổng quan về môi trường, thiết bị kiểm thử, và chỉ tiêu chất lượng.
- **[Kiểm thử Trải nghiệm (UX_Usability_Tests.md)](file:///d:/SE/PROJECT/SE_Writing_Web/docs/test/UX_Usability_Tests.md):** 10 kịch bản kiểm thử dựa trên **10 Nguyên lý tương tác của Jakob Nielsen**.
- **[Kiểm thử Tiếp cận (Accessibility_A11y_Tests.md)](file:///d:/SE/PROJECT/SE_Writing_Web/docs/test/Accessibility_A11y_Tests.md):** Kịch bản kiểm tra khả năng tiếp cận bàn phím, tương phản Sepia/Dark mode và Screen Reader theo tiêu chuẩn **WCAG 2.1 AA**.

---

## 👥 Tác giả

Hệ thống được phát triển với sự đóng góp cân bằng và đồng đều (Mỗi thành viên đảm nhận **20%** khối lượng dự án, phân vai trò phối hợp nhịp nhàng):

* **Trần Gia Hiển** - *Product Owner & Testing Lead* - [@GiaHien23](https://github.com/GiaHien23)
* **Nguyễn Duy Trường** - *Software Architect & DB Designer* - [@DuyTruong182](https://github.com/DuyTruong182)
* **Nguyễn Phú Thọ** - *DevOps & Infrastructure Lead* - [@PhuTho169](https://github.com/PhuTho169)
* **Phạm Hương Trà** - *Business Analyst & QA Engineer* - [@HuongTra177](https://github.com/HuongTra177)
* **Huỳnh Yến Nhi** - *UI/UX Designer & Conceptualizer* - [@YenNhi151](https://github.com/YenNhi151)

---

## 📄 Giấy phép

Dự án này được phân phối công khai và hợp pháp dưới Giấy phép **MIT License**. Chi tiết vui lòng xem tại tệp `LICENSE` đính kèm trong thư mục gốc.
