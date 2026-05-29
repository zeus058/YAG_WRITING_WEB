#!/usr/bin/env python3
"""
scripts/index-codebase.py — YAG Codebase Indexer
==================================================
Scan toàn bộ repo YAG và tạo ra 2 artifact:
  1. docs/codebase-map.md   — bản đồ module/file cho Agent đọc
  2. docs/codebase-map.json — structured data (dùng cho pgvector embedding sau này)

Chạy:
  python scripts/index-codebase.py
  python scripts/index-codebase.py --json-only
  python scripts/index-codebase.py --root /path/to/SE_Writing_Web

Không cần cài thêm thư viện — chỉ dùng stdlib Python 3.10+
"""

import argparse
import ast
import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path


# ─────────────────────────────────────────────
# CONFIG — chỉnh ở đây nếu cấu trúc thư mục thay đổi
# ─────────────────────────────────────────────

BACKEND_DIR = "src/backend/app"       # Thư mục FastAPI app source
FRONTEND_DIR = "src/frontend/src"     # Thư mục Next.js source code
DOCS_OUT_DIR = "docs"                 # Nơi lưu output

# File/thư mục bỏ qua khi scan
IGNORE_DIRS = {
    "node_modules", "__pycache__", ".git", ".next", "dist",
    "build", ".venv", "venv", "env", ".mypy_cache", ".ruff_cache",
    "migrations/versions",  # Alembic versions — quá nhiều file nhỏ
}
IGNORE_FILES = {
    ".DS_Store", "*.pyc", "*.pyo", "*.map", "*.lock",
}

# Mapping Use Case ID theo pattern tên file/thư mục — dự án YAG
USECASE_HINTS = {
    "auth": "U001",
    "login": "U001",
    "register": "U001",
    "profile": "U002",
    "story": "U003",
    "chapter": "U004,U005,U007",
    "publish": "U005",
    "ai_suggest": "U006",
    "suggest": "U006",
    "search": "U008",
    "recommend": "U009",
    "comment": "U010",
    "review": "U010",
    "membership": "U011",
    "payment": "U012",
    "vnpay": "U012",
    "moderation": "U013",
    "schedule": "U014",
    "admin": "U015",
}

# Mapping Screen ID theo pattern tên file — dự án YAG
SCREEN_HINTS = {
    "landing": "S01",
    "login": "S02", "register": "S02",
    "reset": "S03",
    "home": "S04",
    "discover": "S05", "search": "S05",
    "story-detail": "S06",
    "reader": "S07",
    "forum": "S08",
    "membership": "S09",
    "payment": "S10",
    "library": "S11",
    "profile": "S12",
    "settings": "S13",
    "notification": "S14",
    "author-stories": "S15",
    "studio": "S16", "editor": "S16",
    "publish": "S17",
    "schedule": "S18",
    "admin": "S19",
    "moderation": "S20",
    "stats": "S21",
}


# ─────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────

@dataclass
class FunctionInfo:
    name: str
    lineno: int
    docstring: str = ""
    args: list[str] = field(default_factory=list)
    is_async: bool = False
    decorators: list[str] = field(default_factory=list)


@dataclass
class ClassInfo:
    name: str
    lineno: int
    docstring: str = ""
    methods: list[FunctionInfo] = field(default_factory=list)
    bases: list[str] = field(default_factory=list)


@dataclass
class RouteInfo:
    method: str          # GET, POST, PUT, DELETE, PATCH
    path: str            # /api/chapters/{id}/publish
    handler: str         # function name
    lineno: int
    use_case: str = ""   # U001, U005, ...
    description: str = ""


@dataclass
class FileIndex:
    rel_path: str                            # src/backend/routers/chapters.py
    language: str                            # python | typescript | other
    size_bytes: int = 0
    functions: list[FunctionInfo] = field(default_factory=list)
    classes: list[ClassInfo] = field(default_factory=list)
    routes: list[RouteInfo] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    use_cases: list[str] = field(default_factory=list)   # ["U005", "U013"]
    screens: list[str] = field(default_factory=list)     # ["S07", "S16"]
    summary: str = ""                        # 1-line auto-generated summary


@dataclass
class ModuleIndex:
    name: str
    rel_path: str
    purpose: str = ""
    files: list[FileIndex] = field(default_factory=list)
    use_cases: list[str] = field(default_factory=list)


