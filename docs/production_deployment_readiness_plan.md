# YAG Production Deployment Readiness Plan

Tai lieu nay la ke hoach tong the de dieu chinh toan bo ma nguon YAG tu trang thai chay local/demo sang trang thai san sang trien khai len internet that. Ke hoach nay dua tren audit hien tai cua repo, Docker stack, backend FastAPI, frontend Next.js, PostgreSQL/Redis/RabbitMQ, worker moderation, VNPAY, Gemini, Cloudinary va cac flow chinh Reader/Author/Admin.

## 1. Muc Tieu

Sau khi hoan thanh plan nay, du an phai dat cac dieu kien:

- Co the deploy frontend va backend len domain public co HTTPS.
- Backend khong dung bat ky dev secret/default secret nao trong production.
- Frontend production bundle goi dung API/WS production, khong mock, khong localhost.
- Database schema duoc quan ly bang migration co version, khong drop data production.
- Worker moderation, scheduler, notification, payment IPN va view-count flush hoat dong ben vung.
- CI/CD co lint, build, test, migration smoke, Docker build va API smoke gate.
- He thong co logging, healthcheck, backup, monitoring va rollback path.

## 2. Hien Trang Can Xu Ly

### Dang chay duoc

- Docker Compose local khoi dong duoc Postgres, Redis, RabbitMQ, backend, worker va frontend.
- `/health` va `/health/ready` tra OK khi stack local dang chay.
- Frontend `npm run lint` khong co error, `npm run build` pass.
- Backend test pass khi chay voi `TEST_DATABASE_URL=postgresql://yag_user:yag_secret@postgres:5432/yag_db`.
- Auth, story list, admin stats va VNPAY checkout smoke dang hoat dong tren local.
- DB hien co 16 bang, gom `notifications`.

### Chua san sang production

- Backend container chua set production secrets, dang co nguy co dung default dev secret.
- Frontend Docker build chua truyen `NEXT_PUBLIC_*`, co nguy co build nham `localhost` hoac mock mode.
- `src/frontend` chua co `.dockerignore`.
- Docker Compose expose thang Postgres, Redis, RabbitMQ va RabbitMQ UI ra host.
- Migration chua co version table/Alembic chuan; seed script dang `drop_all`.
- Payment IPN chua row-lock, chua ghi audit fields, chua idempotency chat.
- Notification persistent da co model/API nhung worker/scheduler van chu yeu publish Redis.
- JWT dang luu localStorage va dua vao WebSocket query string.
- UI toast co `innerHTML`, co nguy co XSS.
- Test DB dang fallback `localhost`; test co the ghi rac vao DB dev.
- Repo chua sach: co `__pycache__`, file deleted/untracked, root thieu `.gitignore`.

## 3. Definition Of Done

Production readiness chi duoc xem la dat khi tat ca checklist sau pass:

- [ ] Backend production config fail-fast neu thieu secret bat buoc.
- [ ] Frontend production image build voi `NEXT_PUBLIC_USE_MOCKS=false` va API/WS domain that.
- [ ] Migration chay tren DB rong va DB da co data deu pass.
- [ ] Seed dev khong destructive; reset DB chi ton tai o script rieng cho local.
- [ ] `docker compose` local pass; production manifest khong expose DB/Redis/RabbitMQ public.
- [ ] `pytest` pass khong can manual override host.
- [ ] `npm run lint` pass khong warning quan trong; `npm run build` pass.
- [ ] Reader flow pass: login, home, discover, story detail, read, comment, review, bookmark, paywall.
- [ ] Author flow pass: my stories, create story, create chapter, autosave, AI suggestions, publish.
- [ ] Worker moderation pass: queue -> worker -> DB status/log -> notification.
- [ ] Admin flow pass: stats, moderation queue, approve/reject, audit logs.
- [ ] Payment pass: checkout URL, IPN success/fail/idempotent, membership status update.
- [ ] Observability co logs, request id, healthcheck, backup va rollback runbook.

## 4. Phase 0 - Dong Bang Trang Thai Va Lam Sach Repo

Muc tieu: tao baseline sach truoc khi sua production.

Cong viec:

1. Kiem tra worktree:
   ```bash
   git status --short
   ```
