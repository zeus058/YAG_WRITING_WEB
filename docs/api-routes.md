# API Routes — YAG Writing Novels Web

> Tài liệu đặc tả đầy đủ toàn bộ API Backend (FastAPI).
> Nguồn: Requirement.md · Design.md · AGENTS.md
> Cập nhật khi thêm/sửa route mới.

---

## Quy ước chung

### Base URL
```
Development : http://localhost:8000
Production  : https://api.yag.vn  (qua Nginx reverse proxy)
```

### Authentication
Tất cả route có ký hiệu 🔒 yêu cầu header:
```
Authorization: Bearer <JWT_TOKEN>
```
JWT được cấp từ `POST /api/auth/login`. Thời hạn: 7 ngày.

### Role phân quyền
| Role | Ký hiệu | Mô tả |
|---|---|---|
| Public (chưa đăng nhập) | 🌐 | Chỉ xem trang công khai |
| Reader | 👤 | Đọc truyện, bình luận, thanh toán |
| Author | ✍️ | Thêm quyền Reader + soạn thảo, xuất bản |
| Admin | 🛡️ | Toàn quyền hệ thống |

### Cấu trúc Response chuẩn
```json
// Thành công
{
  "success": true,
  "data": { ... },
  "message": "Mô tả ngắn"
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Sai tài khoản hoặc mật khẩu"
  }
}
```

### HTTP Status Codes
| Code | Ý nghĩa | Dùng khi |
|---|---|---|
| 200 | OK | GET thành công, PUT/PATCH thành công |
| 201 | Created | POST tạo resource mới thành công |
| 202 | Accepted | Task bất đồng bộ đã được tiếp nhận (publish, moderation) |
| 204 | No Content | DELETE thành công |
| 400 | Bad Request | Dữ liệu đầu vào không hợp lệ |
| 401 | Unauthorized | Chưa đăng nhập hoặc JWT hết hạn |
| 403 | Forbidden | Đã đăng nhập nhưng không đủ quyền |
| 404 | Not Found | Resource không tồn tại |
| 409 | Conflict | Trùng lặp dữ liệu (email đã tồn tại, ...) |
| 422 | Unprocessable Entity | FastAPI validation error (Pydantic) |
| 429 | Too Many Requests | Rate limit — Nginx throttle |
| 500 | Internal Server Error | Lỗi server không xác định |
| 502 | Bad Gateway | Gemini API hoặc RabbitMQ không phản hồi |

---

## Mục lục Routes

