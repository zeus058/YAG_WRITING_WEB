# Antigravity Agent Rules — YAG Project

> Các quy tắc này áp dụng cho **mọi Agent** trong dự án YAG.
> Đọc file này SAU `AGENTS.md` ở root repo.
> Khi có xung đột giữa 2 file, file này được ưu tiên.

---

## 1. Nguyên tắc làm việc chung

### Trước khi bắt đầu bất kỳ task nào
- [ ] Đọc `AGENTS.md` để nắm kiến trúc tổng thể
- [ ] Xác định **Use Case ID** (U001–U015) liên quan đến task
- [ ] Xác định **Screen ID** (S01–S21) nếu task liên quan frontend
- [ ] Xác định **bảng DB** nào sẽ bị ảnh hưởng (mục 4 của AGENTS.md)
- [ ] **Hỏi xác nhận** nếu task không rõ ràng — không tự suy luận scope

### Khi hoàn thành task
- [ ] Chạy lint/type-check trước khi báo xong: `npm run lint` (frontend), `ruff check` (backend)
- [ ] Tóm tắt ngắn những gì đã thay đổi và tại sao
- [ ] Nêu rõ nếu có phần nào chưa làm được hoặc cần review thủ công

---

## 2. Quy tắc Git & Branch

```
KHÔNG BAO GIỜ commit thẳng lên nhánh main hoặc develop.
```

### Quy ước đặt tên branch
```
feat/U00X-ten-tinh-nang       # Tính năng mới theo Use Case
fix/U00X-mo-ta-bug            # Sửa bug
refactor/ten-module           # Refactor không thay đổi behavior
docs/ten-tai-lieu             # Cập nhật tài liệu
chore/ten-task                # Config, dependencies, tooling
```

Ví dụ:
```
feat/U005-publish-chapter-api
fix/U013-rabbitmq-retry-logic
refactor/ai-service-error-handling
```

### Quy ước commit message
```
<type>(scope): <mô tả ngắn gọn>

[body tùy chọn: giải thích lý do thay đổi]
[footer: Breaking change, closes #issue]
```

Ví dụ:
```
feat(chapters): add publish endpoint with RabbitMQ queue push (U005)
fix(moderation): handle Gemini rate limit with exponential backoff (U013)
refactor(auth): extract JWT validation to dependency injection
```

---

## 3. Quy tắc Terminal — Execution Policy

### Luôn yêu cầu review trước khi chạy

| Lệnh | Yêu cầu xác nhận | Lý do |
|---|---|---|
| `git commit` | **Bắt buộc** | Tránh commit sai nhánh |
| `git push` | **Bắt buộc** | Không push lên main |
| `docker-compose down` | **Bắt buộc** | Ảnh hưởng môi trường dev |
| `alembic upgrade head` | **Bắt buộc** | Migration DB không thể rollback dễ |
| `alembic downgrade` | **Bắt buộc** | Có thể mất data |
| `npm install <pkg>` | **Bắt buộc** | Xác nhận package cần thiết |
| `pip install <pkg>` | **Bắt buộc** | Cập nhật requirements.txt luôn |
| `npm run build` | Tự động được | Build check |
| `npm run lint` | Tự động được | Lint check |
| `ruff check .` | Tự động được | Python lint |
| `pytest` | Tự động được | Chạy test |
| `docker-compose up -d` | Tự động được | Khởi chạy services |

### Lệnh tuyệt đối KHÔNG chạy
```bash
# KHÔNG chạy các lệnh này dù bất kỳ lý do gì
DROP TABLE ...                # Xóa dữ liệu
DELETE FROM ... (không WHERE) # Xóa hàng loạt
git push --force              # Ghi đè lịch sử
rm -rf ...                    # Xóa file hàng loạt
```

---

## 4. Quy tắc Backend (FastAPI)

### Cấu trúc bắt buộc cho mỗi module
```
src/backend/app/
├── api/
│   └── v1/
│       └── endpoints/
│           └── ten_module.py       # Chỉ định nghĩa route, không chứa business logic
├── services/
│   └── ten_module.py               # Business logic, gọi DB, gọi external API
└── schemas/
    └── ten_module.py               # Pydantic models cho request/response
```

### Quy tắc xử lý AI (Gemini)

