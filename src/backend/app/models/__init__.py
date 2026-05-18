"""
Gói Models — Định nghĩa thực thể ORM và Vector Models.

Thực thể cốt lõi (theo ARCHITECTURE.md):
- Users: id, username, email, password_hash, premium_until, role.
- Stories: id, author_id, title, description, cover_url, category.
- Chapters: id, story_id, content, moderation_status, is_premium.

Lưu ý:
- Trường password_hash phải được mã hóa Bcrypt trước khi lưu.
- Trường moderation_status mặc định PENDING khi tạo mới.
- Tích hợp pgvector cho lưu trữ Vector Embedding phục vụ AI Search.
"""