1. [Auth — Xác thực](#1-auth--xác-thực)
2. [Profiles — Hồ sơ](#2-profiles--hồ-sơ)
3. [Stories — Tác phẩm](#3-stories--tác-phẩm)
4. [Chapters — Chương truyện](#4-chapters--chương-truyện)
5. [Search — Tìm kiếm](#5-search--tìm-kiếm)
6. [AI — Trí tuệ nhân tạo](#6-ai--trí-tuệ-nhân-tạo)
7. [Comments & Reviews — Tương tác](#7-comments--reviews--tương-tác)
8. [Membership & Payment — Thanh toán](#8-membership--payment--thanh-toán)
9. [Admin — Quản trị](#9-admin--quản-trị)
10. [WebSocket — Real-time](#10-websocket--real-time)

---

## 1. Auth — Xác thực

**Use Case:** U001 | **FR:** FR-01, FR-02 | **Screen:** S02, S03  
**File:** `src/backend/app/api/v1/endpoints/auth.py` | **Service:** `src/backend/app/services/auth_service.py`  
**Phụ trách:** Trần Gia Hiển

---

### `POST /api/auth/register` 🌐
Đăng ký tài khoản mới.

**Request Body**
```json
{
  "username": "string (3-50 ký tự, chỉ a-z0-9_)",
  "email": "string (email hợp lệ)",
  "password": "string (tối thiểu 8 ký tự)",
  "role": "reader | author  (mặc định: reader)"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "string",
    "email": "string",
    "role": "reader"
  },
  "message": "Đăng ký thành công"
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 409 | `EMAIL_EXISTS` | Email đã được đăng ký |
| 409 | `USERNAME_EXISTS` | Username đã tồn tại |
| 422 | — | Pydantic validation (password ngắn, email sai format) |

**Ghi chú kỹ thuật**
- Mật khẩu được hash bằng **Bcrypt** trước khi lưu — không lưu plaintext
- Tự động tạo bản ghi `profiles` (display_name = username, reputation_score = 100)
- Rate limit: 5 request/phút/IP (Nginx)

---

### `POST /api/auth/login` 🌐
Đăng nhập, nhận JWT token.

**Request Body**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "token_type": "bearer",
    "expires_in": 604800,
    "user": {
      "user_id": "uuid",
      "username": "string",
      "role": "reader | author | admin",
      "premium_until": "2026-12-31T00:00:00Z | null"
    }
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Sai email hoặc mật khẩu |
| 403 | `ACCOUNT_LOCKED` | Tài khoản bị khóa bởi Admin |

**Ghi chú kỹ thuật**
- Verify password bằng `bcrypt.checkpw()` — không so sánh trực tiếp
- JWT payload: `{ user_id, role, exp }`
- Rate limit: 10 request/phút/IP để chống brute-force

---

### `POST /api/auth/reset-password` 🌐
Gửi email khôi phục mật khẩu.

**Request Body**
```json
{ "email": "string" }
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Email khôi phục đã được gửi nếu tài khoản tồn tại"
}
```

**Ghi chú kỹ thuật**
- Response luôn `200` dù email không tồn tại (tránh lộ thông tin tài khoản)
- OTP hết hạn sau 15 phút, lưu trong Redis key: `otp:{email}`

---

### `POST /api/auth/reset-password/confirm` 🌐
Xác nhận OTP và đặt mật khẩu mới.

**Request Body**
```json
{
  "email": "string",
  "otp": "string (6 chữ số)",
  "new_password": "string (tối thiểu 8 ký tự)"
}
```

**Response `200 OK`**
```json
{ "success": true, "message": "Mật khẩu đã được cập nhật" }
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 400 | `INVALID_OTP` | OTP sai hoặc hết hạn |

---

## 2. Profiles — Hồ sơ

**Use Case:** U002 | **FR:** FR-03 | **Screen:** S12, S13  
**File:** `src/backend/app/api/v1/endpoints/auth.py` | **Service:** `src/backend/app/services/auth_service.py`  
**Phụ trách:** Trần Gia Hiển

---

### `GET /api/profiles/{user_id}` 🌐
Xem hồ sơ công khai của người dùng.

**Path Params:** `user_id` (UUID)

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "string",
    "display_name": "string",
    "avatar_url": "string | null",
    "bio": "string | null",
    "reputation_score": 85,
    "role": "author",
    "stories_count": 3,
    "joined_at": "2025-09-01T00:00:00Z"
  }
}
```

---

### `PUT /api/profiles/{user_id}` 🔒👤
Cập nhật thông tin hồ sơ cá nhân. Chỉ cho phép cập nhật hồ sơ của chính mình.

**Path Params:** `user_id` (UUID)

**Request Body** *(multipart/form-data hoặc JSON)*
```json
{
  "display_name": "string (tùy chọn)",
  "bio": "string (tùy chọn, max 500 ký tự)",
  "avatar": "file (tùy chọn, jpg/png, max 2MB)"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "display_name": "string",
    "bio": "string",
    "avatar_url": "https://res.cloudinary.com/..."
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 403 | `FORBIDDEN` | Cố cập nhật hồ sơ người khác |
| 400 | `INVALID_FILE` | Ảnh sai định dạng hoặc quá dung lượng |

**Ghi chú kỹ thuật**
- Ảnh upload lên **Cloudinary**, lưu URL vào `profiles.avatar_url`
- Tối ưu ảnh qua Cloudinary transformation (resize 200x200, compress)

---

### `PUT /api/profiles/{user_id}/password` 🔒👤
Đổi mật khẩu.

**Request Body**
```json
{
  "current_password": "string",
  "new_password": "string (tối thiểu 8 ký tự)"
}
```

**Response `200 OK`**
```json
{ "success": true, "message": "Mật khẩu đã được cập nhật" }
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 400 | `WRONG_PASSWORD` | Mật khẩu hiện tại không đúng |

---

## 3. Stories — Tác phẩm

**Use Case:** U003, U007 | **FR:** FR-04, FR-08 | **Screen:** S04, S05, S06, S15  
**File:** `src/backend/app/api/v1/endpoints/stories.py` | **Service:** `src/backend/app/services/story_service.py`  
**Phụ trách:** Huỳnh Yến Nhi

---

### `GET /api/stories` 🌐
Danh sách tác phẩm với filter và phân trang.

**Query Params**
| Param | Type | Mô tả | Mặc định |
|---|---|---|---|
| `category` | string | Lọc theo thể loại | — |
| `status` | string | `ongoing\|completed\|paused` | — |
| `sort` | string | `views\|rating\|newest` | `newest` |
| `page` | int | Trang hiện tại | 1 |
| `limit` | int | Số item mỗi trang (max 50) | 20 |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "author": { "user_id": "uuid", "display_name": "string", "avatar_url": "string" },
        "cover_url": "string | null",
        "category": "string",
        "status": "ongoing",
        "view_count": 12500,
        "rating_avg": 4.7,
        "chapter_count": 42,
        "updated_at": "2026-05-20T10:00:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "total_pages": 8
  }
}
```

---

### `POST /api/stories` 🔒✍️
Tạo tác phẩm mới.

**Request Body** *(multipart/form-data)*
```json
{
  "title": "string (3-255 ký tự, unique)",
  "description": "string (min 50 ký tự)",
  "category": "string",
  "cover": "file (tùy chọn, jpg/png, max 5MB)"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "status": "ongoing",
    "cover_url": "string | null",
    "created_at": "2026-05-25T07:00:00Z"
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 409 | `TITLE_EXISTS` | Tên truyện đã tồn tại |
| 403 | `NOT_AUTHOR` | Tài khoản không có role Author |

**Ghi chú kỹ thuật**
- Tạo bản ghi `stories` với `author_id = current_user.id`
- Ảnh bìa upload Cloudinary, link lưu vào `stories.cover_url`

---

### `GET /api/stories/{id}` 🌐
Chi tiết tác phẩm.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "author": { "user_id": "uuid", "display_name": "string", "avatar_url": "string", "reputation_score": 90 },
    "cover_url": "string | null",
    "category": "string",
    "status": "ongoing",
    "view_count": 12500,
    "rating_avg": 4.7,
    "rating_count": 320,
    "chapter_count": 42,
    "created_at": "2025-10-01T00:00:00Z",
    "updated_at": "2026-05-20T10:00:00Z"
  }
}
```

**Ghi chú kỹ thuật**
- Tăng `view_count` trong **Redis** (`INCR story:views:{id}`), flush về PostgreSQL theo batch mỗi 5 phút

---

### `PUT /api/stories/{id}` 🔒✍️
Cập nhật thông tin tác phẩm. Chỉ Author sở hữu hoặc Admin.

**Request Body** *(multipart/form-data, tất cả tùy chọn)*
```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "status": "ongoing | completed | paused",
  "cover": "file"
}
```

**Response `200 OK`**
```json
{ "success": true, "data": { "id": "uuid", "updated_at": "..." } }
```

---

### `DELETE /api/stories/{id}` 🔒✍️
Xóa tác phẩm (chỉ Author sở hữu hoặc Admin). Cascade xóa toàn bộ chapters, comments.

**Response `204 No Content`**

---

### `GET /api/stories/{id}/chapters` 🌐
Danh sách chương của tác phẩm.

**Query Params:** `page`, `limit`

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "chapter_number": 1,
        "title": "string",
        "moderation_status": "approved",
        "is_premium": false,
        "publish_at": "2026-04-01T08:00:00Z"
      }
    ],
    "total": 42
  }
}
```

**Ghi chú kỹ thuật**
- Reader chỉ thấy chapter có `moderation_status = 'approved'`
- Author thấy tất cả bao gồm cả `pending`, `rejected`, `flagged`

---

## 4. Chapters — Chương truyện

**Use Case:** U004, U005, U007 | **FR:** FR-05, FR-07, FR-08 | **Screen:** S07, S16, S17  
**File:** `src/backend/app/api/v1/endpoints/chapters.py` | **Service:** `src/backend/app/services/chapter_service.py`  
**Phụ trách:** Huỳnh Yến Nhi

---

### `POST /api/chapters` 🔒✍️
Tạo chương mới (bản nháp).

**Request Body**
```json
{
  "story_id": "uuid",
  "chapter_number": 1,
  "title": "string",
  "content": "string",
  "is_premium": false
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "chapter_number": 1,
    "moderation_status": "pending",
    "created_at": "..."
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 409 | `CHAPTER_NUMBER_EXISTS` | Số chương đã tồn tại trong truyện này |
| 403 | `NOT_STORY_OWNER` | Không phải Author của truyện |

---

### `PUT /api/chapters/{id}` 🔒✍️
Cập nhật / lưu nháp chương. Dùng cho autosave.

**Request Body** *(tất cả tùy chọn)*
```json
{
  "title": "string",
  "content": "string",
  "is_premium": false
}
```

**Response `200 OK`**
```json
{ "success": true, "data": { "id": "uuid", "updated_at": "..." } }
```

**Ghi chú kỹ thuật**
- Với autosave: Frontend gọi qua WebSocket (`/ws/draft/{chapter_id}`) thay vì REST
- Nội dung được buffer trong Redis trước khi flush PostgreSQL

---

### `GET /api/chapters/{id}` 🔒👤
Đọc nội dung chương.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "story_id": "uuid",
    "chapter_number": 5,
    "title": "string",
    "content": "string (full text)",
    "is_premium": false,
    "moderation_status": "approved",
    "publish_at": "2026-04-10T08:00:00Z",
    "prev_chapter": 4,
    "next_chapter": 6
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 403 | `PREMIUM_REQUIRED` | Chapter premium, user chưa có Membership |
| 404 | `NOT_FOUND` | Chapter không tồn tại hoặc chưa được duyệt |

**Ghi chú kỹ thuật**
- Kiểm tra: `chapter.is_premium == True AND user.premium_until < NOW()` → trả `403 PREMIUM_REQUIRED`
- Ưu tiên đọc từ **Redis** cache (`chapter:content:{id}`), miss → PostgreSQL → set cache TTL 1h
- Lưu vào `reading_histories` sau khi trả response (background task)
- Tốc độ tải < 0.5 giây

---

### `POST /api/chapters/{id}/publish` 🔒✍️
Xuất bản chương — đẩy vào RabbitMQ để kiểm duyệt AI.

**Request Body** *(tùy chọn)*
```json
{
  "scheduled_time": "2026-06-01T08:00:00Z | null  (null = xuất bản ngay)"
}
```

**Response `202 Accepted`**
```json
{
  "success": true,
  "message": "Chương đang chờ kiểm duyệt AI. Kết quả sẽ thông báo qua WebSocket.",
  "data": {
    "chapter_id": "uuid",
    "moderation_status": "pending",
    "estimated_time": "< 5 phút"
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 400 | `ALREADY_PUBLISHED` | Chương đã được duyệt rồi |
| 403 | `NOT_STORY_OWNER` | Không phải tác giả truyện này |

**Ghi chú kỹ thuật — Luồng đầy đủ**
```
1. UPDATE chapters SET moderation_status='pending'
2. INSERT publish_schedules (nếu có scheduled_time)
3. rabbitmq.publish("ai.moderation", { chapter_id, content, story_id })
4. return HTTP 202  ← kết thúc request (< 500ms)

Background (moderation_worker.py):
5. Gemini moderate → APPROVED / REJECTED / FLAGGED
6a. APPROVED:  UPDATE status='approved'
               Gemini embedding → UPSERT story_embeddings
               INSERT ai_moderation_logs
               ws_notify(author_id, "approved")
6b. REJECTED:  UPDATE status='rejected'
               INSERT ai_moderation_logs (is_violation=true)
               ws_notify(author_id, "rejected", reason)
               flag → Admin Dashboard
Lỗi Gemini 429: nack + requeue delay 60s (task không bị mất)
```

---

### `DELETE /api/chapters/{id}` 🔒✍️
Xóa chương. Cascade xóa comments của chương.

**Response `204 No Content`**

---

## 5. Search — Tìm kiếm

**Use Case:** U008 | **FR:** FR-09 | **Screen:** S05  
**File:** `src/backend/app/api/v1/endpoints/ai.py` | **Service:** `src/backend/app/services/ai_service.py`  
**Phụ trách:** Phạm Hương Trà

---

### `GET /api/search` 🌐
Tìm kiếm theo từ khóa (tên truyện, tác giả, thể loại).

**Query Params**
| Param | Type | Mô tả |
|---|---|---|
| `q` | string | Từ khóa tìm kiếm (tối thiểu 2 ký tự) |
| `category` | string | Lọc thêm theo thể loại |
| `page` | int | Trang |
| `limit` | int | Số kết quả (max 50, mặc định 20) |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [ { "id": "uuid", "title": "string", "author_name": "string", "cover_url": "string", "category": "string", "rating_avg": 4.5 } ],
    "total": 35,
    "query": "hacker"
  }
}
```

**Ghi chú kỹ thuật**
- Dùng PostgreSQL `tsvector` full-text search trên `stories.title`, `stories.description`
- Index: `CREATE INDEX ON stories USING GIN(to_tsvector('simple', title || ' ' || description))`

---

### `POST /api/search/semantic` 🌐
AI Semantic Search — tìm kiếm bằng mô tả ngôn ngữ tự nhiên.

**Request Body**
```json
{
  "query": "string (mô tả cốt truyện bằng ngôn ngữ tự nhiên, max 500 ký tự)",
  "limit": 20
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "author_name": "string",
        "cover_url": "string",
        "similarity_score": 0.92,
        "plot_summary": "string (đoạn tóm tắt liên quan)"
      }
    ],
    "total": 15,
    "query": "nam chính là hacker thiên tài bị oan",
    "search_mode": "semantic"
  }
}
```

**Ghi chú kỹ thuật — Luồng**
```
1. Gemini text-embedding-004 → query_vector (1536 dims)
2. pgvector query:
   SELECT story_id, plot_summary,
          1 - (embedding <=> $query_vector) AS similarity
   FROM story_embeddings
   ORDER BY embedding <=> $query_vector
   LIMIT {limit};
3. JOIN với stories để lấy metadata
4. Fallback khi Gemini down → chuyển sang GET /api/search?q={query}
```

- Thời gian phản hồi mục tiêu: < 1.5 giây
- Index pgvector: `ivfflat` với `vector_cosine_ops`, `lists=100`

---

## 6. AI — Trí tuệ nhân tạo

**Use Case:** U006, U009 | **FR:** FR-06, FR-10 | **Screen:** S04, S16  
**File:** `src/backend/app/api/v1/endpoints/ai.py` | **Service:** `src/backend/app/services/ai_service.py`  
**Phụ trách:** Phạm Hương Trà

---

### `POST /api/ai/suggest` 🔒✍️
Gợi ý tình tiết tiếp theo cho tác giả (AI Sidebar — S16).

**Request Body**
```json
{
  "chapter_id": "uuid",
  "context": "string (đoạn văn hiện tại, tối đa 1000 từ)",
  "genre": "string (thể loại truyện, ví dụ: kiếm hiệp)"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "index": 1,
        "text": "Gợi ý 1: [nội dung]",
        "style": "dramatic"
      },
      {
        "index": 2,
        "text": "Gợi ý 2: [nội dung]",
        "style": "suspense"
      },
      {
        "index": 3,
        "text": "Gợi ý 3: [nội dung]",
        "style": "romance"
      }
    ],
    "context_words_used": 950
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 400 | `CONTEXT_TOO_SHORT` | Nội dung < 100 từ, không đủ ngữ cảnh |
| 502 | `AI_UNAVAILABLE` | Gemini API không phản hồi |

**Ghi chú kỹ thuật**
- Context được truncate xuống **1000 từ** phía server — không tin client
- Gọi Gemini **trực tiếp** (không qua RabbitMQ) vì user đang chờ phản hồi
- Timeout: 10 giây, sau đó trả `502 AI_UNAVAILABLE`
- Thời gian phản hồi mục tiêu: < 5 giây
- Rate limit riêng: 20 request/giờ/user

---

### `POST /api/ai/recommend` 🔒👤
Đề xuất truyện cá nhân hóa dựa trên lịch sử đọc.

**Request Body** *(tùy chọn — có thể GET với Bearer token)*
```json
{
  "limit": 10,
  "exclude_ids": ["uuid1", "uuid2"]
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "cover_url": "string",
        "category": "string",
        "rating_avg": 4.8,
        "reason": "Dựa trên sở thích Kiếm hiệp của bạn"
      }
    ],
    "algorithm": "collaborative_filtering | trending",
    "cold_start": false
  }
}
```

**Ghi chú kỹ thuật**
- **Có lịch sử:** So khớp vector sở thích user với `story_embeddings` (pgvector)
- **Cold start (user mới):** Trả top `view_count` DESC từ `stories` (không gọi Gemini)
- **Gemini down:** Fallback về top `view_count` — `algorithm: "trending"`
- Kết quả được cache Redis 30 phút (`recommend:{user_id}`)

---

## 7. Comments & Reviews — Tương tác

**Use Case:** U010 | **FR:** FR-11 | **Screen:** S06, S07, S08  
**File:** `src/backend/app/api/v1/endpoints/chapters.py` | **Service:** `src/backend/app/services/chapter_service.py`  
**Phụ trách:** Huỳnh Yến Nhi

---

### `GET /api/chapters/{id}/comments` 🌐
Danh sách bình luận của chương (threaded).

**Query Params:** `page`, `limit` (mặc định 20)

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "user": { "user_id": "uuid", "display_name": "string", "avatar_url": "string" },
        "content": "string",
        "created_at": "...",
        "replies": [
          {
            "id": "uuid",
            "user": { ... },
            "content": "string",
            "created_at": "..."
          }
        ]
      }
    ],
    "total": 48
  }
}
```

---

### `POST /api/chapters/{id}/comments` 🔒👤
Đăng bình luận hoặc reply.

**Request Body**
```json
{
  "content": "string (1-1000 ký tự)",
  "parent_id": "uuid | null  (null = comment gốc, uuid = reply)"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "string",
    "created_at": "..."
  }
}
```

---

### `DELETE /api/comments/{id}` 🔒👤
Xóa bình luận. Chỉ người đăng hoặc Admin.

**Response `204 No Content`**

---

### `POST /api/stories/{id}/reviews` 🔒👤
Đánh giá tác phẩm (1–5 sao). Mỗi user chỉ đánh giá 1 lần.

**Request Body**
```json
{
  "rating": 5,
  "content": "string (tùy chọn, max 500 ký tự)"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rating": 5,
    "new_avg": 4.72
  }
}
```

**Lỗi thường gặp**
| Code | Error Code | Mô tả |
|---|---|---|
| 409 | `ALREADY_REVIEWED` | User đã đánh giá truyện này rồi |
| 400 | `INVALID_RATING` | Rating không nằm trong 1-5 |

**Ghi chú kỹ thuật**
- UNIQUE constraint: `(user_id, story_id)` trong bảng `reviews`
- Sau khi insert, re-calculate `stories.rating_avg = AVG(reviews.rating)`

---

### `GET /api/stories/{id}/reviews` 🌐
Danh sách đánh giá của tác phẩm.

**Query Params:** `page`, `limit`

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      { "id": "uuid", "user": { ... }, "rating": 5, "content": "string", "created_at": "..." }
    ],
    "total": 320,
    "avg_rating": 4.72
  }
}
```

---

## 8. Membership & Payment — Thanh toán

**Use Case:** U011, U012 | **FR:** FR-12 | **Screen:** S09, S10  
**File:** `src/backend/app/api/v1/endpoints/payment.py` | **Service:** `src/backend/app/services/payment_service.py`  
**Phụ trách:** Nguyễn Duy Trường

---

### `GET /api/membership/plans` 🌐
Danh sách gói Membership.

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "MONTHLY",
      "name": "Gói Tháng",
      "duration_days": 30,
      "price": 49000,
      "currency": "VND",
      "features": ["Đọc tất cả chương Premium", "Không quảng cáo", "Đọc sớm 24h"]
    },
    {
      "id": "YEARLY",
      "name": "Gói Năm",
      "duration_days": 365,
      "price": 399000,
      "currency": "VND",
      "features": ["Tất cả quyền lợi Gói Tháng", "Tiết kiệm 32%", "Badge độc giả VIP"]
    }
  ]
}
```

