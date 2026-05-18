# [FRONTEND_CLIENT_RULES]

## Chỉ Thị Ràng Buộc Phát Triển Phía Client — YAG Writing Novels Web

### 1. Ngôn Ngữ & Framework
- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** TailwindCSS với bảng màu Tropical Vibe (xem DESIGN.md)
- **Real-time:** Socket.io-client cho WebSocket connections

### 2. Quy Tắc Mã Nguồn
- Tuân thủ `CLAUDE.md`: Clean Code, DRY, comment Tiếng Việt, tên biến/hàm/props Tiếng Anh.
- Phân tách component rõ ràng: `ui/` (nguyên tử) và `features/` (nghiệp vụ lớn).
- Mọi page phải có SEO metadata (title, description).

### 3. Design System (Theo DESIGN.md)
- **Bảng màu bắt buộc:**
  - CTA (Primary): `#C81C30` (Crimson Root)
  - Hover/Focus: `#FEBDB2` (Coral Drift)
  - Background: `#FFECCE` (Petal Light)
  - Text/Dark BG: `#41503D` (Jungle)
- **Author Studio:** Split View 70/30 — Editor trái, AI Sidebar phải.
- **Reader Mode:** Auto-hide Navbar khi cuộn, widget font/theme.
- **Loading:** NGHIÊM CẤM spinner toàn màn hình → dùng Skeleton Loading.
- **Forum:** Real-time WebSocket, bình luận mới tự trượt vào không cần F5.

### 4. Cấu Trúc Thư Mục
```
src/
├── app/           # Next.js App Router
├── components/
│   ├── ui/        # Button, Input, Card, Modal (nguyên tử, tái sử dụng)
│   └── features/  # AuthorStudio, ReaderMode, Forum (nghiệp vụ)
├── lib/           # Utils, API Client config
└── hooks/         # useWebSocket, useTheme, etc.
```
