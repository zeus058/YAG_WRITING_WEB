import uuid
from datetime import datetime, timezone
from unittest.mock import patch

from app.models.admin_alert import AdminAlert
from app.models.chapter import Chapter
from app.models.profile import Profile
from app.models.publish_schedule import PublishSchedule
from app.models.story import Story
from app.models.user import User
from app.services.schedule_service import scan_publish_schedules


class FakeQuery:
    def __init__(self, first_result=None, all_result=None):
        self.first_result = first_result
        self.all_result = all_result or []

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def first(self):
        return self.first_result

    def all(self):
        return self.all_result


class FakeDB:
    def __init__(self, schedule, story, author, profile, publication=None, admins=None):
        self.schedule = schedule
        self.story = story
        self.author = author
        self.profile = profile
        self.publication = publication
        self.admins = admins or []
        self.added = []
        self.committed = False

    def query(self, model):
        if model is PublishSchedule:
            return FakeQuery(all_result=[self.schedule])
        if model is Chapter:
            return FakeQuery(first_result=self.publication)
        if model is Story:
            return FakeQuery(first_result=self.story)
        if model is User:
            return FakeQuery(first_result=self.author, all_result=self.admins)
        if model is Profile:
            return FakeQuery(first_result=self.profile)
        return FakeQuery()

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        for obj in self.added:
            if isinstance(obj, AdminAlert) and obj.id is None:
                obj.id = uuid.uuid4()

    def commit(self):
        self.committed = True

    def rollback(self):
        return None

    def close(self):
        return None


def _base_objects():
    author_id = uuid.uuid4()
    story_id = uuid.uuid4()
    schedule = PublishSchedule(
        id=uuid.uuid4(),
        story_id=story_id,
        scheduled_time=datetime(2026, 6, 1, 0, 0, tzinfo=timezone.utc),
        status="scheduled",
    )
    story = Story(
        id=story_id,
        author_id=author_id,
        title="Demo Story",
        description="Desc",
        category="fantasy",
    )
    author = User(
        id=author_id,
        username="author",
        email="author@yag.vn",
        password_hash="x",
        role="author",
    )
    profile = Profile(user_id=author_id, display_name="Author", reputation_score=100)
    admin = User(
        id=uuid.uuid4(),
        username="admin",
        email="admin@yag.vn",
        password_hash="x",
        role="admin",
    )
    return schedule, story, author, profile, admin


@patch("app.services.schedule_service.send_schedule_warning_email")
@patch("app.services.schedule_service.publish_user_notification", return_value=True)
def test_scan_marks_schedule_missed_and_penalizes_reputation(mock_notify, mock_email):
    schedule, story, author, profile, admin = _base_objects()
    db = FakeDB(schedule=schedule, story=story, author=author, profile=profile, admins=[admin])

    result = scan_publish_schedules(db, now=datetime(2026, 6, 5, 0, 0, tzinfo=timezone.utc))

    assert result["checked"] == 1
    assert result["missed"] == 1
    assert schedule.status == "missed"
    assert profile.reputation_score == 80
    assert db.committed is True
    assert any(isinstance(item, AdminAlert) for item in db.added)
    assert mock_notify.call_count == 2
    mock_email.assert_called_once()


@patch("app.services.schedule_service.send_schedule_warning_email")
@patch("app.services.schedule_service.publish_user_notification")
def test_scan_marks_schedule_published_when_chapter_exists(mock_notify, mock_email):
    schedule, story, author, profile, admin = _base_objects()
    publication = Chapter(
        id=uuid.uuid4(),
        story_id=story.id,
        chapter_number=2,
        title="On time",
        content="Published chapter",
        moderation_status="approved",
        publish_at=datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc),
    )
    db = FakeDB(
        schedule=schedule,
        story=story,
        author=author,
        profile=profile,
        publication=publication,
        admins=[admin],
    )

    result = scan_publish_schedules(db, now=datetime(2026, 6, 2, 0, 0, tzinfo=timezone.utc))

    assert result["checked"] == 1
    assert result["published"] == 1
    assert result["missed"] == 0
    assert schedule.status == "published"
    assert profile.reputation_score == 100
    assert db.committed is True
    mock_notify.assert_not_called()
    mock_email.assert_not_called()