---

### `POST /api/membership/checkout` 🔒👤
Tạo giao dịch và lấy URL thanh toán VNPAY.

**Request Body**
```json
{
  "plan_id": "MONTHLY | YEARLY",
  "return_url": "https://yag.vn/payment/result"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "vnp_txn_ref": "YAG20260525123456",
    "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_...",
    "amount": 49000,
    "expires_at": "2026-05-25T08:15:00Z"
  }
}
```

**Ghi chú kỹ thuật**
```
1. Tạo Transaction: { status='pending', amount, plan_id, vnp_txn_ref=YAG+timestamp }
2. Build VNPAY params + sign HMAC-SHA512
3. Trả payment_url → Frontend redirect sang VNPAY
```

---

### `POST /api/payment/vnpay-ipn` 🌐
IPN callback từ VNPAY — server-to-server, không qua Frontend.

> ⚠️ **Endpoint này KHÔNG cần JWT** nhưng **BẮT BUỘC verify VNPAY checksum**.

**Request** *(VNPAY gửi query params)*
```
GET /api/payment/vnpay-ipn?vnp_Amount=4900000&vnp_BankCode=NCB&
    vnp_ResponseCode=00&vnp_TmnCode=...&vnp_TransactionNo=123456&
    vnp_TxnRef=YAG20260525123456&vnp_SecureHash=abc123...
```