@dataclass
class CodebaseIndex:
    generated_at: str
    repo_root: str
    total_files: int = 0
    total_functions: int = 0
    total_routes: int = 0
    backend_modules: list[ModuleIndex] = field(default_factory=list)
    frontend_modules: list[ModuleIndex] = field(default_factory=list)
    all_routes: list[RouteInfo] = field(default_factory=list)


# ─────────────────────────────────────────────
# PYTHON PARSER (cho FastAPI backend)
# ─────────────────────────────────────────────

def parse_python_file(path: Path, rel_path: str) -> FileIndex:
    """Parse Python file, trích xuất functions, classes, FastAPI routes."""
    idx = FileIndex(
        rel_path=rel_path,
        language="python",
        size_bytes=path.stat().st_size,
    )

    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return idx

    # Imports
    for line in source.splitlines():
        line = line.strip()
        if line.startswith(("import ", "from ")):
            idx.imports.append(line)

    # AST parse
    try:
        tree = ast.parse(source)
    except SyntaxError:
        idx.summary = "[Parse error — syntax lỗi]"
        return idx

    # Extract classes
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            cls = ClassInfo(
                name=node.name,
                lineno=node.lineno,
                docstring=ast.get_docstring(node) or "",
                bases=[ast.unparse(b) for b in node.bases],
            )
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    cls.methods.append(FunctionInfo(
                        name=item.name,
                        lineno=item.lineno,
                        docstring=ast.get_docstring(item) or "",
                        args=[a.arg for a in item.args.args if a.arg != "self"],
                        is_async=isinstance(item, ast.AsyncFunctionDef),
                        decorators=[ast.unparse(d) for d in item.decorator_list],
                    ))
            idx.classes.append(cls)

    # Extract top-level functions + FastAPI routes
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Chỉ lấy top-level (không nằm trong class)
            if any(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                   for node in ast.walk(tree)
                   if isinstance(node, ast.ClassDef)):
                pass  # sẽ bỏ qua class methods ở vòng lặp này

            fn = FunctionInfo(
                name=node.name,
                lineno=node.lineno,
                docstring=ast.get_docstring(node) or "",
                args=[a.arg for a in node.args.args],
                is_async=isinstance(node, ast.AsyncFunctionDef),
                decorators=[ast.unparse(d) for d in node.decorator_list],
            )

            # Phát hiện FastAPI route decorators
            for dec in fn.decorators:
                m = re.match(r'^(?:router|app)\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']', dec, re.I)
                if m:
                    route = RouteInfo(
                        method=m.group(1).upper(),
                        path=m.group(2),
                        handler=fn.name,
                        lineno=fn.lineno,
                        description=fn.docstring.split("\n")[0] if fn.docstring else "",
                    )
                    # Gán Use Case từ docstring hoặc tên hàm
                    uc = _infer_usecase(fn.docstring + " " + fn.name + " " + m.group(2))
                    route.use_case = uc
                    idx.routes.append(route)

            idx.functions.append(fn)

    # Gán Use Case và Screen từ đường dẫn file
    idx.use_cases = list(set(_infer_usecase_from_path(rel_path).split(",")))
    idx.use_cases = [u.strip() for u in idx.use_cases if u.strip()]
    idx.summary = _generate_python_summary(idx, rel_path)
    return idx


def _infer_usecase(text: str) -> str:
    """Suy luận Use Case ID từ text (docstring, tên hàm, path)."""
    text_lower = text.lower()
    found = []
    for keyword, uc in USECASE_HINTS.items():
        if keyword in text_lower:
            found.extend(uc.split(","))
    return ",".join(sorted(set(found))) if found else ""


def _infer_usecase_from_path(rel_path: str) -> str:
    """Suy luận Use Case từ đường dẫn file."""
    path_lower = rel_path.lower()
    found = []
    for keyword, uc in USECASE_HINTS.items():
        if keyword in path_lower:
            found.extend(uc.split(","))
    return ",".join(sorted(set(found)))


