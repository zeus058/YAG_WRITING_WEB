"""Import the synthetic YAG demo library into PostgreSQL/Supabase.

Usage from ``src/backend``:

    python -m app.import_demo_library --manifest ../../docs/data/yag-demo-library.json
    python -m app.import_demo_library --apply --confirm-remote
"""

from __future__ import annotations

import argparse
import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid5

from sqlalchemy import or_, select
from sqlalchemy.engine import make_url

from app.core.database import DATABASE_URL, SessionLocal
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
    return host not in {"", "localhost", "127.0.0.1", "0.0.0.0", "::1", "postgres"}


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


def _ensure_system_authors(db) -> dict[int, User]:
    authors: dict[int, User] = {}
    unusable_password_hash = get_password_hash(secrets.token_urlsafe(48))

    for slot in range(1, AUTHOR_COUNT + 1):
        user_id = _author_id(slot)
        username = f"yag_system_author_{slot:02d}"
        email = f"yag-system-author-{slot:02d}@seed.invalid"
        user = db.get(User, user_id)
        collision = db.execute(
            select(User).where(
                or_(User.username == username, User.email == email),
                User.id != user_id,
            )
        ).scalar_one_or_none()
        if collision:
            raise RuntimeError(f"System author identity collision for {username}")

        if user is None:
            user = User(
                id=user_id,
                username=username,
                email=email,
                password_hash=unusable_password_hash,
                role="author",
                is_locked=True,
                locked_reason="SYSTEM_MANAGED_SYNTHETIC_LIBRARY_ACCOUNT",
                email_verified_at=datetime.now(timezone.utc),
            )
            db.add(user)
        else:
            user.role = "author"
            user.is_locked = True
            user.locked_reason = "SYSTEM_MANAGED_SYNTHETIC_LIBRARY_ACCOUNT"

        profile = db.get(Profile, user_id)
        if profile is None:
            profile = Profile(user_id=user_id)
            db.add(profile)
        profile.display_name = f"YAG Original Studio {slot:02d}"
        profile.bio = (
            "Tài khoản hệ thống quản lý truyện nguyên bản dạng dữ liệu demo. "
            "Đây không phải danh tính của một tác giả có thật."
        )
        profile.reputation_score = 100
        authors[slot] = user

    db.flush()
    return authors


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


def import_library(*, replace_existing: bool = False) -> dict[str, int]:
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
        before_authors = db.execute(
            select(User.id).where(User.username.like("yag_system_author_%"))
        ).all()
        authors = _ensure_system_authors(db)
        stats["authors_created"] = AUTHOR_COUNT - len(before_authors)

        for story_index, seed in enumerate(stories):
            author = authors[seed.author_slot]
            title_collision = db.execute(
                select(Story).where(Story.title == seed.title, Story.id != seed.id)
            ).scalar_one_or_none()
            if title_collision:
                raise RuntimeError(f"Story title collision: {seed.title}")

            story = db.get(Story, seed.id)
            if story is None:
                story = Story(id=seed.id)
                db.add(story)
                _assign_story_fields(story, seed, author.id)
                story.view_count = 250 + story_index * 17
                story.rating_avg = 0
                stats["stories_created"] += 1
            else:
                stats["stories_existing"] += 1
                if replace_existing:
                    _assign_story_fields(story, seed, author.id)

            db.flush()
            rights = db.get(StoryRights, seed.id)
            if rights and rights.import_batch_id not in {None, DEMO_LIBRARY_BATCH_ID}:
                raise RuntimeError(f"Story is owned by another import batch: {seed.title}")
            if rights is None:
                rights = StoryRights(story_id=seed.id)
                db.add(rights)
            _assign_rights_fields(rights)

            published_at = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(
                days=story_index
            )
            for chapter_seed in seed.chapters:
                chapter_collision = db.execute(
                    select(Chapter).where(
                        Chapter.story_id == seed.id,
                        Chapter.chapter_number == chapter_seed.number,
                        Chapter.id != chapter_seed.id,
                    )
                ).scalar_one_or_none()
                if chapter_collision:
                    raise RuntimeError(
                        f"Chapter number collision in {seed.title}: {chapter_seed.number}"
                    )

                chapter = db.get(Chapter, chapter_seed.id)
                if chapter is None:
                    chapter = Chapter(id=chapter_seed.id, story_id=seed.id)
                    db.add(chapter)
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

        db.commit()
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
    parser.add_argument("--manifest", type=Path, help="Write a JSON audit manifest")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    stories = build_demo_library()
    summary = _manifest(stories)
    print(
        f"Validated {summary['story_count']} stories, "
        f"{summary['free_story_count']} free, {summary['premium_story_count']} premium, "
        f"{summary['chapter_count']} chapters across {len({s.category for s in stories})} categories."
    )

    if args.manifest:
        write_manifest(args.manifest, stories)
        print(f"Wrote rights audit manifest: {args.manifest}")

    if not args.apply:
        print("Dry run only. Pass --apply to write to PostgreSQL/Supabase.")
        return

    remote = _is_remote_database(DATABASE_URL)
    if remote and not args.confirm_remote:
        raise RuntimeError(
            "Refusing to write to a remote database without --confirm-remote."
        )

    target = make_url(DATABASE_URL).render_as_string(hide_password=True)
    print(f"Applying migrations and importing into {target}")
    migrations_path = Path(__file__).resolve().parents[1] / "migrations"
    apply_migrations(migrations_path)
    stats = import_library(replace_existing=args.replace_existing)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    verification = verify_imported_library()
    print("Verified imported library:")
    print(json.dumps(verification, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
