# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG YAG LÊN PRODUCTION (SERVERLESS)

Tài liệu này hướng dẫn chi tiết từng bước triển khai hệ thống **YAG — Writing Novels Web** lên môi trường Production thực tế. Kiến trúc được tối ưu hóa theo mô hình **Serverless** giúp hệ thống tự động co giãn (auto-scale), bảo mật cao và hoàn toàn miễn phí khi không hoạt động (scale-to-zero).

---

## BẢN ĐỒ KIẾN TRÚC TRIỂN KHAI

```mermaid
graph TD
    Client[Trình duyệt độc giả / tác giả]
    CDN[Vercel CDN / Cloudflare]
    API[Google Cloud Run - FastAPI API]
    DB[(Supabase PostgreSQL + pgvector)]
    Cache[(Upstash Serverless Redis)]
    PayOS[Cổng PayOS Webhook]
    Gemini[Google Gemini API]
    Cloudinary[Cloudinary CDN]

    Client -->|1. Truy cập Web| CDN
    Client -->|2. Gọi API| API
    API -->|3. Đọc/Ghi dữ liệu| DB
    API -->|4. Đọc/Ghi cache| Cache
    API -->|5. AI suggestions & Moderation| Gemini
    API -->|6. Upload/Phân phối ảnh| Cloudinary
    Client -->|7. Quét mã QR thanh toán| PayOS
    PayOS -->|8. Webhook confirm| API
```

---

## BƯỚC 1: THIẾT LẬP CƠ SỞ DỮ LIỆU TRÊN SUPABASE (POSTGRESQL)

**Supabase** cung cấp cơ sở dữ liệu PostgreSQL mạnh mẽ tích hợp sẵn extension `pgvector` phục vụ tính năng AI semantic search.