**Response `200 OK`** *(VNPAY yêu cầu format cụ thể)*
```json
{ "RspCode": "00", "Message": "Confirm Success" }
```

**Lỗi → Response vẫn `200` nhưng RspCode khác 00**
| RspCode | Ý nghĩa |
|---|---|
| `00` | Xác nhận thành công |
| `97` | Checksum không hợp lệ |
| `02` | Transaction không tồn tại |
| `04` | Transaction đã xử lý rồi |

**Ghi chú kỹ thuật — Luồng IPN**
```
1. Verify HMAC-SHA512 checksum (dùng VNPAY secret key)
   Nếu sai → return { RspCode: "97" } — KHÔNG update DB
2. Tìm Transaction bằng vnp_TxnRef
   Không tìm thấy → return { RspCode: "02" }
   Đã xử lý (status != pending) → return { RspCode: "04" }
3. Kiểm tra vnp_ResponseCode == "00" (thanh toán thành công)
   Thành công:
     UPDATE transactions SET status='success', vnp_transaction_no=...
     UPDATE users SET premium_until = NOW() + interval '{duration_days} days'
   Thất bại:
     UPDATE transactions SET status='failed'
4. return { RspCode: "00" }
```

---

### `GET /api/payment/history` 🔒👤
Lịch sử giao dịch của user hiện tại.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "plan_name": "Gói Tháng",
        "amount": 49000,
        "status": "success",
        "created_at": "2026-04-01T08:00:00Z",
        "vnp_transaction_no": "123456"
      }
    ]
  }
}
```

---

## 9. Admin — Quản trị

**Use Case:** U013, U014, U015 | **FR:** FR-13, FR-14, FR-15 | **Screen:** S19, S20, S21  
**File:** `src/backend/app/api/v1/endpoints/admin.py` | **Service:** `src/backend/app/services/admin_service.py`  
**Phụ trách:** Nguyễn Phú Thọ

> Tất cả route trong nhóm này yêu cầu 🔒🛡️ (JWT + role Admin).  
> Mọi hành động của Admin được ghi **Audit Log** vào DB.

---

### `GET /api/admin/stats` 🔒🛡️
Số liệu tổng quan hệ thống (Dashboard S19).

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "users": { "total": 15420, "new_today": 42, "premium": 830 },
    "stories": { "total": 2150, "published_today": 8 },
    "chapters": { "total": 87300, "pending_moderation": 15 },
    "revenue": { "today": 2450000, "this_month": 48200000 },
    "moderation": { "approved_today": 32, "rejected_today": 3, "flagged_pending": 7 }
  }
}
```

