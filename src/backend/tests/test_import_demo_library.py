import json
from unittest.mock import MagicMock, patch

import pytest

from app.demo_library_catalog import build_demo_library
from app.import_demo_library import (
    _ensure_system_authors,
    _is_remote_database,
    _manifest,
    write_manifest,
)
from app.models import Profile, User


@pytest.mark.parametrize(
    "database_url",
    (
        "postgresql://user:pass@localhost:5432/yag",
        "postgresql://user:pass@127.0.0.1:5432/yag",
        "postgresql://user:pass@[::1]:5432/yag",
        "postgresql://user:pass@postgres:5432/yag",
    ),
)
def test_local_database_hosts_do_not_require_remote_confirmation(database_url):
    assert _is_remote_database(database_url) is False


@pytest.mark.parametrize(
    "database_url",
    (
        "postgresql://user:pass@db.example.com:5432/yag",
        "postgresql://user:pass@10.20.30.40:5432/yag",
    ),
)
def test_remote_database_hosts_require_confirmation(database_url):
    assert _is_remote_database(database_url) is True


def test_manifest_records_distribution_and_content_hashes(tmp_path):
    stories = build_demo_library()
    manifest = _manifest(stories)
    output_path = tmp_path / "library-manifest.json"

    write_manifest(output_path, stories)
    written_manifest = json.loads(output_path.read_text(encoding="utf-8"))

    assert manifest["story_count"] == 100
    assert manifest["free_story_count"] == 80
    assert manifest["premium_story_count"] == 20
    assert manifest["chapter_count"] == 500
    assert written_manifest == manifest
    assert all(len(story["content_sha256"]) == 64 for story in manifest["stories"])


def test_enable_demo_author_login_unlocks_new_accounts_with_hashed_password():
    db = MagicMock()
    empty_users = MagicMock()
    empty_users.scalars.return_value.all.return_value = []
    empty_profiles = MagicMock()
    empty_profiles.scalars.return_value.all.return_value = []
    db.execute.side_effect = [empty_users, empty_profiles]
    added_records = []
    db.add.side_effect = added_records.append

    with patch(
        "app.import_demo_library.get_password_hash",
        side_effect=["unused-random-hash", "login-password-hash"],
    ):
        authors, created_count = _ensure_system_authors(
            db,
            login_password="strong-demo-password",
        )

    users = [record for record in added_records if isinstance(record, User)]
    profiles = [record for record in added_records if isinstance(record, Profile)]
    assert created_count == 10
    assert len(authors) == 10
    assert len(users) == 10
    assert len(profiles) == 10
    assert all(user.password_hash == "login-password-hash" for user in users)
    assert all(user.is_locked is False for user in users)
    assert all(user.locked_reason is None for user in users)


def test_demo_author_login_rejects_short_password():
    with pytest.raises(ValueError, match="at least 12 characters"):
        _ensure_system_authors(MagicMock(), login_password="too-short")
