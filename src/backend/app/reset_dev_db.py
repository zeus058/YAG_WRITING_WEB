"""
Local-only destructive database reset.

Use this command only for development:
    python -m app.reset_dev_db
"""
import os

from app.seed import DESTRUCTIVE_SEED_ENV, seed_database


def main() -> None:
    os.environ[DESTRUCTIVE_SEED_ENV] = "1"
    seed_database()


if __name__ == "__main__":
    main()