---

### `GET /api/admin/moderation-queue` 🔒🛡️
Danh sách chương cần xử lý (pending/flagged).

**Query Params**
| Param | Type | Mô tả |
|---|---|---|
| `status` | string | `pending\|flagged\|rejected` |
| `page` | int | Trang |
| `limit` | int | Số item |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "chapter_id": "uuid",
        "story_title": "string",
        "author_name": "string",
        "moderation_status": "flagged",
        "ai_confidence": 0.87,
        "violation_category": "NSFW",
        "reason": "Phát hiện nội dung nhạy cảm tại đoạn...",
        "submitted_at": "2026-05-25T06:30:00Z"
      }
    ],
    "total": 7
  }
}
```

---

### `POST /api/admin/moderation/{chapter_id}/approve` 🔒🛡️
Admin duyệt chương (ghi đè quyết định AI).

**Request Body**
```json
{ "note": "string (tùy chọn, ghi chú lý do duyệt)" }
```

**Response `200 OK`**
```json
{ "success": true, "message": "Chương đã được duyệt và công bố" }
```

**Ghi chú kỹ thuật**
- UPDATE `chapters.moderation_status = 'approved'`
- INSERT Audit Log: `{ admin_id, action: 'approve', chapter_id, note }`
- Notify Author qua WebSocket

---

### `POST /api/admin/moderation/{chapter_id}/reject` 🔒🛡️
Admin từ chối chương.

**Request Body**
```json
{
  "reason": "string (bắt buộc, giải thích lý do từ chối)",
  "violation_category": "NSFW | violence | copyright | spam"
}
```

**Response `200 OK`**
```json
{ "success": true, "message": "Chương đã bị từ chối" }
```

---

### `GET /api/admin/schedules` 🔒🛡️
Danh sách lịch đăng và trạng thái tuân thủ của tác giả.

**Query Params:** `status` (`scheduled|missed|published`), `page`, `limit`

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "schedule_id": "uuid",
        "story_title": "string",
        "author_name": "string",
        "scheduled_time": "2026-05-25T08:00:00Z",
        "status": "missed",
        "overdue_hours": 5
      }
    ]
  }
}
```