def _generate_python_summary(idx: FileIndex, rel_path: str) -> str:
    """Tạo dòng tóm tắt ngắn cho file Python."""
    parts = []
    if idx.routes:
        methods = [f"{r.method} {r.path}" for r in idx.routes[:3]]
        parts.append(f"Routes: {', '.join(methods)}")
        if len(idx.routes) > 3:
            parts.append(f"(+{len(idx.routes)-3} route khác)")
    if idx.classes:
        parts.append(f"Classes: {', '.join(c.name for c in idx.classes)}")
    if not parts and idx.functions:
        parts.append(f"Functions: {', '.join(f.name for f in idx.functions[:5])}")
    return " | ".join(parts) if parts else f"Python module ({idx.size_bytes} bytes)"


# ─────────────────────────────────────────────
# TYPESCRIPT / NEXT.JS PARSER (regex-based)
# ─────────────────────────────────────────────

def parse_typescript_file(path: Path, rel_path: str) -> FileIndex:
    """Parse TypeScript/TSX file, trích xuất exports, hooks, components."""
    idx = FileIndex(
        rel_path=rel_path,
        language="typescript",
        size_bytes=path.stat().st_size,
    )

    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return idx

    # Import statements
    for line in source.splitlines():
        line = line.strip()
        if line.startswith("import "):
            idx.imports.append(line[:120])  # truncate dài

    # Exported functions / components
    fn_pattern = re.compile(
        r'export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)',
    )
    arrow_pattern = re.compile(
        r'export\s+(?:const|let)\s+(\w+)\s*[=:]\s*(?:async\s*)?\(',
    )
    hook_pattern = re.compile(r'\buse[A-Z]\w+\b')

    for m in fn_pattern.finditer(source):
        fn = FunctionInfo(name=m.group(1), lineno=source[:m.start()].count('\n') + 1)
        idx.functions.append(fn)

    for m in arrow_pattern.finditer(source):
        fn = FunctionInfo(name=m.group(1), lineno=source[:m.start()].count('\n') + 1)
        idx.functions.append(fn)

    # Custom hooks
    hooks = list(set(hook_pattern.findall(source)))
    for hook in hooks:
        if not any(f.name == hook for f in idx.functions):
            idx.functions.append(FunctionInfo(name=hook, lineno=0))

    # Next.js API routes (app/api/...)
    if "/api/" in rel_path:
        for method in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
            if re.search(rf'export\s+(?:async\s+)?function\s+{method}', source):
                # Infer path từ file path: app/api/stories/route.ts → /api/stories
                api_path = re.sub(r'.*app(/api[^/]*/[^/]+).*', r'\1', rel_path)
                api_path = re.sub(r'/route\.tsx?$', '', api_path)
                route = RouteInfo(
                    method=method,
                    path=api_path or rel_path,
                    handler=f"{method} handler",
                    lineno=0,
                )
                idx.routes.append(route)

    # Screen và Use Case từ đường dẫn
    path_lower = rel_path.lower()
    for keyword, screen in SCREEN_HINTS.items():
        if keyword in path_lower:
            if screen not in idx.screens:
                idx.screens.append(screen)

    idx.use_cases = list(set(_infer_usecase_from_path(rel_path).split(",")))
    idx.use_cases = [u.strip() for u in idx.use_cases if u.strip()]
    idx.summary = _generate_ts_summary(idx, rel_path)
    return idx


def _generate_ts_summary(idx: FileIndex, rel_path: str) -> str:
    """Tạo dòng tóm tắt cho TypeScript file."""
    parts = []
    components = [f.name for f in idx.functions if f.name and f.name[0].isupper()]
    hooks = [f.name for f in idx.functions if f.name.startswith("use")]
    if components:
        parts.append(f"Components: {', '.join(components[:3])}")
    if hooks:
        parts.append(f"Hooks: {', '.join(hooks[:3])}")
    if idx.screens:
        parts.append(f"Screen: {', '.join(idx.screens)}")
    if idx.routes:
        parts.append(f"API: {', '.join(r.method + ' ' + r.path for r in idx.routes)}")
    return " | ".join(parts) if parts else f"TS/TSX module ({idx.size_bytes} bytes)"


# ─────────────────────────────────────────────
# DIRECTORY SCANNER
# ─────────────────────────────────────────────

