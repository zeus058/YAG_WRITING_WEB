# YAG - Writing Novels Web

[![CI/CD Pipeline](https://github.com/zeus058/SE_Writing_Web/actions/workflows/ci.yml/badge.svg)](https://github.com/zeus058/SE_Writing_Web/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

YAG is a full-stack web application for reading and writing online novels. It supports AI-assisted authoring, semantic story search, asynchronous AI moderation, real-time notifications, and premium membership payments.

This project was built for the HCMUS 2025-2026 Introduction to Software Engineering course.

## Contents

- [Main Features](#main-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Testing](#testing)
- [Docker Compose](#docker-compose)
- [Production Deployment](#production-deployment)
- [CI/CD](#cicd)
- [API Map](#api-map)
- [Project Hygiene](#project-hygiene)
- [Troubleshooting](#troubleshooting)
- [Team](#team)

## Main Features

| Area | What it includes |
|---|---|
| Authentication | Register, login, JWT auth, reset password, change password, and role-based access |
| Reader | Home feed, discovery, story detail, reader mode, comments, reviews, library, and reading history |
| Author | Story management, chapter drafting, WebSocket autosave, AI writing suggestions, and scheduled publishing |
| AI | Gemini plot suggestions, embeddings, semantic search, recommendations, and moderation support |
| Moderation | RabbitMQ moderation pipeline, AI moderation logs, admin review queue, alerts, and notifications |
| Membership | Membership plans, premium chapter access, PayOS checkout, and payment verification |
| Admin | Dashboard metrics, moderation queue, user/story controls, and audit logs |
| Realtime | Native WebSocket routes for notifications and chapter draft autosave |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS v4 |
| Backend | FastAPI, Gunicorn, Uvicorn, Pydantic, SQLAlchemy 2 |
| Database | PostgreSQL 16 with pgvector |
| Cache | Redis 7 |
| Queue | RabbitMQ 3.13 |
| AI | Google Gemini API, `gemini-1.5-flash`, `text-embedding-004` |
| Media | Cloudinary |
| Payment | PayOS |
| Scheduler | APScheduler |
| Deployment | Docker Compose, Nginx, Google Cloud Run backend, Vercel frontend |
| CI | GitHub Actions, pytest, ESLint, Docker config validation, Bandit, optional SonarQube |

## Architecture

```mermaid
flowchart LR
    user["Browser"]
    nginx["Nginx reverse proxy"]
    frontend["Next.js frontend"]
    backend["FastAPI backend"]
    scheduler["Scheduler service"]
    worker["Moderation worker"]
    postgres["PostgreSQL + pgvector"]
    redis["Redis"]
    rabbit["RabbitMQ"]
    gemini["Gemini API"]
    cloudinary["Cloudinary"]
    payos["PayOS"]

    user --> nginx
    nginx --> frontend
    nginx --> backend
    backend --> postgres
    backend --> redis
    backend --> rabbit
    backend --> cloudinary
    backend --> payos
    scheduler --> postgres
    scheduler --> redis
    worker --> rabbit
    worker --> postgres
    worker --> redis
    worker --> gemini
```

### Runtime services

| Service | Purpose |
|---|---|
| `postgres` | Main relational database and pgvector storage |
| `redis` | Cache, view counters, session support, and pub/sub support |
| `rabbitmq` | Message broker for asynchronous moderation jobs |
| `migrate` | One-shot SQL migration runner |
| `backend` | FastAPI API server |
| `scheduler` | Dedicated service for scheduled jobs and view count flushes |
| `moderation-worker` | RabbitMQ consumer that runs AI moderation |
| `frontend` | Next.js standalone frontend |
| `nginx` | HTTP/HTTPS reverse proxy and WebSocket routing |

## Repository Structure

```text
SE_Writing_Web/
|-- .github/
|   `-- workflows/
|       `-- ci.yml
|-- docs/
|   |-- fix/
|   `-- task/
|-- nginx/
|   |-- certs/
|   |   `-- .gitignore
|   `-- nginx.conf
|-- src/
|   |-- backend/
|   |   |-- app/
|   |   |   |-- api/
|   |   |   |-- core/
|   |   |   |-- models/
|   |   |   |-- schemas/
|   |   |   |-- services/
|   |   |   |-- worker/
|   |   |   |-- main.py
|   |   |   |-- manage_migrations.py
|   |   |   |-- reset_dev_db.py
|   |   |   `-- seed.py
|   |   |-- migrations/
|   |   |-- tests/
|   |   |-- Dockerfile
|   |   |-- requirements.txt
|   |   `-- worker.py
|   `-- frontend/
|       |-- src/
|       |   |-- app/
|       |   |-- components/
|       |   |-- data/
|       |   `-- lib/
|       |-- Dockerfile
|       |-- package.json
|       `-- package-lock.json
|-- .env.example
|-- AGENTS.md
|-- docker-compose.yml
|-- README.md
`-- sonar-project.properties
```

## Quick Start

### Prerequisites

- Git
- Docker Desktop or Docker Engine with Compose v2
- Python 3.11+
- Node.js 20+

### 1. Clone the repository

```bash
git clone https://github.com/zeus058/SE_Writing_Web.git
cd SE_Writing_Web
```

### 2. Start local infrastructure

The default Docker Compose command starts only PostgreSQL, Redis, and RabbitMQ. Run the backend and frontend directly from your terminal during development.

```bash
docker compose up -d
```

Local service defaults:

| Service | URL/Port | Credentials |
|---|---|---|
| PostgreSQL | `localhost:5432` | `yag_user / yag_secret`, database `yag_db` |
| Redis | `localhost:6379` | No password by default |
| RabbitMQ | `localhost:5672` | `yag_mq / yag_mq_secret` |
| RabbitMQ UI | `http://localhost:15672` | `yag_mq / yag_mq_secret` |

### 3. Run the backend

```bash
cd src/backend
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.manage_migrations
uvicorn app.main:app --reload --port 8000
```

For the local Docker infrastructure, keep these backend values:

```env
POSTGRES_SERVER=localhost
POSTGRES_USER=yag_user
POSTGRES_PASSWORD=yag_secret
POSTGRES_DB=yag_db
REDIS_HOST=localhost
RABBITMQ_HOST=localhost
RABBITMQ_USER=yag_mq
RABBITMQ_PASSWORD=yag_mq_secret
```

Set real keys only when you need the related features:

```env
GEMINI_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
PAYOS_RETURN_URL=http://localhost:3000/payment/result
```

Optional development data:

```bash
python -m app.seed
```

Run the moderation worker in a second backend terminal when testing publishing/moderation flows:

```bash
cd src/backend
.venv\Scripts\activate
python worker.py
```

### 4. Run the frontend

```bash
cd src/frontend
cp .env.example .env
npm install
npm run dev
```

Open:

| App | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend docs | `http://localhost:8000/docs` |
| Backend readiness | `http://localhost:8000/health/ready` |

## Environment Variables

### Backend essentials

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | `development`, `staging`, or `production` |
| `SERVICE_ROLE` | `api`, `worker`, `migrate`, or `scheduler` |
| `SECRET_KEY` | JWT signing key |
| `CORS_ORIGINS` | Comma-separated frontend origins |
| `DATABASE_URL` | Optional full PostgreSQL URL; overrides component DB variables |
| `POSTGRES_*` | PostgreSQL component configuration |
| `REDIS_URL` | Optional full Redis URL |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis component configuration |
| `RABBITMQ_URL` | Optional full RabbitMQ URL |
| `RABBITMQ_*` | RabbitMQ component configuration |
| `GEMINI_API_KEY` | Enables Gemini AI features |
| `CLOUDINARY_*` | Enables avatar and cover uploads |
| `PAYOS_*` | PayOS checkout, callback, and verification settings |
| `ALLOW_WEBSOCKET_QUERY_TOKEN` | Must be `false` in production |

### Frontend essentials

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public frontend origin |
| `NEXT_PUBLIC_API_BASE_URL` | API origin without `/api/v1` |
| `NEXT_PUBLIC_WS_BASE_URL` | WebSocket origin or path |
| `NEXT_PUBLIC_DEPLOY_ENV` | `development`, `staging`, or `production` |
| `NEXT_PUBLIC_USE_MOCKS` | UI mock mode; keep `false` outside demos |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | API request timeout |

For Docker Compose, use the root `.env.example`. For native local development, use `src/backend/.env.example` and `src/frontend/.env.example`.

## Database Migrations

The backend uses a custom versioned SQL migration runner instead of Alembic.

```bash
cd src/backend
python -m app.manage_migrations
python -m app.manage_migrations --check
```

Migration files live in `src/backend/migrations/`:

```text
V1__initial_schema.sql
V2__hotfix_users_lock_columns.sql
V3__p1_schema_alignment.sql
V4__init_membership_plans.sql
V5__add_story_metadata.sql
```

Rules:

- Do not edit migration files that may already have been applied.
- Add schema changes as a new `V{N}__description.sql` file.
- The `schema_migrations` table stores version, filename, checksum, and apply time.
- Use `app.seed` only for development data, not production initialization.

## Testing

### Backend

```bash
cd src/backend
python -m pytest -q
python -m pytest --cov=app --cov-report=term-missing --cov-report=xml:coverage.xml
python -m flake8 app tests --count --select=E9,F63,F7,F82 --show-source --statistics
```

### Frontend

```bash
cd src/frontend
npm run lint
npm run build
```

### Docker config validation

```bash
docker compose config
docker compose --profile prod config
```

## Docker Compose

| Command | Starts | Use case |
|---|---|---|
| `docker compose up -d` | `postgres`, `redis`, `rabbitmq` | Local infrastructure only |
| `docker compose --profile app up -d --build` | Full stack | Local full-stack container test |
| `docker compose --profile prod up -d --build` | Full stack | Self-hosted production deployment |

For the `app` profile, copy the root `.env.example` to `.env` and keep `ENVIRONMENT=development`.

For the `prod` profile:

- Set `ENVIRONMENT=production`.
- Use strong non-default secrets.
- Set HTTPS values for `CORS_ORIGINS`, `FRONTEND_PUBLIC_URL`, `API_PUBLIC_URL`, and `WS_PUBLIC_URL`.
- Place TLS files at `nginx/certs/fullchain.pem` and `nginx/certs/privkey.pem`.

## Production Deployment

### Option 1: Self-hosted Docker Compose

1. Prepare a server with Docker and Docker Compose.
2. Clone this repository.
3. Copy `.env.example` to `.env` at the repository root.
4. Fill every production variable.
5. Add TLS certificates under `nginx/certs/`.
6. Start the production profile:

```bash
docker compose --profile prod up -d --build
docker compose ps
docker compose logs -f backend moderation-worker nginx
curl -fsS https://your-domain.com/health/ready
```

Minimum production values:

```env
ENVIRONMENT=production
SECRET_KEY=<strong random value>
ALLOW_WEBSOCKET_QUERY_TOKEN=false
CORS_ORIGINS=https://your-domain.com
FRONTEND_PUBLIC_URL=https://your-domain.com
API_PUBLIC_URL=https://your-domain.com
WS_PUBLIC_URL=wss://your-domain.com/ws
REDIS_PASSWORD=<strong password or use REDIS_URL>
RABBITMQ_USER=<non-default user or use RABBITMQ_URL>
RABBITMQ_PASSWORD=<strong password or use RABBITMQ_URL>
GEMINI_API_KEY=<production key>
CLOUDINARY_CLOUD_NAME=<production value>
CLOUDINARY_API_KEY=<production value>
CLOUDINARY_API_SECRET=<production value>
PAYOS_CLIENT_ID=<production client ID>
PAYOS_API_KEY=<production API key>
PAYOS_CHECKSUM_KEY=<production checksum key>
PAYOS_RETURN_URL=https://your-domain.com/payment/result
```

`API_PUBLIC_URL` should be the origin only, for example `https://your-domain.com`. The frontend app appends `/api/v1` by itself.

### Option 2: Cloud Run backend and Vercel frontend

The repository also supports a cloud deployment flow:

- GitHub Actions builds and deploys the backend to Google Cloud Run.
- Production secrets are stored in Google Secret Manager.
- The production database can use Supabase PostgreSQL.
- The frontend can be connected to Vercel for automatic deployments.

Required GitHub Actions secrets for Cloud Run deployment:

| Secret | Purpose |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity Federation provider resource |
| `GCP_SERVICE_ACCOUNT` | Google service account email used by GitHub Actions |
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `DATABASE_URL` | Production database URL used by migrations |
| `GCP_REGION` | Optional Cloud Run region; defaults to `asia-southeast1` |
| `GCP_GAR_REPO` | Optional Artifact Registry repo; defaults to `yag-repo` |

Expected Google Secret Manager secrets:

| Secret name | Value |
|---|---|
| `YAG_DATABASE_URL` | Production PostgreSQL/Supabase URL |
| `YAG_SECRET_KEY` | Strong JWT secret |
| `YAG_CORS_ORIGINS` | Allowed frontend origins |
| `YAG_REDIS_URL` | Production Redis URL |
| `YAG_RABBITMQ_URL` | Production RabbitMQ URL |
| `YAG_GEMINI_API_KEY` | Gemini API key |
| `YAG_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `YAG_CLOUDINARY_API_KEY` | Cloudinary API key |
| `YAG_CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `YAG_PAYOS_CLIENT_ID` | PayOS client ID |
| `YAG_PAYOS_API_KEY` | PayOS API key |
| `YAG_PAYOS_CHECKSUM_KEY` | PayOS checksum key |
| `YAG_PAYOS_RETURN_URL` | PayOS HTTPS return URL |

Vercel frontend environment variables:

```env
NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://your-backend.a.run.app
NEXT_PUBLIC_WS_BASE_URL=wss://your-backend.a.run.app/ws
NEXT_PUBLIC_DEPLOY_ENV=production
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_TIMEOUT_MS=12000
```

## CI/CD

The unified GitHub Actions workflow lives at `.github/workflows/ci.yml`.

| Trigger | Behavior |
|---|---|
| Push or pull request | Runs CI validation: backend tests, linting, frontend build, Docker checks, and audits |
| Push to `main` | Runs CD jobs for migrations and Cloud Run deployment when required secrets are configured |

Deployment jobs are designed to skip gracefully if the required GitHub secrets are missing.

## API Map

All API routes are mounted under `/api/v1`.

| Prefix | Module |
|---|---|
| `/auth` | Authentication, profile auth helpers, and password flows |
| `/stories` | Story CRUD, story detail, reviews, library, and history helpers |
| `/chapters` | Chapter CRUD, comments, reading, and view count |
| `/author/chapters` | Author autosave and draft editing helpers |
| `/publish` | Publish and moderation submission flows |
| `/payment` | PayOS status and payment history |
| `/payments` | Frontend-compatible payment alias |
| `/membership` | Membership plans and checkout alias |
| `/ai` | AI suggestions and semantic search helpers |
| `/recommendations` | Recommendation endpoints |
| `/admin` | Admin dashboard, moderation, audit, and alerts |
| `/notifications` | Notification listing and read state |

WebSocket routes:

| Route | Purpose |
|---|---|
| `/ws/notifications/{user_id}` | User notification stream |
| `/api/v1/ws/notifications/{user_id}` | Versioned notification stream alias |
| `/ws/stories/{story_id}/chapters/{chapter_id}` | Author chapter draft autosave |

Health routes:

| Route | Purpose |
|---|---|
| `/health` | Basic health |
| `/health/live` | Liveness |
| `/health/ready` | DB, Redis, and RabbitMQ readiness |

## Project Hygiene

- Do not commit `.env`, `.venv`, `node_modules`, `.next`, generated coverage, cache files, uploads, or TLS private keys.
- Keep production certificates outside Git; only `nginx/certs/.gitignore` should be tracked.
- Keep this README as the public project overview.
- Use `AGENTS.md` as the detailed internal engineering map for AI agents and maintainers.
- Add database changes through new migration files only.

## Troubleshooting

| Symptom | Check |
|---|---|
| Backend cannot start in production | Read the production validation error from `app/core/config.py` |
| Migration checksum mismatch | A migration already applied to DB was edited; create a new migration instead |
| AI moderation stays pending | Check `moderation-worker` logs and RabbitMQ queues |
| Semantic search returns weak results | Check `story_embeddings` data and Gemini embedding calls |
| PayOS result fails | Check `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, transaction amount, and webhook/callback params |
| WebSocket fails in production | Check Nginx `/ws/` routing, cookies, and `ALLOW_WEBSOCKET_QUERY_TOKEN=false` |
| Frontend API URL is wrong | `NEXT_PUBLIC_API_BASE_URL` must be the origin only, without `/api/v1` |

## Team

| Member | Main module | API prefix |
|---|---|---|
| Tran Gia Hien | F1 - Authentication | `/api/v1/auth` |
| Nguyen Duy Truong | F2 - PayOS Payment and Membership | `/api/v1/payment`, `/api/v1/membership` |
| Pham Huong Tra | F3 - AI Engine | `/api/v1/ai`, `/api/v1/recommendations` |
| Huynh Yen Nhi | F4 - Stories, Chapters, Editor | `/api/v1/stories`, `/api/v1/chapters` |
| Nguyen Phu Tho | F5 - Admin, Moderation | `/api/v1/admin` |

## License

No license file is currently included. Add a `LICENSE` file before distributing the project publicly under a specific open-source license.
