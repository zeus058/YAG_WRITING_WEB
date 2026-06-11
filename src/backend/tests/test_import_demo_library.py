import json

import pytest

from app.demo_library_catalog import build_demo_library
from app.import_demo_library import _is_remote_database, _manifest, write_manifest


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