2. Xoa file sinh tu runtime khoi git tracking neu dang bi track:
   - `__pycache__/`
   - `*.pyc`
   - `.pytest_cache/`
   - `.next/`
   - `node_modules/`
   - uploads local
3. Them root `.gitignore`:
   ```gitignore
   **/__pycache__/
   **/*.py[cod]
   **/.pytest_cache/
   **/.next/
   **/node_modules/
   **/.env
   **/uploads/
   ```
4. Them `.dockerignore` cho frontend:
   ```dockerignore
   node_modules/
   .next/
   .env
   .env.*
   npm-debug.log*
   ```
5. Chot branch production-readiness:
   ```bash
   git checkout -b codex/production-readiness
   ```

Acceptance:

- `git status --short` khong con runtime artifacts.
- Khong co `.env` trong Docker build context.

## 5. Phase 1 - Config Va Secret Safety

Muc tieu: production khong bao gio chay bang default dev secret.

Backend can sua:

1. Them validation trong `app/core/config.py`:
   - `ENVIRONMENT in {"development","staging","production"}`.
   - Neu `ENVIRONMENT=production`, cac bien sau bat buoc phai set va khac default:
     - `SECRET_KEY`
     - `DATABASE_URL`
     - `REDIS_URL`
     - `RABBITMQ_URL`
     - `CORS_ORIGINS`
     - `VNP_TMN_CODE`
     - `VNP_HASH_SECRET`
     - `VNP_RETURN_URL`
     - `GEMINI_API_KEY`
     - Cloudinary secrets neu upload anh production bat buoc.
2. Xoa hoac doi default nguy hiem:
   - `SECRET_KEY="yag_development_secret_key_change_in_production"`
   - `VNP_HASH_SECRET="YAGDEVSECRETKEY12345678"`
   - `VNP_TMN_CODE="YAGTEST1"`
3. Them `.env.example` production-safe:
   - chi co placeholder, khong co secret that.
4. CORS production:
   - chi allow frontend domain that.
   - khong allow wildcard credentials.

Frontend can sua:

1. Doi mock default:
   ```ts
   useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true"
   ```