1.  Đăng ký tài khoản và tạo một dự án (Project) mới trên [Supabase](https://supabase.com/).
2.  Đợi dự án khởi tạo xong, truy cập mục **Project Settings** -> **Database**.
3.  Tìm đến phần **Connection String**, chọn tab **URI** và chọn cổng **Transaction Pooler (Port 6543)**.
    > [!IMPORTANT]
    > **Tại sao phải dùng Port 6543 (Transaction Mode)?**
    > Google Cloud Run chạy theo cơ chế Serverless sẽ sinh ra nhiều instance Backend đồng thời khi tải cao. Việc kết nối trực tiếp đến cổng mặc định `5432` sẽ nhanh chóng làm tràn số lượng kết nối tối đa (Max Connections) của database. Port `6543` kích hoạt PgBouncer để chia sẻ kết nối thông minh.
4.  Chuỗi kết nối của bạn sẽ có dạng:
    ```env
    DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.co:6543/postgres?sslmode=require"
    ```
    *(Hãy thay thế `[YOUR_PASSWORD]` bằng mật khẩu cơ sở dữ liệu bạn đã đặt lúc tạo dự án Supabase).*

---

## BƯỚC 2: THIẾT LẬP CACHE TRÊN UPSTASH (REDIS)

**Upstash** cung cấp Serverless Redis hoàn toàn miễn phí (hạn mức 10,000 requests/ngày), tự động tắt khi không dùng.

1.  Đăng ký tài khoản và tạo một database Redis mới trên [Upstash](https://upstash.com/).
2.  Sau khi khởi tạo, sao chép chuỗi kết nối bảo mật **Redis URL** dạng `rediss://...` tại mục **Connect to your database**.
3.  Chuỗi kết nối có dạng:
    ```env
    REDIS_URL="rediss://default:[YOUR_UPSTASH_PASSWORD]@your-db-name.upstash.io:6379"
    ```

---

## BƯỚC 3: ĐĂNG KÝ CỔNG THANH TOÁN QR ĐỘNG PAYOS (MIỄN PHÍ)

**PayOS** cung cấp API tạo mã VietQR động chuyển khoản ngân hàng hoàn toàn miễn phí cho nhà phát triển cá nhân, tiền chuyển trực tiếp về tài khoản ngân hàng của bạn.

1.  Đăng ký tài khoản trên [PayOS](https://payos.vn/).
2.  Kết nối với tài khoản ngân hàng cá nhân của bạn để nhận tiền.
3.  Truy cập mục **Quản lý ứng dụng** -> tạo ứng dụng mới để nhận các thông tin bảo mật:
    *   `PAYOS_CLIENT_ID`
    *   `PAYOS_API_KEY`
    *   `PAYOS_CHECKSUM_KEY`

---

## BƯỚC 4: TRIỂN KHAI BACKEND LÊN GOOGLE CLOUD RUN

Google Cloud Run tự động đóng gói ứng dụng Backend thông qua Docker và tự động scale-to-zero khi không có yêu cầu, giúp bạn không tốn chi phí máy chủ khi hệ thống nhàn rỗi.

### 4.1. Tạo Secrets trong Google Secret Manager
Để tránh lộ các biến môi trường nhạy cảm trong mã nguồn, hãy tạo các Secret tương ứng trên Google Cloud Console:
*   `DATABASE_URL` (Lấy ở Bước 1)
*   `REDIS_URL` (Lấy ở Bước 2)
*   `GEMINI_API_KEY` (Lấy từ Google AI Studio)
*   `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` (Lấy ở Bước 3)
*   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
*   `SECRET_KEY` (Khóa ký session JWT, hãy tạo một chuỗi ngẫu nhiên dài).

### 4.2. Build & Deploy container khởi chạy database migrations
Trước khi chạy API, chúng ta cần chạy tệp migration để khởi tạo bảng dữ liệu trên Supabase:
1.  Build Docker Image từ thư mục `src/backend` và đẩy lên Google Artifact Registry.
2.  Chạy Container dưới dạng Cloud Run Job hoặc Cloud Run Service tạm thời với các tham số:
    *   `SERVICE_ROLE=migrate`
    *   `ENVIRONMENT=production`
    *   `DATABASE_URL` (Ánh xạ từ Secret Manager)
3.  Container sẽ thực thi lệnh `python -m app.manage_migrations` để tạo các bảng dữ liệu trên Supabase rồi tự động tắt.

### 4.3. Deploy API Server chính thức
Triển khai một Cloud Run Service mới chạy liên tục:
1.  Sử dụng Docker Image đã build ở trên.
2.  Cấu hình các biến môi trường:
    *   `ENVIRONMENT=production`
    *   `SERVICE_ROLE=api`
    *   `QUEUE_PROVIDER=mock` *(Kích hoạt cơ chế luồng ngầm bất đồng bộ miễn phí)*
    *   `PAYMENT_PROVIDER=payos` *(Kích hoạt cổng thanh toán QR động PayOS)*
    *   `ALLOW_WEBSOCKET_QUERY_TOKEN=false`
    *   `SCHEDULER_ENABLED=false`
    *   `CORS_ORIGINS=https://[YOUR_VERCEL_APP_URL]` (Domain Frontend của bạn)
3.  Ánh xạ toàn bộ Secrets đã cấu hình ở mục 4.1 từ Secret Manager vào môi trường của Container.
4.  Cấu hình cổng dịch vụ: **8000** (hoặc map biến `PORT` tự động).
5.  Sau khi deploy thành công, bạn sẽ nhận được một URL API chính thức có dạng: `https://yag-backend-xxxx.run.app`.

---

## BƯỚC 5: TRIỂN KHAI FRONTEND LÊN VERCEL

Vercel là nền tảng tối ưu nhất để host Next.js, tự động build và tối ưu hóa SEO tĩnh/động.

1.  Đăng ký tài khoản [Vercel](https://vercel.com/) và liên kết với tài khoản GitHub của bạn.
2.  Chọn **Add New** -> **Project** -> Chọn kho mã nguồn `SE_Writing_Web`.
3.  Tại mục cấu hình dự án:
    *   **Framework Preset:** Chọn **Next.js**.
    *   **Root Directory:** Chọn `src/frontend`.
4.  Mở rộng phần **Environment Variables** và nhập đầy đủ các biến build-time sau:
    *   `NEXT_PUBLIC_DEPLOY_ENV` = `production`
    *   `NEXT_PUBLIC_APP_URL` = `https://[YOUR_DOMAIN_OR_VERCEL_URL]` (Ví dụ: `https://yag-novel.vercel.app`)
    *   `NEXT_PUBLIC_API_BASE_URL` = `https://yag-backend-xxxx.run.app` (URL Backend Cloud Run ở Bước 4.3)
    *   `NEXT_PUBLIC_WS_BASE_URL` = `wss://yag-backend-xxxx.run.app` *(Đổi tiền tố từ `https` thành `wss` để kết nối WebSocket)*
    *   `NEXT_PUBLIC_USE_MOCKS` = `false`
5.  Nhấn **Deploy**. Vercel sẽ tự động tải các dependencies, kiểm tra lỗi TypeScript, build tối ưu hóa và phát hành trang web trong vòng 1-2 phút.

---

## BƯỚC 6: ĐĂNG KÝ WEBHOOK TRÊN CỔNG PAYOS

Để hệ thống nhận diện được khách hàng đã chuyển khoản thành công và tự động cấp VIP Premium:

1.  Đăng nhập vào trang quản trị của **PayOS**.
2.  Tìm đến mục ứng dụng của bạn -> **Cấu hình Webhook**.
3.  Nhập đường dẫn Webhook chính thức của Backend:
    ```url
    https://yag-backend-xxxx.run.app/api/v1/payments/payos/webhook
    ```
4.  Nhấp **Lưu cấu hình**. PayOS sẽ gửi một ping test thử nghiệm đến Backend của bạn, hệ thống đã chuẩn bị mã xác thực và sẽ trả về phản hồi thành công ngay lập tức.

---

## BƯỚC 7: XÁC MINH HỆ THỐNG SAU KHI DEPLOY (PROD CHECK)

1.  **Kiểm tra sức khỏe Backend:**
    Truy cập trình duyệt theo đường dẫn `https://yag-backend-xxxx.run.app/health/ready`.
    Kết quả mong đợi:
    ```json
    {
      "status": "ok",
      "checks": {
        "database": "ok",
        "redis": "ok",
        "rabbitmq": "ok (skipped for mock)"
      }
    }
    ```
2.  **Đọc truyện & Đăng nhập:**
    Truy cập trang Frontend trên Vercel, thử đăng ký tài khoản mới và đăng nhập. Kiểm tra giao diện xem các tóm tắt truyện được load mượt mà từ Supabase Database.
3.  **Tác giả sáng tác & AI Moderation:**
    Vào trang Tác giả, tạo truyện mới và gửi duyệt chương. Xác minh rằng chương truyện tự động được duyệt trong vòng vài giây (AI chạy bất đồng bộ qua luồng nền của Cloud Run).
4.  **Thanh toán Premium:**
    Chọn gói Premium trên trang Membership, quét mã QR hiển thị bằng ứng dụng ngân hàng của bạn. Sau khi chuyển khoản thành công, trang web sẽ tự động chuyển hướng hiển thị kết quả thành công và tài khoản của bạn được cập nhật hạn sử dụng Premium ngay lập tức!