---

### `GET /api/admin/users` 🔒🛡️
Danh sách người dùng.

**Query Params:** `role`, `search` (username/email), `page`, `limit`

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "user_id": "uuid",
        "username": "string",
        "email": "string",
        "role": "author",
        "premium_until": "2026-12-31",
        "reputation_score": 75,
        "is_locked": false,
        "created_at": "..."
      }
    ],
    "total": 15420
  }
}
```

---

### `POST /api/admin/users/{user_id}/lock` 🔒🛡️
Khóa tài khoản người dùng.

**Request Body**
```json
{
  "duration_days": 7,
  "reason": "string (bắt buộc)"
}
```

**Response `200 OK`**
```json
{ "success": true, "message": "Tài khoản đã bị khóa 7 ngày" }
```

---

### `POST /api/admin/users/{user_id}/unlock` 🔒🛡️
Mở khóa tài khoản.

**Response `200 OK`**
```json
{ "success": true, "message": "Tài khoản đã được mở khóa" }
```

---

## 10. WebSocket — Real-time

**File:** `src/backend/app/api/v1/endpoints/chapters.py`

> WebSocket dùng Redis pub/sub để broadcast giữa nhiều server instance.

---

### `WS /ws/draft/{chapter_id}` 🔒✍️
Autosave bản thảo real-time.

**Connect:** Gửi JWT trong query param: `ws://localhost:8000/ws/draft/{id}?token=<JWT>`