def should_ignore(path: Path) -> bool:
    """Kiểm tra file/thư mục có bị bỏ qua không."""
    name = path.name
    if name in IGNORE_DIRS:
        return True
    for pattern in IGNORE_FILES:
        if pattern.startswith("*"):
            if name.endswith(pattern[1:]):
                return True
        elif name == pattern:
            return True
    return False


def scan_directory(dir_path: Path, root: Path) -> list[FileIndex]:
    """Scan đệ quy một thư mục, trả về list FileIndex."""
    results = []

    if not dir_path.exists():
        return results

    for entry in sorted(dir_path.rglob("*")):
        # Bỏ qua thư mục trong IGNORE_DIRS
        if any(part in IGNORE_DIRS for part in entry.parts):
            continue
        if should_ignore(entry):
            continue
        if not entry.is_file():
            continue

        rel_path = str(entry.relative_to(root))
        suffix = entry.suffix.lower()

        if suffix == ".py":
            results.append(parse_python_file(entry, rel_path))
        elif suffix in (".ts", ".tsx", ".js", ".jsx"):
            results.append(parse_typescript_file(entry, rel_path))
        # Các file khác (md, json, yml, ...) bỏ qua — không extract symbol

    return results


def group_into_modules(files: list[FileIndex], base_dir: str) -> list[ModuleIndex]:
    """Nhóm file theo thư mục con → thành ModuleIndex."""
    module_map: dict[str, ModuleIndex] = {}

    for f in files:
        # Lấy thư mục con ngay dưới base_dir
        parts = Path(f.rel_path).parts
        # Tìm phần sau base_dir
        try:
            base_parts = Path(base_dir).parts
            idx_start = len(base_parts)
            if len(parts) > idx_start + 1:
                module_name = parts[idx_start]
            else:
                module_name = "root"
        except Exception:
            module_name = "root"

        if module_name not in module_map:
            module_path = str(Path(base_dir) / module_name)
            module_map[module_name] = ModuleIndex(
                name=module_name,
                rel_path=module_path,
                purpose=_infer_module_purpose(module_name),
            )
        module_map[module_name].files.append(f)

    # Collect use cases per module
    for mod in module_map.values():
        all_uc = []
        for f in mod.files:
            all_uc.extend(f.use_cases)
        mod.use_cases = sorted(set(all_uc))

    return list(module_map.values())


def _infer_module_purpose(module_name: str) -> str:
    """Gán mô tả ngắn cho module dựa trên tên thư mục."""
    purposes = {
        "routers": "FastAPI route handlers — định nghĩa endpoints",
        "services": "Business logic layer — xử lý nghiệp vụ",
        "models": "SQLAlchemy ORM models — ánh xạ bảng DB",
        "schemas": "Pydantic schemas — validate request/response",
        "core": "Cấu hình, bảo mật, JWT, dependencies",
        "workers": "Background workers — RabbitMQ consumers",
        "migrations": "Alembic database migrations",
        "app": "Next.js App Router — pages và API routes",
        "components": "React components tái sử dụng",
        "lib": "Utilities, API client, custom hooks",
        "hooks": "React custom hooks",
        "utils": "Helper functions",
        "types": "TypeScript type definitions",
        "public": "Static assets",
        "styles": "CSS / Tailwind styles",
    }
    return purposes.get(module_name, f"Module {module_name}")


# ─────────────────────────────────────────────
# MARKDOWN GENERATOR
# ─────────────────────────────────────────────

