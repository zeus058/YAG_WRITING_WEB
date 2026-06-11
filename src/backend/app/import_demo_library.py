"""Import the synthetic YAG demo library into PostgreSQL/Supabase.

Usage from ``src/backend``:

    python -m app.import_demo_library --manifest ../../docs/data/yag-demo-library.json
    python -m app.import_demo_library --apply --confirm-remote
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from ipaddress import ip_address
from pathlib import Path
from uuid import uuid5

from sqlalchemy import or_, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import DATABASE_URL, SessionLocal, engine
from app.core.config import settings
from app.core.security import get_password_hash
from app.demo_library_catalog import (
    DEMO_LIBRARY_BATCH_ID,
    DEMO_LIBRARY_NAMESPACE,
    STORIES_PER_AUTHOR,
    StorySeed,
    build_demo_library,
)
from app.manage_migrations import apply_migrations
from app.models import Chapter, Profile, Story, StoryRights, User


AUTHOR_COUNT = 10
RIGHTS_HOLDER = "YAG project team - synthetic demo corpus"
LICENSE_CODE = "YAG-SYNTHETIC-DEMO-1.0"
PROVENANCE_NOTE = (
    "Generated from original YAG project templates. No third-party story text was "
    "downloaded, copied, translated, summarized, or used as a style reference."
)


def _author_id(slot: int):
    return uuid5(DEMO_LIBRARY_NAMESPACE, f"system-author:{slot:02d}")


def _is_remote_database(database_url: str) -> bool:
    host = (make_url(database_url).host or "").lower()
    if host in {"", "localhost", "postgres"}:
        return False
    try:
        address = ip_address(host)
    except ValueError:
        return True
    return not (address.is_loopback or address.is_unspecified)


def _manifest(stories: tuple[StorySeed, ...]) -> dict:
    return {
        "batch_id": DEMO_LIBRARY_BATCH_ID,
        "provenance": PROVENANCE_NOTE,
        "rights_holder": RIGHTS_HOLDER,
        "license_code": LICENSE_CODE,
        "story_count": len(stories),
        "free_story_count": sum(not story.is_premium for story in stories),
        "premium_story_count": sum(story.is_premium for story in stories),
        "chapter_count": sum(len(story.chapters) for story in stories),
        "stories": [
            {
                "id": str(story.id),
                "title": story.title,
                "category": story.category,
                "author_account": f"yag_system_author_{story.author_slot:02d}",
                "access": "premium" if story.is_premium else "free",
                "chapter_count": len(story.chapters),
                "content_sha256": hashlib.sha256(
                    "\n".join(chapter.content for chapter in story.chapters).encode("utf-8")
                ).hexdigest(),
            }
            for story in stories
        ],
    }


def write_manifest(path: Path, stories: tuple[StorySeed, ...]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(_manifest(stories), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _ensure_system_authors(
    db,
    *,
    login_password: str | None = None,
    disable_login: bool = False,
) -> tuple[dict[int, User], int]:
    if login_password and disable_login:
        raise ValueError("Cannot enable and disable demo author login together")
    if login_password and len(login_password) < 12:
        raise ValueError("DEMO_AUTHOR_PASSWORD must contain at least 12 characters")

    authors: dict[int, User] = {}
    unusable_password_hash = get_password_hash(secrets.token_urlsafe(48))
    login_password_hash = get_password_hash(login_password) if login_password else None
    author_specs = [
        (
            slot,
            _author_id(slot),
            f"yag_system_author_{slot:02d}",
            f"yag-system-author-{slot:02d}@system.yag.vn",
        )
        for slot in range(1, AUTHOR_COUNT + 1)
    ]
    user_ids = [spec[1] for spec in author_specs]
    usernames = [spec[2] for spec in author_specs]
    emails = [spec[3] for spec in author_specs]
    existing_users = db.execute(
        select(User).where(
            or_(
                User.id.in_(user_ids),
                User.username.in_(usernames),
                User.email.in_(emails),
            )
        )
    ).scalars().all()
    users_by_id = {user.id: user for user in existing_users}
    profiles_by_user_id = {
        profile.user_id: profile
        for profile in db.execute(
            select(Profile).where(Profile.user_id.in_(user_ids))
        ).scalars().all()
    }
    created_count = 0

    for slot, user_id, username, email in author_specs:
        user = users_by_id.get(user_id)
        collision = next(
            (
                existing
                for existing in existing_users
                if existing.id != user_id
                and (existing.username == username or existing.email == email)
            ),
            None,
        )
        if collision:
            raise RuntimeError(f"System author identity collision for {username}")

        if user is None:
            user = User(
                id=user_id,
                username=username,
                email=email,
                password_hash=login_password_hash or unusable_password_hash,
                role="author",
                is_locked=not bool(login_password_hash),
                locked_reason=(
                    None
                    if login_password_hash
                    else "SYSTEM_MANAGED_SYNTHETIC_LIBRARY_ACCOUNT"
                ),
                email_verified_at=datetime.now(timezone.utc),
            )
            db.add(user)
            users_by_id[user_id] = user
            created_count += 1
        else:
            user.email = email
            user.role = "author"
            if login_password_hash:
                user.password_hash = login_password_hash
                user.is_locked = False
                user.locked_reason = None
                user.locked_at = None
            elif disable_login:
                user.password_hash = unusable_password_hash
                user.is_locked = True
                user.locked_reason = "SYSTEM_MANAGED_SYNTHETIC_LIBRARY_ACCOUNT"
                user.locked_at = datetime.now(timezone.utc)
            if user.email_verified_at is None:
                user.email_verified_at = datetime.now(timezone.utc)

        profile = profiles_by_user_id.get(user_id)
        if profile is None:
            profile = Profile(user_id=user_id)
            db.add(profile)
            profiles_by_user_id[user_id] = profile
        profile.display_name = f"YAG Original Studio {slot:02d}"
        profile.bio = (
            "Tài khoản hệ thống quản lý truyện nguyên bản dạng dữ liệu demo. "
            "Đây không phải danh tính của một tác giả có thật."
        )
        profile.reputation_score = 100
        authors[slot] = user

    db.flush()
    return authors, created_count


def _assign_story_fields(story: Story, seed: StorySeed, author_id) -> None:
    story.author_id = author_id
    story.title = seed.title
    story.description = seed.description
    story.category = seed.category
    story.language = "vi"
    story.story_type = "fiction"
    story.tags = seed.tags
    story.copyright = "synthetic_original_demo"
    story.is_mature = False
    story.main_characters = seed.main_characters
    story.target_audience = seed.target_audience
    story.status = "completed"
    story.expected_chapters = len(seed.chapters)
    story.update_frequency = "completed"


def _assign_rights_fields(rights: StoryRights) -> None:
    rights.source_type = "synthetic_original"
    rights.original_author = None
    rights.rights_holder = RIGHTS_HOLDER
    rights.source_url = None
    rights.license_code = LICENSE_CODE
    rights.license_url = None
    rights.commercial_use_allowed = True
    rights.derivatives_allowed = True
    rights.translation_rights = "project_controlled"
    rights.provenance_note = PROVENANCE_NOTE
    rights.verified_at = datetime.now(timezone.utc)
    rights.verified_by = "YAG synthetic library importer"
    rights.import_batch_id = DEMO_LIBRARY_BATCH_ID


def import_library(
    *,
    replace_existing: bool = False,
    author_login_password: str | None = None,
    disable_author_login: bool = False,
) -> dict[str, int]:
    stories = build_demo_library()
    stats = {
        "authors_created": 0,
        "stories_created": 0,
        "stories_existing": 0,
        "chapters_created": 0,
        "chapters_existing": 0,
    }
    db = SessionLocal()
    try:
        print("Loading existing synthetic library records...", flush=True)
        authors, authors_created = _ensure_system_authors(
            db,
            login_password=author_login_password,
            disable_login=disable_author_login,
        )
        stats["authors_created"] = authors_created

        story_ids = [seed.id for seed in stories]
        story_titles = [seed.title for seed in stories]
        existing_stories = db.execute(
            select(Story).where(
                or_(Story.id.in_(story_ids), Story.title.in_(story_titles))
            )
        ).scalars().all()
        stories_by_id = {story.id: story for story in existing_stories}
        stories_by_title = {story.title: story for story in existing_stories}
        rights_by_story_id = {
            rights.story_id: rights
            for rights in db.execute(
                select(StoryRights).where(StoryRights.story_id.in_(story_ids))
            ).scalars().all()
        }

        chapter_seeds = [
            (seed, chapter_seed)
            for seed in stories
            for chapter_seed in seed.chapters
        ]
        chapter_ids = [chapter_seed.id for _, chapter_seed in chapter_seeds]
        existing_chapters = db.execute(
            select(Chapter).where(
                or_(
                    Chapter.id.in_(chapter_ids),
                    Chapter.story_id.in_(story_ids),
                )
            )
        ).scalars().all()
        chapters_by_id = {chapter.id: chapter for chapter in existing_chapters}
        chapters_by_story_number = {
            (chapter.story_id, chapter.chapter_number): chapter
            for chapter in existing_chapters
        }

        for story_index, seed in enumerate(stories):
            author = authors[seed.author_slot]
            title_collision = stories_by_title.get(seed.title)
            if title_collision and title_collision.id == seed.id:
                title_collision = None
            if title_collision:
                raise RuntimeError(f"Story title collision: {seed.title}")

            story = stories_by_id.get(seed.id)
            if story is None:
                story = Story(id=seed.id)
                db.add(story)
                stories_by_id[seed.id] = story
                _assign_story_fields(story, seed, author.id)
                story.view_count = 250 + story_index * 17
                story.rating_avg = 0
                stats["stories_created"] += 1
            else:
                stats["stories_existing"] += 1
                if replace_existing:
                    _assign_story_fields(story, seed, author.id)

            rights = rights_by_story_id.get(seed.id)
            if rights and rights.import_batch_id not in {None, DEMO_LIBRARY_BATCH_ID}:
                raise RuntimeError(f"Story is owned by another import batch: {seed.title}")
            if rights is None:
                rights = StoryRights(story_id=seed.id)
                db.add(rights)
                rights_by_story_id[seed.id] = rights
            _assign_rights_fields(rights)

            published_at = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(
                days=story_index
            )
            for chapter_seed in seed.chapters:
                chapter_collision = chapters_by_story_number.get(
                    (seed.id, chapter_seed.number)
                )
                if chapter_collision and chapter_collision.id == chapter_seed.id:
                    chapter_collision = None
                if chapter_collision:
                    raise RuntimeError(
                        f"Chapter number collision in {seed.title}: {chapter_seed.number}"
                    )

                chapter = chapters_by_id.get(chapter_seed.id)
                if chapter and (
                    chapter.story_id != seed.id
                    or chapter.chapter_number != chapter_seed.number
                ):
                    raise RuntimeError(
                        f"Chapter ID collision in {seed.title}: {chapter_seed.number}"
                    )
                if chapter is None:
                    chapter = Chapter(id=chapter_seed.id, story_id=seed.id)
                    db.add(chapter)
                    chapters_by_id[chapter_seed.id] = chapter
                    chapters_by_story_number[(seed.id, chapter_seed.number)] = chapter
                    stats["chapters_created"] += 1
                else:
                    stats["chapters_existing"] += 1
                    if not replace_existing:
                        continue

                chapter.chapter_number = chapter_seed.number
                chapter.title = chapter_seed.title
                chapter.content = chapter_seed.content
                chapter.moderation_status = "approved"
                chapter.is_premium = seed.is_premium
                chapter.publish_at = published_at
                chapter.published_at = published_at
                chapter.word_count = chapter_seed.word_count
                chapter.rejected_reason = None

            if (story_index + 1) % 10 == 0:
                print(
                    f"Prepared {story_index + 1}/{len(stories)} stories for import...",
                    flush=True,
                )

        print("Writing synthetic library batch to PostgreSQL...", flush=True)
        db.commit()
        print("Synthetic library batch committed.", flush=True)
        return stats
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def verify_imported_library() -> dict[str, int]:
    db = SessionLocal()
    try:
        rights_records = db.execute(
            select(StoryRights).where(
                StoryRights.import_batch_id == DEMO_LIBRARY_BATCH_ID
            )
        ).scalars().all()
        story_ids = {record.story_id for record in rights_records}
        stories = db.execute(
            select(Story).where(Story.id.in_(story_ids))
        ).scalars().all()
        chapters = db.execute(
            select(Chapter).where(Chapter.story_id.in_(story_ids))
        ).scalars().all()

        free_story_ids = {
            story_id
            for story_id in story_ids
            if not any(
                chapter.is_premium
                for chapter in chapters
                if chapter.story_id == story_id
            )
        }
        premium_story_ids = {
            story_id
            for story_id in story_ids
            if any(
                chapter.is_premium
                for chapter in chapters
                if chapter.story_id == story_id
            )
        }
        summary = {
            "rights_records": len(rights_records),
            "stories": len(stories),
            "chapters": len(chapters),
            "free_stories": len(free_story_ids),
            "premium_stories": len(premium_story_ids),
        }
        expected = {
            "rights_records": 100,
            "stories": 100,
            "chapters": 500,
            "free_stories": 80,
            "premium_stories": 20,
        }
        if summary != expected:
            raise RuntimeError(
                f"Imported library verification failed: expected {expected}, got {summary}"
            )
        if not all(record.commercial_use_allowed for record in rights_records):
            raise RuntimeError("Every imported story must allow commercial use")
        return summary
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create or import 100 synthetic YAG demo stories."
    )
    parser.add_argument("--apply", action="store_true", help="Write records to the database")
    parser.add_argument(
        "--confirm-remote",
        action="store_true",
        help="Required before writing to a non-local PostgreSQL/Supabase host",
    )
    parser.add_argument(
        "--replace-existing",
        action="store_true",
        help="Refresh records already owned by this import batch",
    )
    parser.add_argument(
        "--skip-migrations",
        action="store_true",
        help="Skip migrations when the caller already applied and checked them",
    )
    author_access = parser.add_mutually_exclusive_group()
    author_access.add_argument(
        "--enable-author-login",
        action="store_true",
        help="Unlock demo authors using DEMO_AUTHOR_PASSWORD from the environment",
    )
    author_access.add_argument(
        "--disable-author-login",
        action="store_true",
        help="Lock demo authors and rotate their passwords to unusable random values",
    )
    parser.add_argument("--manifest", type=Path, help="Write a JSON audit manifest")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    author_login_password = None
    if args.enable_author_login:
        author_login_password = settings.DEMO_AUTHOR_PASSWORD
        if not author_login_password:
            raise RuntimeError(
                "DEMO_AUTHOR_PASSWORD is required with --enable-author-login"
            )
        if len(author_login_password) < 12:
            raise RuntimeError(
                "DEMO_AUTHOR_PASSWORD must contain at least 12 characters"
            )
    stories = build_demo_library()
    summary = _manifest(stories)
    print(
        f"Validated {summary['story_count']} stories, "
        f"{summary['free_story_count']} free, {summary['premium_story_count']} premium, "
        f"{summary['chapter_count']} chapters across {len({s.category for s in stories})} categories.",
        flush=True,
    )

    if args.manifest:
        write_manifest(args.manifest, stories)
        print(f"Wrote rights audit manifest: {args.manifest}", flush=True)

    if not args.apply:
        print("Dry run only. Pass --apply to write to PostgreSQL/Supabase.", flush=True)
        return

    remote = _is_remote_database(DATABASE_URL)
    if remote and not args.confirm_remote:
        raise RuntimeError(
            "Refusing to write to a remote database without --confirm-remote."
        )

    target = make_url(DATABASE_URL).render_as_string(hide_password=True)
    url = make_url(DATABASE_URL)
    host = (url.host or "").lower()
    port = url.port or 5432
    if os.getenv("GITHUB_ACTIONS") == "true" and host.startswith("db.") and host.endswith(".supabase.co"):
        print(
            "Warning: this is a Supabase direct connection. GitHub Actions normally "
            "requires the IPv4-compatible Supavisor pooler host.",
            flush=True,
        )
    print(f"Checking database connectivity to {host}:{port}...", flush=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        hint = (
            " Use the Supabase Session pooler URL (*.pooler.supabase.com:5432) "
            "for GitHub Actions."
            if host.startswith("db.") and host.endswith(".supabase.co")
            else " Verify the DATABASE_URL host, port, password, SSL mode, and network access."
        )
        raise RuntimeError(
            f"Database preflight failed for {host}:{port}.{hint}"
        ) from exc
    print("Database connection established.", flush=True)

    if not args.skip_migrations:
        print(f"Applying migrations and importing into {target}", flush=True)
        migrations_path = Path(__file__).resolve().parents[1] / "migrations"
        apply_migrations(migrations_path)
    else:
        print(f"Importing into {target}; migrations already checked.", flush=True)
    stats = import_library(
        replace_existing=args.replace_existing,
        author_login_password=author_login_password,
        disable_author_login=args.disable_author_login,
    )
    print(json.dumps(stats, ensure_ascii=False, indent=2), flush=True)
    if args.enable_author_login:
        print(
            "Demo author login enabled for usernames yag_system_author_01 through "
            "yag_system_author_10. Use the password stored in DEMO_AUTHOR_PASSWORD.",
            flush=True,
        )
    elif args.disable_author_login:
        print("Demo author login disabled for all system accounts.", flush=True)
    verification = verify_imported_library()
    print("Verified imported library:", flush=True)
    print(json.dumps(verification, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