```python
# ĐÚNG — Luồng moderation phải qua RabbitMQ
@router.post("/chapters/{id}/publish")
async def publish_chapter(id: UUID):
    await db.update(chapter, status="pending")
    await rabbitmq.publish("ai.moderation", {"chapter_id": str(id)})
    return Response(status_code=202)  # Trả về NGAY, không chờ AI

# SAI — KHÔNG gọi Gemini trực tiếp trong request handler (moderation)
@router.post("/chapters/{id}/publish")
async def publish_chapter(id: UUID):
    result = await gemini.moderate(content)  # ← KHÔNG LÀM VẬY
    ...
```

```python
# Gợi ý tình tiết (U006) được phép gọi trực tiếp vì user đang chờ
@router.post("/ai/suggest")
async def ai_suggest(request: SuggestRequest):
    # Context tối đa 1000 từ — BẮT BUỘC
    context = truncate_to_words(request.content, max_words=1000)
    result = await gemini.generate(context)
    return result
```

### Quy tắc bảo mật bắt buộc

```python
# Mật khẩu — luôn dùng Bcrypt, không exception
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])

# JWT — validate trên mọi protected endpoint
from fastapi import Depends
from core.security import get_current_user

@router.get("/protected")
async def protected(user = Depends(get_current_user)):
    ...

# VNPAY — luôn verify checksum HMAC-SHA512 trước khi cập nhật DB
# KHÔNG tin kết quả từ redirect URL của Frontend
@router.post("/payment/vnpay-ipn")
async def vnpay_ipn(data: VNPayIPNRequest):
    if not verify_vnpay_checksum(data):  # BẮT BUỘC
        raise HTTPException(400, "Invalid checksum")
    ...
```

### Quy tắc xử lý lỗi RabbitMQ

```python
# Khi Gemini Rate Limit (429) — giữ task trong queue, retry
# KHÔNG raise exception làm mất task
async def process_moderation(chapter_id: str):
    try:
        result = await gemini.moderate(content)
    except GeminiRateLimitError:
        # Đẩy lại queue với delay 60s — KHÔNG mất task
        await rabbitmq.publish_delayed("ai.moderation", data, delay_seconds=60)
        return  # Thoát gracefully
    except GeminiTimeoutError:
        await rabbitmq.publish_delayed("ai.moderation", data, delay_seconds=30)
        return
```

### Response codes chuẩn
```
POST publish   → 202 Accepted      (không phải 200, không phải 201)
POST create    → 201 Created
GET            → 200 OK
PUT/PATCH      → 200 OK
DELETE         → 204 No Content
Unauthorized   → 401
Forbidden      → 403 (đã login nhưng không có quyền)
Not Found      → 404
Validation     → 422 Unprocessable Entity (FastAPI tự xử lý)
Rate Limited   → 429 Too Many Requests
```

---

## 5. Quy tắc Frontend (Next.js)

### Phân quyền theo role — kiểm tra trước khi render

```typescript
// Mapping role → screens được phép truy cập
const ROLE_ACCESS = {
  admin:  ['S19', 'S20', 'S21', ...allScreens],
  author: ['S15', 'S16', 'S17', 'S18', ...readerScreens],
  reader: ['S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12', 'S13', 'S14'],
  public: ['S01', 'S02', 'S03'],
}

// Luôn dùng middleware check ở layout, không check trong từng component
```

### Quy tắc hiển thị trạng thái moderation (U013)

```typescript
// ĐÚNG — hiển thị đúng theo moderation_status
switch (chapter.moderation_status) {
  case 'pending':   return <Badge color="amber">Đang duyệt</Badge>
  case 'approved':  return <Badge color="green">Đã duyệt</Badge>
  case 'rejected':  return <Badge color="red">Bị từ chối</Badge>
  case 'flagged':   return <Badge color="orange">Cần xem xét</Badge>
}

// KHÔNG ẩn chapter khỏi Author khi status = 'pending'
// Chỉ ẩn khỏi Reader khi status !== 'approved'
```

### Quy tắc Reader Mode (S07)
```typescript
// Lưu config đọc vào localStorage, không vào DB
const readerConfig = {
  fontSize: 16,       // px
  theme: 'light',     // 'light' | 'dark' | 'sepia'
  width: 'normal',    // 'normal' | 'wide'
}
localStorage.setItem('reader-config', JSON.stringify(readerConfig))

// Bật chống copy trong Reader Mode
document.addEventListener('contextmenu', e => e.preventDefault())
document.addEventListener('copy', e => e.preventDefault())
```