def generate_markdown(index: CodebaseIndex) -> str:
    """Sinh file docs/codebase-map.md từ CodebaseIndex."""
    lines = []

    lines.append("# Codebase Map — YAG Writing Novels Web")
    lines.append(f"\n> Tự động sinh bởi `scripts/index-codebase.py` lúc {index.generated_at}")
    lines.append("> **Không chỉnh sửa tay** — chạy lại script để cập nhật.\n")

    lines.append("---\n")
    lines.append("## Tổng quan\n")
    lines.append(f"| Chỉ số | Giá trị |")
    lines.append(f"|---|---|")
    lines.append(f"| Tổng số file đã index | {index.total_files} |")
    lines.append(f"| Tổng số functions/components | {index.total_functions} |")
    lines.append(f"| Tổng số API routes | {index.total_routes} |")
    lines.append(f"| Backend modules | {len(index.backend_modules)} |")
    lines.append(f"| Frontend modules | {len(index.frontend_modules)} |")
    lines.append("")

    # ── All Routes (tổng hợp) ──
    if index.all_routes:
        lines.append("---\n")
        lines.append("## Tất cả API Routes\n")
        lines.append("| Method | Path | Handler | Use Case | Mô tả |")
        lines.append("|---|---|---|---|---|")
        for r in sorted(index.all_routes, key=lambda x: x.path):
            lines.append(
                f"| `{r.method}` | `{r.path}` | `{r.handler}` "
                f"| {r.use_case or '—'} | {r.description or '—'} |"
            )
        lines.append("")

    # ── Backend Modules ──
    lines.append("---\n")
    lines.append(f"## Backend — `{BACKEND_DIR}`\n")

    for mod in index.backend_modules:
        lines.append(f"### `{mod.name}/`")
        lines.append(f"*{mod.purpose}*")
        if mod.use_cases:
            lines.append(f"Use Cases liên quan: **{', '.join(mod.use_cases)}**")
        lines.append("")

        for f in mod.files:
            fname = Path(f.rel_path).name
            lines.append(f"#### `{fname}` — {f.summary}")

            if f.routes:
                lines.append("")
                lines.append("| Method | Path | Handler |")
                lines.append("|---|---|---|")
                for r in f.routes:
                    lines.append(f"| `{r.method}` | `{r.path}` | `{r.handler}` |")

            if f.classes:
                cls_names = ", ".join(f"`{c.name}`" for c in f.classes)
                lines.append(f"\nClasses: {cls_names}")

            key_fns = [fn.name for fn in f.functions
                       if not fn.name.startswith("_") and fn.name not in
                       [r.handler for r in f.routes]][:8]
            if key_fns:
                lines.append(f"Functions: {', '.join(f'`{n}`' for n in key_fns)}")
            lines.append("")

    # ── Frontend Modules ──
    lines.append("---\n")
    lines.append(f"## Frontend — `{FRONTEND_DIR}`\n")

    for mod in index.frontend_modules:
        lines.append(f"### `{mod.name}/`")
        lines.append(f"*{mod.purpose}*")
        if mod.use_cases:
            lines.append(f"Use Cases liên quan: **{', '.join(mod.use_cases)}**")
        lines.append("")

        for f in mod.files:
            fname = Path(f.rel_path).name
            screen_tag = f" `{'|'.join(f.screens)}`" if f.screens else ""
            lines.append(f"#### `{fname}`{screen_tag} — {f.summary}")

            key_fns = [fn.name for fn in f.functions
                       if not fn.name.startswith("_")][:6]
            if key_fns:
                lines.append(f"Exports: {', '.join(f'`{n}`' for n in key_fns)}")
            lines.append("")

    # ── Phân công thành viên ──
    lines.append("---\n")
    lines.append("## Phân công thành viên (mapping → code)\n")
    lines.append("| Thành viên | MSSV | Feature / Use Cases | Backend phụ trách | Frontend phụ trách |")
    lines.append("|---|---|---|---|---|")
    lines.append("| Trần Gia Hiển | 23120123 | F1 - Authentication & User Profile (U001, U002) | `auth.py` router/service | S02, S03, S12, S13 |")
    lines.append("| Nguyễn Duy Trường | 23120182 | F2 - Premium Membership & VNPAY Payment (U011, U012) | `payment.py` router/service | S09, S10 |")
    lines.append("| Phạm Hương Trà | 23120177 | F3 - AI Smart Novel Engine (U006, U008, U009) | `ai.py` router/service | S04, S05, S16 (AI Sidebar) |")
    lines.append("| Huỳnh Yến Nhi | 23120151 | F4 - Story & Chapter Management (U003, U004, U007, U010) | `stories.py`, `chapters.py` router/service | S01, S06, S07, S08, S11, S15, S16 (Editor) |")
    lines.append("| Nguyễn Phú Thọ | 23120169 | F5 - Async Queue Publishing & AI Moderation (U005, U013, U014, U015) | `admin.py` router/service | S14, S17, S18, S19, S20, S21 |")
    lines.append("")

    # ── Hướng dẫn cho Agent ──
    lines.append("---\n")
    lines.append("## Hướng dẫn cho AI Agent\n")
    lines.append("- Để tìm route cụ thể → xem bảng **Tất cả API Routes** ở trên")
    lines.append("- Để hiểu một Use Case → tìm Use Case ID trong cột **Use Cases liên quan**")
    lines.append("- Để thêm tính năng mới → xem module tương ứng rồi đọc file đó")
    lines.append("- Thông tin schema DB đầy đủ → xem `AGENTS.md` mục 4")
    lines.append("- Luồng nghiệp vụ (RabbitMQ, VNPAY, pgvector) → xem `AGENTS.md` mục 5")
    lines.append("")
    lines.append("---")
    lines.append(f"*Cập nhật: {index.generated_at} — Chạy lại: `python scripts/index-codebase.py`*")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def build_index(root: Path) -> CodebaseIndex:
    """Scan repo và build CodebaseIndex."""
    index = CodebaseIndex(
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        repo_root=str(root),
    )

    backend_root = root / BACKEND_DIR
    frontend_root = root / FRONTEND_DIR

    print(f"[1/4] Scan backend: {backend_root}")
    backend_files = scan_directory(backend_root, root)
    index.backend_modules = group_into_modules(backend_files, BACKEND_DIR)

    print(f"[2/4] Scan frontend: {frontend_root}")
    frontend_files = scan_directory(frontend_root, root)
    index.frontend_modules = group_into_modules(frontend_files, FRONTEND_DIR)

    # Tổng hợp routes
    all_files = backend_files + frontend_files
    for f in all_files:
        index.all_routes.extend(f.routes)

    index.total_files = len(all_files)
    index.total_functions = sum(len(f.functions) for f in all_files)
    index.total_routes = len(index.all_routes)

    print(f"[3/4] Tổng kết: {index.total_files} files, "
          f"{index.total_functions} functions, {index.total_routes} routes")
    return index