**Client → Server (gửi delta)**
```json
{
  "type": "draft",
  "content": "string (toàn bộ nội dung hiện tại)",
  "timestamp": 1716623520000
}
```

**Server → Client (xác nhận)**
```json
{
  "type": "saved",
  "saved_at": "2026-05-25T07:12:00Z"
}
```

**Ghi chú kỹ thuật**
- Frontend debounce 3 giây trước khi gửi — không gửi mỗi keystroke
- Server lưu vào Redis key: `draft:{chapter_id}` (TTL 24h)
- Background flush Redis → PostgreSQL mỗi 30 giây
- Mất kết nối: Frontend fallback lưu vào `localStorage`

---

### `WS /ws/notifications/{user_id}` 🔒👤
Nhận thông báo real-time (kết quả kiểm duyệt, nhắc lịch đăng).

**Server → Client — Kết quả duyệt chương (U013)**
```json
{
  "type": "moderation_result",
  "chapter_id": "uuid",
  "status": "approved | rejected | flagged",
  "reason": "string | null",
  "timestamp": "..."
}
```

**Server → Client — Nhắc lịch đăng (U014)**
```json
{
  "type": "schedule_reminder",
  "story_title": "string",
  "scheduled_time": "2026-05-26T08:00:00Z",
  "hours_remaining": 18,
  "timestamp": "..."
}
```

