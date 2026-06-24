"""
Versioned SQL migration runner.

Usage:
    python -m app.manage_migrations
    python -m app.manage_migrations --check
"""

import argparse
import hashlib
from pathlib import Path
from sqlalchemy import text
from app.core.database import engine

CREATE_MIGRATIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""


def _migration_version(sql_file: Path) -> str:
    return sql_file.stem.split("__", 1)[0]


def _migration_sort_key(sql_file: Path) -> int:
    version = _migration_version(sql_file)
    if version.startswith("V") and version[1:].isdigit():
        return int(version[1:])
    try:
        return int(version)
    except ValueError:
        return 999999


def _checksum(sql: str) -> str:
    return hashlib.sha256(sql.encode("utf-8")).hexdigest()


def _ensure_migrations_table(conn) -> None:
    conn.execute(text(CREATE_MIGRATIONS_TABLE_SQL))


def _load_applied_migrations(conn) -> dict[str, str]:
    rows = conn.execute(
        text("SELECT version, checksum FROM schema_migrations")
    ).fetchall()
    return {str(row.version): str(row.checksum) for row in rows}


def apply_migrations(migrations_dir: str | Path, check_only: bool = False) -> list[str]:
    migrations_dir = Path(migrations_dir)
    if not migrations_dir.exists():
        print(f"Migrations directory not found: {migrations_dir}")
        return []

    sql_files = sorted(migrations_dir.glob("*.sql"), key=_migration_sort_key)
    if not sql_files:
        print("No SQL migration files found.")
        return []

    applied_now: list[str] = []
    pending: list[str] = []

    with engine.begin() as conn:
        _ensure_migrations_table(conn)
        applied = _load_applied_migrations(conn)

        for sql_file in sql_files:
            sql = sql_file.read_text(encoding="utf-8")
            version = _migration_version(sql_file)
            checksum = _checksum(sql)
            applied_checksum = applied.get(version)

            if applied_checksum:
                if applied_checksum != checksum:
                    raise RuntimeError(
                        f"Migration checksum mismatch for {sql_file.name}. "
                        "Create a new migration instead of editing an applied file."
                    )
                print(f"Skipping already applied migration: {sql_file.name}")
                continue

            if check_only:
                pending.append(sql_file.name)
                continue

            print(f"Applying migration: {sql_file.name}")
            conn.execute(text(sql))
            conn.execute(
                text("""
                    INSERT INTO schema_migrations (version, filename, checksum)
                    VALUES (:version, :filename, :checksum)
                    """),
                {
                    "version": version,
                    "filename": sql_file.name,
                    "checksum": checksum,
                },
            )
            applied_now.append(sql_file.name)
            print(f"  -> Applied {sql_file.name}")

    if check_only and pending:
        raise RuntimeError(f"Pending migrations: {', '.join(pending)}")

    if not applied_now and not pending:
        print("Database schema is up to date.")
    return applied_now


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply YAG SQL migrations.")
    parser.add_argument(
        "--check", action="store_true", help="Fail if any migration is pending."
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_dir = Path(__file__).resolve().parents[1]
    migrations_path = base_dir / "migrations"
    apply_migrations(migrations_path, check_only=args.check)


if __name__ == "__main__":
    main()