### Quy tắc Author Studio (S16)
```typescript
// Autosave qua WebSocket — debounce 3 giây
const debouncedSave = useDebouncedCallback(async (content) => {
  ws.send(JSON.stringify({ type: 'draft', chapter_id, content }))
}, 3000)

// AI Suggest — giới hạn context 1000 từ phía client
const getContext = (content: string) =>
  content.split(/\s+/).slice(-1000).join(' ')

// Layout 3 cột cố định — không cho phép collapse AI Sidebar
// [Dàn ý 20%] | [Editor 55%] | [AI Sidebar 25%]
```

### Quy tắc Premium content (S07)
```typescript
// Kiểm tra quyền đọc chapter premium
const canRead = !chapter.is_premium ||
  (user?.premium_until && new Date(user.premium_until) > new Date())

if (!canRead) {
  // Hiển thị paywall, redirect sang S09
  return <PremiumPaywall storyId={story.id} />
}
```

---

## 6. Quy tắc Database

### Viết migration (Alembic)

```python
# Luôn có cả upgrade() và downgrade()
def upgrade():
    op.add_column('stories', sa.Column('new_field', sa.String(50)))

def downgrade():
    op.drop_column('stories', 'new_field')  # KHÔNG để trống

# Đặt tên migration rõ ràng
# Tốt:    "add_reputation_score_to_profiles"
# Tệ:     "update_table" hoặc "fix"
```

### Quy tắc query pgvector
```sql
-- Semantic search — luôn dùng cosine similarity
SELECT story_id, 1 - (embedding <=> $1) AS similarity
FROM story_embeddings
ORDER BY embedding <=> $1
LIMIT 20;

-- Không dùng L2 distance (<->) cho text embedding
-- Luôn có LIMIT để tránh full table scan
```

### Không bao giờ lưu vào DB
- Thông tin thẻ ngân hàng, số tài khoản
- Raw API key hoặc secret (dùng environment variable)
- Plain text password (luôn Bcrypt hash)
- Session data dài hạn (dùng Redis)

---

## 7. Quy tắc AI / Gemini API

### Giới hạn context bắt buộc

| Use Case | Giới hạn | Lý do |
|---|---|---|
| U006 — AI Suggest | ≤ 1.000 từ | Tối ưu chi phí + tránh rate limit |
| U013 — Moderation | ≤ 5.000 từ/chapter | Một chương truyện thông thường |
| U008 — Embedding query | ≤ 512 token | Giới hạn embedding model |
| U009 — Recommend | Dùng cached vector | Không gọi Gemini mỗi request |

### Fallback bắt buộc khi Gemini down

| Tính năng | Fallback |
|---|---|
| U008 Semantic Search | Chuyển sang PostgreSQL full-text search (`tsvector`) |
| U009 Recommend | Trả về danh sách Top Views từ `stories.view_count` |
| U006 AI Suggest | Trả về thông báo "AI tạm thời không khả dụng" |
| U013 Moderation | Giữ `status='pending'`, retry sau 60s qua RabbitMQ |

---

## 8. Quy tắc xem xét Artifact (Review Policy)

Agent Manager nên được cấu hình **"Request Review"** cho các artifact:

### Luôn yêu cầu review trước khi áp dụng
- Bất kỳ file migration SQL/Alembic nào
- Thay đổi logic VNPAY IPN (`/api/payment/vnpay-ipn`)
- Thay đổi logic JWT/Auth middleware
- File `docker-compose.yml` hoặc `.env.example`
- Bất kỳ thay đổi nào trong `core/security.py`

### Agent tự quyết định (không cần review)
- Viết thêm test case
- Thêm comment/docstring
- Fix lỗi TypeScript type
- Cập nhật `README.md`
- Thêm Pydantic schema mới (không breaking)

---

## 9. Khi gặp tình huống không chắc chắn

```
Thứ tự ưu tiên khi ra quyết định:

1. Kiểm tra AGENTS.md — có mô tả luồng liên quan không?
2. Kiểm tra Use Case Specification (U001-U015 trong AGENTS.md)
3. Hỏi người dùng — mô tả rõ vấn đề và đề xuất 2-3 phương án
4. KHÔNG tự suy luận và implement khi không chắc scope
```

### Template hỏi khi không rõ
```
Tôi cần làm rõ trước khi tiếp tục:

Vấn đề: [Mô tả điều chưa rõ]
Use Case liên quan: [U00X]

Phương án A: [Mô tả] → Ưu: ... Nhược: ...
Phương án B: [Mô tả] → Ưu: ... Nhược: ...

Bạn muốn chọn phương án nào?
```

---

*Cập nhật khi có thay đổi kiến trúc — commit kèm lý do thay đổi rule.*