**Server → Client — Cảnh báo trễ hạn (U014)**
```json
{
  "type": "schedule_overdue",
  "story_title": "string",
  "overdue_hours": 5,
  "reputation_deducted": 5,
  "timestamp": "..."
}
```

---

### `WS /ws/comments/{chapter_id}` 🔒👤
Bình luận real-time.

**Server → Client (broadcast khi có comment mới)**
```json
{
  "type": "new_comment",
  "comment": {
    "id": "uuid",
    "user": { "display_name": "string", "avatar_url": "string" },
    "content": "string",
    "parent_id": "uuid | null",
    "created_at": "..."
  }
}
```

---

## Phụ lục — Rate Limits tổng hợp

| Endpoint | Giới hạn | Scope |
|---|---|---|
| `POST /api/auth/register` | 5 req/phút | Per IP |
| `POST /api/auth/login` | 10 req/phút | Per IP |
| `POST /api/search/semantic` | 30 req/phút | Per IP |
| `POST /api/ai/suggest` | 20 req/giờ | Per user |
| `POST /api/ai/recommend` | 60 req/giờ | Per user |
| `POST /api/chapters/{id}/publish` | 10 req/giờ | Per user |
| Các route khác | 100 req/phút | Per IP |

*Rate limit được thực thi tại **Nginx** — trả `429 Too Many Requests` khi vượt ngưỡng.*

---

## Phụ lục — Error Codes tổng hợp

| Error Code | HTTP | Mô tả |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Sai email/mật khẩu |
| `TOKEN_EXPIRED` | 401 | JWT hết hạn |
| `ACCOUNT_LOCKED` | 403 | Tài khoản bị khóa |
| `FORBIDDEN` | 403 | Không đủ quyền truy cập |
| `NOT_AUTHOR` | 403 | Cần role Author |
| `NOT_STORY_OWNER` | 403 | Không phải Author của truyện này |
| `PREMIUM_REQUIRED` | 403 | Cần Membership để đọc chương này |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `EMAIL_EXISTS` | 409 | Email đã được đăng ký |
| `USERNAME_EXISTS` | 409 | Username đã tồn tại |
| `TITLE_EXISTS` | 409 | Tên truyện đã tồn tại |
| `ALREADY_REVIEWED` | 409 | Đã đánh giá truyện này rồi |
| `CHAPTER_NUMBER_EXISTS` | 409 | Số chương đã tồn tại |
| `ALREADY_PUBLISHED` | 400 | Chương đã được xuất bản |
| `CONTEXT_TOO_SHORT` | 400 | Nội dung quá ngắn cho AI Suggest |
| `INVALID_OTP` | 400 | OTP sai hoặc hết hạn |
| `INVALID_FILE` | 400 | File ảnh sai định dạng/dung lượng |
| `INVALID_RATING` | 400 | Rating phải từ 1-5 |
| `AI_UNAVAILABLE` | 502 | Gemini API không phản hồi |