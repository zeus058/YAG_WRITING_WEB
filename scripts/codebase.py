#!/usr/bin/env python3
"""
Compact codebase map for YAG.

Purpose:
    Give a future agent a low-token, deployment-oriented understanding of this
    repository without scanning generated folders first.

Usage:
    python scripts/codebase.py
    python scripts/codebase.py --json
    python scripts/codebase.py --tree
    python scripts/codebase.py --routes
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]

IGNORE_DIRS = {
    ".git",
    ".next",
    ".pytest_cache",
    ".venv",
    "__pycache__",
    "node_modules",
    "uploads",
}

CODE_EXTS = {
    ".py",
    ".sql",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".css",
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".md",
}


CODEBASE = {
    "project": {
        "name": "YAG - Writing Novels Web",
        "kind": "full-stack web app",
        "goal": "AI-assisted novel writing and reading platform with semantic search, moderation, memberships, and admin operations.",
        "stack": [
            "Next.js 16 + React 19 + TypeScript + CSS/Tailwind-style global CSS",
            "FastAPI + SQLAlchemy + Pydantic + JWT + bcrypt",
            "PostgreSQL + pgvector",
            "Redis for OTP/cache/view counters/pubsub",
            "RabbitMQ for async AI moderation",
            "Google Gemini API for AI suggestions/embeddings/moderation",
            "Cloudinary for media",
            "VNPAY sandbox/payment IPN",
            "Docker Compose + Nginx",
        ],
        "role_model": (
            "Reader and author are modes of the same normal account. Login/register lands in reader mode (/home). "
            "Author screens are a mode switch, not a separate account type. Admin remains a separate privileged role."
        ),
    },
    "root": {
        "AGENTS.md": "authoritative project rules, domain model, use cases, screens, API contracts",
        "README.md": "project setup and product overview",
        "docker-compose.yml": "Postgres/Redis/RabbitMQ plus app/prod profile services: migrate, backend, worker, frontend, nginx",
        "nginx/nginx.conf": "reverse proxy, production-facing headers/proxy/rate-limit entry point",
        ".github/workflows/ci.yml": "CI checks",
        "docs/": "task and planning docs; do not treat as runtime code",
    },
    "backend": {
        "path": "src/backend",
        "entrypoints": {
            "app/main.py": "FastAPI app, CORS, health checks, middleware, websocket mounts, lifespan tasks",
            "worker.py": "moderation worker process entrypoint",
            "app/worker/main.py": "RabbitMQ consumer, moderation retry/DLQ handling, notifications",
            "app/manage_migrations.py": "versioned SQL migration runner",
            "app/seed.py": "seed data and demo accounts",
            "Dockerfile": "backend/worker/migrate image",
        },
        "core": {
            "app/core/config.py": "all env settings and production validation",
            "app/core/database.py": "SQLAlchemy engine/session",
            "app/core/security.py": "bcrypt password hashing and JWT helpers",
            "app/api/deps.py": "auth dependencies; reader/author/admin access rules",
        },
        "api_prefixes": {
            "/api/v1/auth": "register, login, me, password reset, profile/avatar",
            "/api/v1/stories": "story CRUD, library/bookmarks, reviews, story chapters, semantic search",
            "/api/v1/chapters": "draft create/update, read chapter, comments, view count flush",
            "/api/v1/author/chapters": "author-mode autosave REST and websocket",
            "/api/v1/ai": "author suggestions and AI search/recommend helpers",
            "/api/v1/membership": "plans, membership checkout alias",
            "/api/v1/payment and /api/v1/payments": "VNPAY checkout, IPN, transaction status/history",
            "/api/v1/admin": "stats, moderation, lock/unlock, audit, schedule alerts",
            "/api/v1/recommendations": "reader recommendations",
            "/api/v1/notifications": "notification list/read/unread-count",
            "/ws/notifications/{user_id}": "notification websocket",
            "/ws/stories/{story_id}/chapters/{chapter_id}": "draft autosave websocket",
        },
        "models": [
            "User",
            "Profile",
            "Story",
            "Chapter",
            "StoryEmbedding",
            "Comment",
            "Review",
            "Library",
            "ReadingHistory",
            "MembershipPlan",
            "Transaction",
            "AiModerationLog",
            "PublishSchedule",
            "Notification",
            "AdminAlert",
            "AdminAuditLog",
        ],
        "services": {
            "auth_service.py": "register/login/reset; new normal users are reader accounts",
            "payment_service.py": "VNPAY URL signing, IPN checksum, replay/tamper protection, premium extension",
            "membership_service.py": "membership plan/status helpers",
            "ai_service.py": "Gemini suggestions, embeddings, semantic/full-text fallback search",
            "moderation_service.py": "Gemini moderation prompt/result application",
            "publish_service.py": "publish chapter, queue moderation, schedule integration",
            "schedule_service.py": "publish schedule scan, reputation/admin alert behavior",
            "notification_service.py": "DB notifications and websocket streaming",
            "admin_service.py": "admin stats, reports, moderation decisions",
            "media_service.py / cloudinary_service.py": "cover/avatar upload integration",
        },
        "migrations": [
            "migrations/V1__initial_schema.sql",
            "migrations/V2__hotfix_users_lock_columns.sql",
            "migrations/V3__p1_schema_alignment.sql",
        ],
        "tests": "src/backend/tests has pytest coverage for auth, payment, DB, admin, AI, moderation, notifications, publish, schedule, profile.",
    },
    "frontend": {
        "path": "src/frontend",
        "entrypoints": {
            "src/app/layout.tsx": "global app shell providers and metadata",
            "src/app/page.tsx": "public landing page",
            "src/app/globals.css": "global CSS",
            "src/app/prototype.css": "main product UI system and responsive rules",
            "src/lib/env.ts": "NEXT_PUBLIC env resolution and production URL validation",
            "src/lib/api.ts": "typed API client and endpoint aliases",
            "src/lib/auth.ts": "localStorage/cookie token persistence",
            "src/lib/auth-context.tsx": "client auth state from /auth/me",
            "src/lib/realtime.ts": "websocket client helpers",
            "src/components/auth/RequireAuth.tsx": "route guard; reader/author accounts can enter both reader and author modes",
            "src/components/layout/AppShell.tsx": "sidebar/topbar, reader-author mode switch, logout, notification badge",
            "next.config.ts": "standalone output, security headers, legacy redirects",
            "Dockerfile": "standalone Next image",
        },
        "routes": {
            "/": "landing",
            "/auth": "login/register; defaults to reader and redirects to /home",
            "/auth/recovery": "password reset",
            "/home": "reader feed",
            "/discover": "keyword/semantic discovery",
            "/stories/[id]": "story detail",
            "/stories/[id]/chapters/[num]": "reader mode/paywall/local reading settings",
            "/forum": "community surface",
            "/membership": "plans and VNPAY checkout CTA",
            "/payment/result": "transaction result/status",
            "/library": "reader bookmarks",
            "/profile, /profile/me, /profile/[id]": "profiles",
            "/settings": "account settings",
            "/notifications": "notifications",
            "/author/stories": "author-mode works list/create story",
            "/author/stories/[id]/edit": "author studio editor, autosave, offline draft recovery, AI sidebar",
            "/author/stories/[id]/publish": "submit draft to moderation/publish",
            "/author/schedule": "author schedule view",
            "/admin": "admin dashboard",
            "/admin/moderation": "moderation queue",
            "/admin/stats": "reports/stats",
            "/about /contact /privacy /terms": "static info pages",
        },
        "feature_components": {
            "components/features/reader/ReaderScreens.tsx": "home, discover, story, reader mode, membership, library, profile/settings",
            "components/features/author/AuthorScreens.tsx": "author works, studio, publish, schedule",
            "components/features/admin/AdminScreens.tsx": "admin dashboard/moderation/stats",
            "components/ui/": "icons, logo, covers, metrics, story cards, feedback widgets",
            "data/yag.ts": "screen IDs, nav, mock/story metadata",
        },
    },
    "database": {
        "source_of_truth": "src/backend/migrations/*.sql plus SQLAlchemy models",
        "extension": "pgvector; story_embeddings uses vector cosine similarity index",
        "pk_rule": "UUID primary keys; gen_random_uuid in SQL migrations",
        "important_tables": [
            "users",
            "profiles",
            "stories",
            "chapters",
            "story_embeddings",
            "comments",
            "reviews",
            "libraries",
            "reading_histories",
            "membership_plans",
            "transactions",
            "ai_moderation_logs",
            "publish_schedules",
            "notifications",
            "admin_alerts",
            "admin_audit_logs",
        ],
    },
    "runtime_commands": {
        "local_infra": "docker compose up -d postgres redis rabbitmq",
        "backend_install": "cd src/backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt",
        "backend_migrate": "cd src/backend && .venv/Scripts/python -m app.manage_migrations",
        "backend_seed": "cd src/backend && .venv/Scripts/python -m app.seed",
        "backend_dev": "cd src/backend && .venv/Scripts/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000",
        "worker_dev": "cd src/backend && .venv/Scripts/python worker.py",
        "frontend_install": "cd src/frontend && npm install",
        "frontend_dev": "cd src/frontend && npm run dev",
        "test_backend": "cd src/backend && .venv/Scripts/python -m pytest tests -q",
        "test_frontend": "cd src/frontend && npm run lint && npm run build",
        "compose_app": "docker compose --profile app up -d --build",
    },
    "deployment": {
        "recommended_shape": [
            "Frontend: Vercel or containerized Next standalone",
            "Backend API: GCP Cloud Run/container service or equivalent",
            "Worker: separate always-on container process for RabbitMQ moderation",
            "Database: managed PostgreSQL with pgvector enabled",
            "Redis: managed Redis/Upstash",
            "RabbitMQ: managed RabbitMQ/CloudAMQP or container service",
            "Media: Cloudinary",
            "Payments: VNPAY production merchant config and backend IPN URL",
        ],
        "required_backend_env": [
            "ENVIRONMENT=production",
            "SERVICE_ROLE=api|worker|migrate|scheduler",
            "SECRET_KEY",
            "DATABASE_URL",
            "REDIS_URL",
            "RABBITMQ_URL",
            "CORS_ORIGINS",
            "GEMINI_API_KEY",
            "VNP_TMN_CODE",
            "VNP_HASH_SECRET",
            "VNP_URL",
            "VNP_RETURN_URL",
            "VNP_API_URL",
            "CLOUDINARY_CLOUD_NAME",
            "CLOUDINARY_API_KEY",
            "CLOUDINARY_API_SECRET",
        ],
        "required_frontend_env": [
            "NEXT_PUBLIC_DEPLOY_ENV=production",
            "NEXT_PUBLIC_APP_URL=https://<frontend-domain>",
            "NEXT_PUBLIC_API_BASE_URL=https://<api-domain>",
            "NEXT_PUBLIC_WS_BASE_URL=wss://<api-domain>",
            "NEXT_PUBLIC_USE_MOCKS=false",
        ],
        "production_guards": [
            "Backend rejects localhost/wildcard production URLs, sandbox VNPAY URLs, startup schema mutation, and websocket query tokens.",
            "Frontend build rejects production localhost URLs and mock mode.",
            "Run migrations as a one-off job before API/worker rollout.",
            "Run API, worker, and scheduler as separate roles; do not enable scheduler inside API replicas in production.",
        ],
    },
    "demo_accounts": {
        "reader": "reader@yag.vn / Secure2026",
        "author_mode": "same normal reader account can switch to /author/stories",
        "author_seed": "author@yag.vn / Secure2026",
        "admin": "admin@yag.vn / Secure2026",
    },
}


def is_ignored(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def code_files() -> list[str]:
    files: list[str] = []
    for path in ROOT.rglob("*"):
        if path.is_file() and not is_ignored(path) and path.suffix in CODE_EXTS:
            files.append(rel(path))
    return sorted(files)


def next_routes() -> list[str]:
    app_dir = ROOT / "src" / "frontend" / "src" / "app"
    routes: list[str] = []
    if not app_dir.exists():
        return routes
    for page in sorted(app_dir.rglob("page.tsx")):
        if is_ignored(page):
            continue
        route = page.parent.relative_to(app_dir).as_posix()
        route = "/" if route == "." else "/" + route
        route = route.replace("[id]", "{id}").replace("[num]", "{num}")
        routes.append(route)
    return routes


ROUTE_RE = re.compile(
    r"@(router|author_router|membership_router|payment_router|app)\."
    r"(get|post|put|delete|websocket)\((?P<args>.*)"
)


def fastapi_route_snippets() -> list[str]:
    snippets: list[str] = []
    for path in sorted((ROOT / "src" / "backend" / "app").rglob("*.py")):
        if is_ignored(path):
            continue
        for line_no, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            match = ROUTE_RE.search(line.strip())
            if match:
                snippets.append(f"{rel(path)}:{line_no}: {line.strip()}")
    return snippets


def compact_tree(paths: Iterable[str]) -> str:
    interesting = [
        p
        for p in paths
        if p.startswith(("src/backend/app/", "src/backend/migrations/", "src/frontend/src/", "nginx/"))
        or p in {"docker-compose.yml", "AGENTS.md", "README.md"}
    ]
    return "\n".join(interesting)


def render_compact() -> str:
    data = CODEBASE
    lines = [
        f"# {data['project']['name']}",
        data["project"]["goal"],
        "",
        "## Role model",
        data["project"]["role_model"],
        "",
        "## Main directories",
        "- Backend: src/backend/app (FastAPI), src/backend/migrations, src/backend/tests",
        "- Frontend: src/frontend/src/app routes, src/frontend/src/components, src/frontend/src/lib, src/frontend/src/data",
        "- Infra: docker-compose.yml, nginx/nginx.conf, .github/workflows/ci.yml",
        "- Docs/rules: AGENTS.md and docs/",
        "",
        "## Backend entrypoints",
    ]
    for path, desc in data["backend"]["entrypoints"].items():
        lines.append(f"- {path}: {desc}")
    lines.extend(["", "## API prefixes"])
    for prefix, desc in data["backend"]["api_prefixes"].items():
        lines.append(f"- {prefix}: {desc}")
    lines.extend(["", "## Frontend routes"])
    for route, desc in data["frontend"]["routes"].items():
        lines.append(f"- {route}: {desc}")
    lines.extend(["", "## Commands"])
    for name, cmd in data["runtime_commands"].items():
        lines.append(f"- {name}: `{cmd}`")
    lines.extend(["", "## Deployment essentials"])
    for item in data["deployment"]["recommended_shape"]:
        lines.append(f"- {item}")
    lines.append("")
    lines.append("Backend env: " + ", ".join(data["deployment"]["required_backend_env"]))
    lines.append("Frontend env: " + ", ".join(data["deployment"]["required_frontend_env"]))
    lines.append("")
    lines.append("Run `python scripts/codebase.py --json` for machine-readable details.")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Print a compact YAG codebase map.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable manifest.")
    parser.add_argument("--tree", action="store_true", help="Print important code files.")
    parser.add_argument("--routes", action="store_true", help="Print discovered frontend and backend routes.")
    args = parser.parse_args()

    if args.json:
        payload = dict(CODEBASE)
        payload["discovered"] = {
            "frontend_routes": next_routes(),
            "backend_route_snippets": fastapi_route_snippets(),
            "code_file_count": len(code_files()),
        }
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    if args.tree:
        print(compact_tree(code_files()))
        return 0

    if args.routes:
        print("# Frontend routes")
        print("\n".join(next_routes()))
        print("\n# Backend route snippets")
        print("\n".join(fastapi_route_snippets()))
        return 0

    print(render_compact())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