2. Yeu cau build-time env ro rang:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_WS_BASE_URL`
   - `NEXT_PUBLIC_USE_MOCKS=false`
3. Neu production ma API base la localhost thi fail build.

Acceptance:

- Backend production start fail neu thieu secret.
- Frontend production build fail neu `NEXT_PUBLIC_API_BASE_URL` la localhost.

## 6. Phase 2 - Docker Va Deployment Topology

Muc tieu: tach local compose va production deploy.

Tao cac file:

- `docker-compose.local.yml` cho dev.
- `docker-compose.prod.yml` hoac Kubernetes/GCP manifests cho production.
- `nginx/nginx.conf` neu dung VM/GCE Docker deploy.

Production rules:

- Chi expose public:
  - `80/443` qua Nginx/Load Balancer.
  - frontend public port neu khong dung reverse proxy rieng.
- Khong public expose:
  - Postgres `5432`
  - Redis `6379`
  - RabbitMQ `5672`
  - RabbitMQ UI `15672`
- Backend, worker, Redis, RabbitMQ, DB nam trong private network.
- Them restart policy, resource limits va healthchecks.
- Gan env qua secret manager hoac file env ngoai git.
- Bo `version: "3.9"` obsolete.

Frontend Dockerfile can them build args:

```dockerfile
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WS_BASE_URL
ARG NEXT_PUBLIC_USE_MOCKS=false
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WS_BASE_URL=$NEXT_PUBLIC_WS_BASE_URL
ENV NEXT_PUBLIC_USE_MOCKS=$NEXT_PUBLIC_USE_MOCKS
```

Backend Dockerfile:

- Dung non-root user nhu hien tai.
- Them `HEALTHCHECK` hoac de orchestration healthcheck goi `/health/ready`.
- Can can nhac Gunicorn/Uvicorn workers:
  ```bash
  gunicorn app.main:app -k uvicorn.workers.UvicornWorker --workers 2 --bind 0.0.0.0:8000
  ```

Acceptance:

- Production manifest khong expose DB/Redis/RabbitMQ public.
- Build frontend image voi prod API URL va mock false.
- `/health/ready` duoc dung lam readiness probe.

## 7. Phase 3 - Database Migration Lifecycle

Muc tieu: migration la source of truth, khong seed/drop production.

Cong viec:

1. Chon Alembic hoac migration runner co version table.
2. Neu dung Alembic:
   - them `alembic.ini`
   - them `migrations/env.py`
   - tao baseline tu schema hien co.
3. Neu giu SQL runner:
   - them bang `schema_migrations`.
   - moi migration chi chay mot lan.
   - ghi checksum/version/applied_at.
4. Cap nhat migration hien co:
   - `V1` base schema.
   - `V2` user lock columns.
   - `V3` production alignment.
5. Viet migration test tren DB rong.
6. Viet schema drift test so sanh ORM va DB.
7. Tach seed:
   - `seed_dev.py`: upsert data demo, khong drop DB.
   - `reset_dev_db.py`: drop/recreate chi cho local, co confirm.
   - `seed.py` hien tai khong duoc dung production vi co `Base.metadata.drop_all`.

Acceptance:

- Deploy command:
  ```bash
  python -m app.manage_migrations
  ```
  hoac:
  ```bash
  alembic upgrade head
  ```
  chay idempotent va co version tracking.
- Khong co code production nao goi `drop_all`.

## 8. Phase 4 - Backend Security Hardening

Muc tieu: giam rui ro khi public internet.

Cong viec:

1. JWT/session:
   - Ngung dua token vao WebSocket query string.
   - Uu tien HttpOnly Secure SameSite cookie.
   - Neu van dung Bearer token, khong log full URL/query.
2. LocalStorage:
   - Tam chap nhan cho demo, nhung production nen chuyen token sang cookie.
3. Rate limit:
   - Nginx/Load Balancer rate limit `/api/auth/login`, `/api/ai/*`, `/api/payment/*`.
4. Error contract:
   - Khong leak exception raw string trong HTTP 500.
   - Co request id cho moi request.
5. Headers:
   - Backend behind Nginx with HSTS, CSP, X-Frame-Options, Referrer-Policy.
6. CORS:
   - chi allow production frontend origin.
7. File upload:
   - gioi han size/type.
   - scan filename/content-type.
   - chi upload Cloudinary, khong public local uploads production.
8. Account security:
   - lock user token cu bi chan da co.
   - them login throttling.
   - password reset OTP khong leak existence, Redis TTL bat buoc.

Acceptance:

- Security smoke:
  - sai role goi `/api/v1/admin/*` tra 403.
  - WebSocket khong token hop le bi close.
  - XSS payload trong notification/comment khong execute.

## 9. Phase 5 - Payment Production Hardening

Muc tieu: VNPAY IPN khong cong premium sai va co audit day du.

Cong viec:

1. `process_ipn` can:
   - verify checksum truoc moi update.
   - lay transaction bang row lock:
     ```python
     .with_for_update()
     ```
   - validate amount.
   - validate `vnp_ResponseCode` va `vnp_TransactionStatus`.
   - ghi:
     - `paid_at`
     - `failed_at`
     - `vnp_response_code`
     - `vnp_transaction_status`
     - `ipn_received_at`
     - `raw_ipn_payload`
   - idempotent: IPN lap lai khong cong premium lan 2.
   - update transaction va user premium trong cung DB transaction.
2. Them endpoint transaction detail:
   - `GET /api/v1/payment/transactions/{vnp_txn_ref}`
3. Payment result frontend:
   - poll transaction/membership status.
   - hien pending neu IPN chua ve.
4. Production VNPAY:
   - return URL domain production.
   - IPN URL public HTTPS.
   - secret lay tu Secret Manager.

Acceptance:

- Test IPN success lap lai 2 lan chi cong premium 1 lan.
- Test wrong amount/wrong checksum khong update transaction.
- Test failed payment set `failed_at`.

## 10. Phase 6 - Worker, Queue Va AI Moderation

Muc tieu: publish chapter async on dinh va quan sat duoc.

Cong viec:

1. Chot queue name duy nhat:
   - Khuyen nghi theo docs: `ai.moderation`.
   - Cap nhat producer, worker, tests, docs.
2. Them retry topology:
   - `ai.moderation`
   - `ai.moderation.retry`
   - `ai.moderation.dlq`
3. Khong `time.sleep(60)` trong consumer main flow.
4. Them retry count va dead-letter sau max retry.
5. Moderation log:
   - ghi `model_name`
   - ghi `raw_response`
   - ghi `created_by`
6. Notification:
   - worker tao notification DB truoc.
   - Redis/WebSocket chi delivery realtime.
7. Embedding sync:
   - approved chapter -> async reindex story embedding.
   - neu Gemini fail, khong fail moderation transaction.

Acceptance:

- Publish endpoint tra HTTP 202.
- Worker xu ly task, update status, insert log, tao notification.
- RabbitMQ UI/metrics thay queue depth, retry, dlq.

## 11. Phase 7 - Scheduler, Notifications Va View Count

Muc tieu: background jobs khong bi mat/nhan doi khi scale.

Cong viec:

1. Scheduler:
   - khong chay mac dinh trong moi backend replica.
   - tao service rieng `scheduler` hoac dung Cloud Scheduler/CronJob.
   - neu chay trong app, can distributed lock.
2. Publish schedule schema:
   - dung `chapter_id`, `published_chapter_id`, `reminded_at`, `missed_at`, `cadence`, `created_by`.
3. Reminder:
   - upcoming <= 24h tao notification va set `reminded_at`.
   - missed tao notification, admin alert va set `missed_at`.
4. View count:
   - flush Redis -> DB bang atomic get/delete hoac Lua script.
   - job rieng, khong phu thuoc 1 backend process.
5. Notifications:
   - `create_notification` la entrypoint chinh.
   - API list/mark read/mark all read da co, can pagination va unread count.

Acceptance:

- User offline van thay notification khi quay lai.
- Scale 2 backend replicas khong double-run scheduler.
- Redis down khong lam chapter read fail.

## 12. Phase 8 - Frontend Production Integration

Muc tieu: UI production dung backend that va an toan.

Cong viec:

1. Env:
   - mock false default.
   - fail build neu API/WS la localhost trong production.
2. Auth:
   - role guard day du cho `/author/*`, `/admin/*`.
   - redirect theo role sau login.
   - neu API 401 thi clear token va redirect auth.
3. XSS:
   - thay moi `innerHTML` toast bang React state hoac DOM `textContent`.
4. API client:
   - bo `any` dan dan bang API types.
   - timeout va abort da co, can 401 handler global.
   - snake_case/camelCase alias ro rang.
5. Pages:
   - Reader: home, discover, story detail, reader mode, comments, review, library, paywall.
   - Author: my stories, create story, create chapter, draft autosave, publish, schedule.
   - Admin: stats, moderation queue, approve/reject, audit logs/reports.
6. Assets:
   - configure `next/image` Cloudinary remotePatterns.
   - fallback cover image khong lam layout shift.
7. Realtime:
   - WebSocket reconnect backoff.
   - khong dua token vao query string production.

Acceptance:

- `npm run lint`
- `npm run build`
- Browser smoke voi production-like env.

## 13. Phase 9 - Performance Va Scalability

Muc tieu: du chiu tai internet co nguoi dung that.

Cong viec:

1. Stories API:
   - them pagination mac dinh `page`, `limit`.
   - count `chapter_count`, `rating_count` bang subquery thay vi load collection.
2. Comments/reviews/admin moderation:
   - pagination bat buoc.
3. Search:
   - keyword search dung full-text/trigram index.
   - semantic search fallback keyword/popular.
4. DB indexes:
   - verify FK indexes.
   - verify pgvector index.
5. Redis:
   - cache chapter content.
   - cache hot story lists neu can.
6. Load test:
   - Locust/k6 cho:
     - login
     - story list
     - chapter read
     - comments
     - semantic search

Acceptance:

- Story list p95 < 500ms voi data mau lon.
- Chapter read p95 < 500ms.
- Semantic search p95 < 1.5s voi index.

## 14. Phase 10 - Observability, Backup Va Ops

Muc tieu: khi loi production, doi co the thay, rollback va khoi phuc.

Cong viec:

1. Logging:
   - request id middleware.
   - structured logs JSON.
   - khong log JWT/query secrets.
2. Monitoring:
   - uptime checks `/health/live`, `/health/ready`.
   - metrics DB connection, Redis, RabbitMQ queue depth, worker failures.
3. Error tracking:
   - Sentry hoac tuong duong cho frontend/backend.
4. Backup:
   - Postgres daily backup.
   - backup restore drill.
   - Redis/RabbitMQ durable volume policy.
5. Deployment:
   - blue/green hoac rolling deploy.
   - migration truoc app rollout.
   - rollback image tag va DB rollback plan.
6. Alerts:
   - backend down.
   - ready degraded.
   - queue depth high.
   - payment IPN error spike.
   - Gemini rate limit/error spike.

Acceptance:

- Co runbook deploy/rollback.
- Backup restore test thanh cong tren DB staging.

## 15. CI/CD Gate De Xuat

Pipeline toi thieu:

```bash
# Backend
cd src/backend
python -m pytest tests -q
python -m app.manage_migrations --check

# Frontend
cd src/frontend
npm ci
npm run lint
npm run build

# Docker
docker build -t yag-backend:ci src/backend
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.com \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api-staging.example.com \
  --build-arg NEXT_PUBLIC_WS_BASE_URL=wss://api-staging.example.com \
  --build-arg NEXT_PUBLIC_USE_MOCKS=false \
  -t yag-frontend:ci src/frontend
```

Pipeline integration:

```bash
docker compose -f docker-compose.local.yml up -d --build
docker compose exec backend python -m app.manage_migrations
docker compose exec backend python -m pytest tests -q
curl -f http://localhost:8000/health/ready
curl -f http://localhost:8000/api/v1/membership/plans
```

## 16. Production Smoke Checklist

Sau moi deploy staging/production:

- [ ] `GET /health/live` OK.
- [ ] `GET /health/ready` OK.
- [ ] Login reader/author/admin OK.
- [ ] Reader `/home` load data tu DB.
- [ ] Story detail load chapters approved.
- [ ] Reader read free chapter OK.
- [ ] Free reader vao premium chapter thay paywall.
- [ ] Comment/review/bookmark OK.
- [ ] Author create story/chapter OK.
- [ ] Autosave draft OK.
- [ ] Publish chapter tra 202.
- [ ] Worker update moderation status.
- [ ] Notification visible after worker/scheduler event.
- [ ] Admin moderation queue load OK.
- [ ] Admin approve/reject ghi audit log.
- [ ] Membership plans load from DB.
- [ ] VNPAY checkout URL dung production return URL.
- [ ] IPN sandbox/staging update transaction va premium.
- [ ] Logs khong in JWT/token/secrets.

## 17. Thu Tu Uu Tien Thuc Hien

### P0 - Bat buoc truoc khi public internet

1. Secret/config fail-fast.
2. Frontend build env va mock false.
3. Docker production topology khong expose DB/Redis/RabbitMQ.
4. `.dockerignore` frontend va root `.gitignore`.
5. Migration/seed khong destructive.
6. Payment IPN idempotent + audit.
7. Bo token trong WebSocket URL va bo `innerHTML`.

### P1 - Bat buoc truoc beta user

1. Notification DB-first.
2. Worker retry/DLQ.
3. Scheduler service rieng.
4. Test DB isolation.
5. API pagination.
6. Admin moderation queue day du field.
7. E2E smoke automation.

### P2 - Truoc khi scale

1. Observability/Sentry/metrics.
2. Load test.
3. Backup restore drill.
4. Blue/green deploy.
5. CDN/image optimization.

## 18. Ghi Chu Trien Khai

- Khong chay `python -m app.seed` tren production vi script hien tai drop toan bo schema.
- Khong commit `.env`.
- Khong deploy image frontend neu chua xac nhan bundle dung domain production.
- Khong expose RabbitMQ Management UI public.
- Khong de VNPAY sandbox secret/default trong production.
- Khong de scheduler chay trong nhieu backend replica neu chua co distributed lock.

## 19. Ma Tran Dieu Chinh Ma Nguon

Bang nay dung de bien plan thanh task code cu the. Moi dong nen duoc tach thanh PR nho neu lam theo team.

| Khu vuc | File/thu muc chinh | Can dieu chinh | Xac minh |
|---|---|---|---|
| Backend config | `src/backend/app/core/config.py` | Fail-fast production env, bo default secret nguy hiem, validate CORS/API/payment/AI/Cloudinary | Start backend voi `ENVIRONMENT=production` thieu secret phai fail |
| Backend main | `src/backend/app/main.py` | Giu health endpoints, them request id/error handler/security middleware neu can | `/health/live`, `/health/ready`, log co request id |
| Auth | `src/backend/app/api/v1/endpoints/auth.py`, `src/backend/app/services/auth_service.py`, `src/backend/app/core/security.py` | Lock/throttle login, token revocation, chuyen WS auth khoi query string | Login/401/403 tests, WS unauthorized close |
| Payment | `src/backend/app/services/payment.py`, `src/backend/app/api/v1/endpoints/payment.py` | Idempotent IPN, row lock, verify amount/status/checksum, ghi audit fields | Test IPN success repeat, fail checksum, wrong amount |
| Migration | `src/backend/migrations/`, `src/backend/app/manage_migrations.py` | Version table/checksum hoac Alembic, migration idempotent, test empty DB | Migration chay 2 lan khong loi |
| Seed data | `src/backend/app/seed.py` | Tach `seed_dev` va `reset_dev_db`, bo `drop_all` khoi luong production | Search khong con `drop_all` trong startup/deploy |
| Worker queue | `src/backend/app/worker/`, `src/backend/app/services/publish_service.py`, `src/backend/app/services/moderation_service.py` | Chot queue name, retry/DLQ, notification DB-first, log raw AI response | Publish 202 -> worker update chapter/log/notification |
| Scheduler | `src/backend/app/services/schedule_service.py` | Tach service/job rieng, distributed lock, reminder/missed idempotent | Chay 2 instance khong double notification |
| Notifications | `src/backend/app/models/notification.py`, `src/backend/app/api/v1/endpoints/notifications.py`, `src/backend/app/services/notification_service.py` | DB la source of truth, Redis chi realtime delivery, pagination/unread count | Offline user van thay notification khi login lai |
| Stories API | `src/backend/app/api/v1/endpoints/stories.py`, `src/backend/app/services/story_service.py` neu co | Pagination, avoid N+1, filters/indexes, chapter_count/rating_count toi uu | Story list p95 va query count duoc kiem soat |
| AI APIs | `src/backend/app/api/v1/endpoints/ai.py`, `src/backend/app/services/ai_service.py` | Timeout, context <= 1000 words, fallback khi Gemini fail, rate limit | AI suggest fail graceful, semantic fallback |
| Frontend env | `src/frontend/src/lib/env.ts`, `src/frontend/Dockerfile`, `src/frontend/.dockerignore` | Mock false default, build args `NEXT_PUBLIC_*`, fail build neu localhost production | `npm run build` voi prod env |
| Frontend auth | `src/frontend/src/lib/auth-context.tsx`, `src/frontend/src/components/auth/RequireAuth.tsx` | Role guard, 401 handler, redirect theo role, token strategy production | Reader/Author/Admin route smoke |
| Frontend realtime | `src/frontend/src/lib/realtime.ts` | Bo token query string, reconnect backoff, user-friendly offline state | WS connect/reconnect tests |
| Frontend XSS | `src/frontend/src/components/runtime/ClientInteractions.tsx`, cac toast/comment renderer | Thay `innerHTML` bang React/textContent/sanitizer | XSS payload khong execute |
| Frontend pages | `src/frontend/src/app/` va `src/frontend/src/components/features/` | Route dung S01-S21, error/loading/empty states, API-backed data | Browser smoke full Reader/Author/Admin |
| Docker local/prod | `docker-compose.yml`, `docker-compose.local.yml`, `docker-compose.prod.yml`, `nginx/` | Tach dev/prod, private network, no public DB/Redis/RabbitMQ, TLS/rate limit | `docker compose config`, port scan |
| CI/CD | `.github/workflows/` | Lint/build/test/migration/Docker/security smoke gates | PR fail neu bat ky gate fail |
| Docs/runbook | `docs/` | Deploy, rollback, backup restore, incident runbook | Staging deploy theo docs khong can hoi tac gia |

## 20. Thu Tu PR De Trien Khai

De tranh lam vo nhieu luong cung luc, nen chia thanh cac PR theo thu tu sau:

1. PR-01 Repo hygiene va Docker context:
   - Them root `.gitignore`.
   - Them `src/frontend/.dockerignore`.
   - Loai runtime artifacts khoi git tracking.
   - Khong thay doi logic app.
2. PR-02 Production env safety:
   - Backend config fail-fast.
   - Frontend env/mock false/build args.
   - Cap nhat `.env.example`.
3. PR-03 Migration va seed safety:
   - Hoan thien migration runner/version table hoac Alembic.
   - Tach destructive reset khoi seed dev.
   - Sua test DB isolation.
4. PR-04 Payment hardening:
   - VNPAY IPN idempotency/row lock/audit.
   - Them tests payment negative/duplicate.
5. PR-05 Realtime auth va XSS:
   - Bo token query string.
   - Sua toast/renderer `innerHTML`.
   - Them security smoke.
6. PR-06 Worker moderation production:
   - Queue name/retry/DLQ.
   - Notification DB-first.
   - Worker health/logging.
7. PR-07 Scheduler va view-count jobs:
   - Tach scheduler/flush worker.
   - Idempotency va distributed lock.
8. PR-08 API performance:
   - Pagination cho list endpoints.
   - Index/query optimization.
9. PR-09 Frontend flow completion:
   - Full Reader/Author/Admin smoke.
   - Loading/error/empty states.
10. PR-10 Ops/observability/deploy:
   - Nginx/TLS/rate limit manifests.
   - Logging/metrics/Sentry/backup/runbook.

## 21. Moi Truong Can Co

### Local

- Dung Docker Compose local.
- Co the dung seed demo.
- Cho phep expose DB/Redis/RabbitMQ tren localhost.
- Cho phep mock neu developer chu dong set `NEXT_PUBLIC_USE_MOCKS=true`.

### Staging

- Gan domain rieng, HTTPS that.
- Dung secret rieng, khong dung secret production.
- Dung DB staging rieng, co backup.
- VNPAY sandbox/staging.
- Gemini key rieng neu co.
- Bat tat ca CI/CD gates nhu production.

### Production

- Chi public HTTPS.
- DB/Redis/RabbitMQ private.
- Secret lay tu Secret Manager hoac env store ngoai git.
- VNPAY production config.
- Backup va monitoring bat buoc.
- Rollback image tag phai san sang truoc moi release.

## 22. Lenh Kiem Tra Cuoi Truoc Khi Public

Chay trong CI hoac staging release pipeline:

```bash
git status --short

cd src/backend
python -m pytest tests -q
python -m app.manage_migrations --check

cd ../frontend
npm ci
npm run lint
npm run build

cd ../..
docker compose -f docker-compose.local.yml config
docker compose -f docker-compose.local.yml up -d --build
curl -f http://localhost:8000/health/live
curl -f http://localhost:8000/health/ready
```

Smoke flow bat buoc tren staging:

- Dang ky/dang nhap/logout.
- Reader doc chapter free va bi paywall dung voi premium chapter.
- Author tao story, tao chapter, publish, nhan notification moderation.
- Admin xem moderation queue va approve/reject.
- Checkout VNPAY tao transaction pending.
- IPN success update membership dung mot lan.
- Scheduler tao reminder/missed notification dung mot lan.
- Redis/RabbitMQ restart khong lam mat data quan trong.

## 23. Tieu Chi Khong Duoc Deploy

Khong deploy production neu gap mot trong cac dieu kien sau:

- Production backend van start duoc voi default `SECRET_KEY` hoac default VNPAY secret.
- Frontend bundle van tro den `localhost`, `127.0.0.1`, hoac mock mode.
- Migration can drop table/data production de chay thanh cong.
- Payment IPN duplicate co the cong premium nhieu lan.
- DB/Redis/RabbitMQ/RabbitMQ UI duoc expose public.
- WebSocket token nam trong URL query string.
- Co renderer dung `innerHTML` voi du lieu user/API.
- Test suite phai ghi truc tiep vao dev DB moi pass.
- Worker moderation fail lam chapter ket vinh vien o `pending` ma khong co retry/DLQ/alert.
- Khong co backup va rollback path.