def main():
    parser = argparse.ArgumentParser(
        description="YAG Codebase Indexer — Tạo codebase-map.md và codebase-map.json"
    )
    parser.add_argument(
        "--root", default=".",
        help="Root của repo (mặc định: thư mục hiện tại)"
    )
    parser.add_argument(
        "--json-only", action="store_true",
        help="Chỉ sinh file JSON, bỏ qua Markdown"
    )
    parser.add_argument(
        "--md-only", action="store_true",
        help="Chỉ sinh file Markdown, bỏ qua JSON"
    )
    parser.add_argument(
        "--out-dir", default=None,
        help=f"Thư mục output (mặc định: {{root}}/{DOCS_OUT_DIR})"
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    out_dir = Path(args.out_dir) if args.out_dir else root / DOCS_OUT_DIR

    if not root.exists():
        print(f"[ERROR] Root không tồn tại: {root}", file=sys.stderr)
        sys.exit(1)

    # Tạo thư mục output nếu chưa có
    out_dir.mkdir(parents=True, exist_ok=True)

    # Build index
    index = build_index(root)

    # Sinh Markdown
    if not args.json_only:
        md_path = out_dir / "codebase-map.md"
        md_content = generate_markdown(index)
        md_path.write_text(md_content, encoding="utf-8")
        print(f"[4/4] ✓ Markdown → {md_path.relative_to(root)}")

    # Sinh JSON
    if not args.md_only:
        json_path = out_dir / "codebase-map.json"

        # Convert dataclasses → dict (bỏ fields rỗng để giảm size)
        def clean(obj):
            if isinstance(obj, list):
                return [clean(i) for i in obj if i]
            if hasattr(obj, "__dataclass_fields__"):
                return {k: clean(v) for k, v in asdict(obj).items()
                        if v not in (None, [], "", 0)}
            return obj

        json_data = clean(index)
        json_path.write_text(
            json.dumps(json_data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"[4/4] ✓ JSON    → {json_path.relative_to(root)}")

    print("\n✅ Hoàn thành! Agent có thể đọc docs/codebase-map.md để hiểu codebase.\n")

    # Quick summary
    print("─" * 50)
    print(f"  Files indexed  : {index.total_files}")
    print(f"  Functions      : {index.total_functions}")
    print(f"  API Routes     : {index.total_routes}")
    print(f"  Backend modules: {len(index.backend_modules)}")
    print(f"  Frontend modules: {len(index.frontend_modules)}")
    print("─" * 50)


if __name__ == "__main__":
    main()