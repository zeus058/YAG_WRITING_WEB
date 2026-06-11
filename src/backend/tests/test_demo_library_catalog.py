from app.demo_library_catalog import CHAPTERS_PER_STORY, GENRES, build_demo_library


def test_demo_library_has_required_distribution():
    stories = build_demo_library()

    assert len(stories) == 100
    assert sum(not story.is_premium for story in stories) == 80
    assert sum(story.is_premium for story in stories) == 20
    assert {story.category for story in stories} == {genre.category for genre in GENRES}


def test_demo_library_is_unique_and_substantial():
    stories = build_demo_library()

    assert len({story.id for story in stories}) == len(stories)
    assert len({story.title.casefold() for story in stories}) == len(stories)
    assert all(len(story.chapters) == CHAPTERS_PER_STORY for story in stories)
    assert all(
        chapter.word_count >= 220
        for story in stories
        for chapter in story.chapters
    )


def test_demo_library_uses_system_author_slots_only():
    stories = build_demo_library()

    assert {story.author_slot for story in stories} == set(range(1, 11))
    assert all("dữ liệu demo" in story.tags for story in stories)
