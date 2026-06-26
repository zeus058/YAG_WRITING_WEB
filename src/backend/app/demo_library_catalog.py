"""Deterministic, synthetic Vietnamese demo-story catalog.

The corpus is generated from project-owned templates and does not download,
quote, translate, summarize, or imitate any third-party literary work.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid5


DEMO_LIBRARY_BATCH_ID = "yag-synthetic-library-v1"
DEMO_LIBRARY_NAMESPACE = UUID("42e6d513-3daf-4e12-99ef-467cc9328c4f")
STORIES_PER_AUTHOR = 10
CHAPTERS_PER_STORY = 5


@dataclass(frozen=True)
class GenreSpec:
    category: str
    setting: str
    conflict: str
    motif: str
    tone: str
    objects: tuple[str, ...]


@dataclass(frozen=True)
class ChapterSeed:
    id: UUID
    number: int
    title: str
    content: str
    word_count: int


@dataclass(frozen=True)
class StorySeed:
    id: UUID
    author_slot: int
    title: str
    description: str
    category: str
    tags: str
    main_characters: str
    target_audience: str
    is_premium: bool
    chapters: tuple[ChapterSeed, ...]


GENRES = (
    GenreSpec("Tiên hiệp", "quần sơn nổi giữa biển mây", "một linh mạch đang cạn kiệt", "chuông ngọc", "hùng tráng và chiêm nghiệm", ("Linh Mạch", "Cửu Vân", "Thiên Sơn", "Ngọc Đăng", "Mộc Kiếm", "Tinh Trì", "Dược Cốc", "Hạc Trắng", "Vân Môn", "Tâm Ấn")),
    GenreSpec("Huyền huyễn", "vương quốc nơi bóng tối có hình dạng", "cánh cổng cổ đang thức tỉnh", "vương miện tro", "kỳ ảo và bí ẩn", ("Vương Miện Tro", "Cổng Lam", "Rừng Kính", "Thành Không Tên", "Trăng Đồng", "Sư Tử Đá", "Tháp Mưa", "Bản Đồ Sao", "Mắt Hổ Phách", "Dòng Sông Bay")),
    GenreSpec("Phiêu lưu", "quần đảo chưa được ghi trên hải đồ", "một đoàn thám hiểm mất tích", "la bàn gió", "sôi nổi và ấm áp", ("Đảo Gió Ngược", "Hải Đồ Xanh", "Thung Lũng Mù", "Con Tàu Giấy", "Mỏ Neo Bạc", "Rạn San Hô Đen", "Đường Chân Trời", "Hang Thủy Triều", "Mưa Nhiệt Đới", "Cánh Buồm Cuối")),
    GenreSpec("Esport", "giải đấu thực tế ảo liên thành phố", "đội tuyển đứng trước nguy cơ tan rã", "bàn phím phát sáng", "nhanh, trẻ và giàu chiến thuật", ("Ván Đấu Thứ Sáu", "Đường Giữa Không Ngủ", "Chiến Thuật Mù", "Phút Bù Giờ", "Đội Hình Số Không", "Máy Chủ Mùa Hạ", "Pha Lật Kèo", "Bản Cập Nhật Cuối", "Ghế Dự Bị", "Cúp Sao Băng")),
    GenreSpec("Sci-fi", "thành phố quỹ đạo quanh một mặt trời đỏ", "trí nhớ của cư dân bị chỉnh sửa", "hạt giống lượng tử", "lạnh, rộng lớn nhưng nhân văn", ("Quỹ Đạo Đỏ", "Trạm Ký Ức", "Mặt Trời Thứ Hai", "Tàu Ngủ Đông", "Tín Hiệu Im Lặng", "Vườn Sao", "Mã Gene Xanh", "Thành Phố Sao Chổi", "Khe Thời Gian", "Robot Biết Mơ")),
    GenreSpec("Đời thường", "một khu tập thể cũ giữa thành phố", "những người hàng xóm sắp phải chia xa", "ấm trà men xanh", "dịu dàng và gần gũi", ("Ban Công Tháng Sáu", "Tiệm Bánh Góc Phố", "Chuyến Xe Sớm", "Căn Phòng Có Nắng", "Mùi Cà Phê Mới", "Ngày Mưa Không Vội", "Sân Thượng Trồng Rau", "Bức Thư Trong Hộp", "Con Hẻm Có Nhạc", "Mùa Hoa Trước Cửa")),
    GenreSpec("Trọng sinh", "một đô thị đang thay đổi từng ngày", "nhân vật chính có cơ hội sửa một lựa chọn cũ", "chiếc đồng hồ dừng", "căng thẳng và hướng thiện", ("Ngày Trở Lại", "Đồng Hồ Không Kim", "Lựa Chọn Thứ Hai", "Mùa Hè Viết Lại", "Bản Nháp Cuộc Đời", "Ngã Rẽ Năm Xưa", "Tin Nhắn Chưa Gửi", "Bình Minh Cũ", "Bậc Thềm Quen", "Lời Hứa Lần Nữa")),
    GenreSpec("Kinh dị", "thị trấn ven hồ luôn tắt đèn trước nửa đêm", "những âm thanh vô chủ xuất hiện mỗi đêm", "chiếc gương phủ vải", "rùng rợn nhưng không khai thác cực đoan", ("Nhà Ga Sau Nửa Đêm", "Căn Phòng Số Mười Ba", "Tiếng Gõ Dưới Hồ", "Gương Không Phản Chiếu", "Đèn Hành Lang", "Khách Sạn Mùa Sương", "Bản Thu Âm Cũ", "Ngôi Nhà Thiếu Cửa", "Bóng Trên Cầu Thang", "Chuông Gió Im Lặng")),
    GenreSpec("Ngôn tình", "thành phố ven sông vào mùa lễ hội", "hai người trẻ hiểu sai một lời hẹn", "vé tàu một chiều", "lãng mạn và trưởng thành", ("Hẹn Nhau Bên Sông", "Mùa Gió Gửi Thư", "Quán Nhỏ Có Em", "Chuyến Tàu Tháng Chín", "Một Ngày Thành Đôi", "Bản Nhạc Chưa Đặt Tên", "Mưa Qua Ô Cửa", "Lời Nhắn Trên Ly", "Đêm Hội Hoa Đăng", "Phía Sau Nụ Cười")),
    GenreSpec("Đam mỹ", "một học viện nghệ thuật bên đồi", "hai người bạn phải cùng hoàn thành dự án cuối khóa", "cuốn sổ ký họa", "tình cảm, tôn trọng và chữa lành", ("Bản Phác Thảo Mùa Thu", "Sân Khấu Sau Màn", "Nốt Nhạc Màu Lam", "Phòng Tranh Có Gió", "Ngày Ta Cùng Diễn", "Máy Ảnh Cũ", "Bức Tượng Chưa Xong", "Hành Lang Ánh Sáng", "Bài Hát Cho Hai Người", "Màu Sơn Trên Tay")),
    GenreSpec("Bách hợp", "thị trấn cao nguyên chuyên trồng hoa", "hai cô gái cùng bảo vệ khu vườn cộng đồng", "hạt giống tím", "trong trẻo và kiên định", ("Vườn Hoa Trên Dốc", "Mùa Tím Có Nhau", "Nhà Kính Ban Mai", "Bức Bưu Thiếp Hoa", "Tiệm Sách Trên Đồi", "Con Đường Hương Thảo", "Chiếc Ô Màu Trắng", "Ngày Hội Hoa Chuông", "Mây Qua Vườn Nhỏ", "Hẹn Ở Đỉnh Đồi")),
    GenreSpec("Trinh thám", "thành phố cảng nhiều ngõ hẹp", "một vụ mất tích để lại các chứng cứ mâu thuẫn", "đồng xu xước", "logic, tiết chế và hồi hộp", ("Hồ Sơ Đồng Xu", "Căn Phòng Khóa Trái", "Bức Ảnh Thừa Một Người", "Dấu Chân Trên Cát", "Mật Mã Bến Cảng", "Chiếc Vé Không Tên", "Ba Phút Mất Đi", "Nhân Chứng Cuối Phố", "Bản Đồ Bị Xé", "Cuộc Gọi Lúc Không Giờ")),
    GenreSpec("Khác", "một thành phố nơi nghề nghiệp được đổi mỗi tháng", "người dân bắt đầu quên điều mình thực sự yêu thích", "chiếc hộp nghề nghiệp", "châm biếm nhẹ và giàu tưởng tượng", ("Tháng Làm Người Khác", "Cửa Hàng Bán Thời Gian", "Bưu Điện Gửi Giấc Mơ", "Người Thu Gom Tiếng Cười", "Khu Phố Không Biển Hiệu", "Ngày Nghỉ Của Thành Phố", "Chiếc Hộp Biết Hỏi", "Bảo Tàng Việc Chưa Làm", "Phiên Chợ Đổi Ký Ức", "Cuốn Lịch Không Ngày")),
)

TITLE_LEADS = ("Dấu Vết", "Người Giữ", "Bản Đồ", "Khúc Hát", "Mùa", "Bí Mật", "Phía Sau", "Chuyện Về", "Lời Hẹn", "Nhật Ký")
FAMILY_NAMES = ("An", "Bùi", "Cao", "Đinh", "Đỗ", "Hà", "Lâm", "Lê", "Ngô", "Phan", "Trần", "Vũ", "Tạ")
GIVEN_NAMES = ("Minh", "Nhi", "Khang", "Linh", "Duy", "An", "Vy", "Quân", "Mai", "Hải", "Thư", "Nam", "Yên", "Khôi", "Trang", "Sơn")
COMPANION_NAMES = ("Hạ", "Tùng", "Miên", "Phúc", "Lam", "Bảo", "Nguyên", "Chi", "Vân", "Tuệ", "Nhật", "Khoa", "Diệp")
CHAPTER_TITLES = ("Tín hiệu đầu tiên", "Con đường bị che", "Lời thật trong im lặng", "Đêm của lựa chọn", "Bình minh mới")


def _chapter_content(story: StorySeed, spec: GenreSpec, chapter_number: int, hero: str, companion: str) -> str:
    stage = CHAPTER_TITLES[chapter_number - 1].lower()
    object_name = spec.objects[(story.author_slot + chapter_number) % len(spec.objects)]
    paragraphs = (
        f"{spec.setting.capitalize()} bước vào một ngày khác thường khi {hero} nhận ra {spec.motif} đã thay đổi. Không ai trong khu vực giải thích được dấu hiệu ấy, còn những ghi chép cũ chỉ nhắc đến {object_name} bằng vài dòng rời rạc. {hero} quyết định quan sát thật kỹ thay vì vội tin lời đồn, bởi mọi lựa chọn từ lúc này đều có thể ảnh hưởng đến những người đang sống quanh mình.",
        f"Trong lúc lần theo manh mối của {stage}, {hero} gặp {companion}, người giữ một mảnh thông tin tưởng như không liên quan. Hai người không hoàn toàn đồng ý về cách hành động: một bên muốn tiến nhanh trước khi cơ hội biến mất, bên còn lại muốn kiểm chứng từng chi tiết. Cuộc tranh luận buộc họ phải đặt ra nguyên tắc chung: không hy sinh người vô tội, không che giấu sai lầm và luôn để lại đường lui.",
        f"Dấu vết dẫn họ qua {spec.setting}, nơi {spec.conflict} hiện ra rõ hơn dự đoán. Những biến đổi nhỏ trong không gian, lịch trình và lời kể của nhân chứng ghép thành một mô hình có chủ ý. {hero} phát hiện {spec.motif} không phải phần thưởng mà là công cụ thử thách lòng tin. Điều quan trọng không nằm ở sức mạnh của vật ấy, mà ở người được quyền quyết định nó sẽ phục vụ ai.",
        f"Khi tình thế trở nên căng thẳng, {companion} thừa nhận đã giữ lại một chi tiết vì sợ bị trách cứ. Sự thật khiến kế hoạch cũ không còn dùng được, nhưng cũng mở ra một lối đi ít nguy hiểm hơn. {hero} không phủ nhận cảm giác thất vọng, song chọn lắng nghe nguyên nhân trước khi phán xét. Chính khoảnh khắc đó giúp cả hai hiểu rằng hợp tác không đòi hỏi sự hoàn hảo; nó đòi hỏi khả năng sửa sai đúng lúc.",
        f"Họ thử kế hoạch mới bằng những bước nhỏ, đo lại từng kết quả và chia sẻ thông tin với cộng đồng. Phản ứng ban đầu đầy nghi ngại, nhưng bằng chứng dần thay đổi thái độ của mọi người. Không khí {spec.tone} của hành trình được giữ lại trong những chi tiết bình dị: một ngọn đèn còn sáng, một cánh cửa được mở, một người xa lạ chịu đứng về phía điều đúng dù chưa biết kết quả.",
        f"Cuối chương, {hero} và {companion} đến gần {object_name} hơn nhưng chưa vội chạm vào nó. Phía trước vẫn còn hậu quả của {spec.conflict}, cùng câu hỏi ai đã khởi đầu mọi chuyện. Họ ghi lại những điều đã biết, thống nhất việc cần làm tiếp theo và bước qua ranh giới cũ với một niềm tin thận trọng. Câu chuyện khép lại ở một lựa chọn mới, đủ rõ để dẫn đường nhưng chưa dễ dàng để bảo đảm chiến thắng.",
    )
    return "\n\n".join(paragraphs)


def build_demo_library() -> tuple[StorySeed, ...]:
    stories: list[StorySeed] = []
    global_index = 0

    for genre_index, spec in enumerate(GENRES):
        story_count = 8 if genre_index < 9 else 7
        for local_index in range(story_count):
            title = f"{TITLE_LEADS[(genre_index + local_index) % len(TITLE_LEADS)]} {spec.objects[local_index]}"
            hero = f"{FAMILY_NAMES[(global_index * 3) % len(FAMILY_NAMES)]} {GIVEN_NAMES[(global_index * 5 + 1) % len(GIVEN_NAMES)]}"
            companion = COMPANION_NAMES[(global_index * 7 + 2) % len(COMPANION_NAMES)]
            story_id = uuid5(DEMO_LIBRARY_NAMESPACE, f"story:{global_index + 1:03d}:{title}")
            author_slot = (global_index // STORIES_PER_AUTHOR) + 1
            premium = (global_index + 1) % 5 == 0
            description = (
                f"Tại {spec.setting}, {hero} và {companion} phải giải quyết {spec.conflict}. "
                f"Manh mối xoay quanh {spec.motif}, kéo họ vào một hành trình {spec.tone} về trách nhiệm, "
                "lòng tin và khả năng sửa chữa những lựa chọn chưa trọn vẹn."
            )
            shell = StorySeed(
                id=story_id,
                author_slot=author_slot,
                title=title,
                description=description,
                category=spec.category,
                tags=f"{spec.category.lower()}, nguyên bản, dữ liệu demo, {spec.motif}",
                main_characters=f"{hero}, {companion}",
                target_audience="Độc giả từ 13 tuổi",
                is_premium=premium,
                chapters=(),
            )
            chapters: list[ChapterSeed] = []
            for chapter_number, chapter_title in enumerate(CHAPTER_TITLES, 1):
                content = _chapter_content(shell, spec, chapter_number, hero, companion)
                chapters.append(
                    ChapterSeed(
                        id=uuid5(story_id, f"chapter:{chapter_number}"),
                        number=chapter_number,
                        title=chapter_title,
                        content=content,
                        word_count=len(content.split()),
                    )
                )
            stories.append(
                StorySeed(
                    id=shell.id,
                    author_slot=shell.author_slot,
                    title=shell.title,
                    description=shell.description,
                    category=shell.category,
                    tags=shell.tags,
                    main_characters=shell.main_characters,
                    target_audience=shell.target_audience,
                    is_premium=shell.is_premium,
                    chapters=tuple(chapters),
                )
            )
            global_index += 1

    validate_demo_library(tuple(stories))
    return tuple(stories)


def validate_demo_library(stories: tuple[StorySeed, ...]) -> None:
    if len(stories) != 100:
        raise ValueError(f"Expected 100 stories, got {len(stories)}")
    if len({story.id for story in stories}) != 100:
        raise ValueError("Story IDs must be unique")
    if len({story.title.casefold() for story in stories}) != 100:
        raise ValueError("Story titles must be unique")
    if sum(not story.is_premium for story in stories) != 80:
        raise ValueError("The demo library must contain exactly 80 free stories")
    if sum(story.is_premium for story in stories) != 20:
        raise ValueError("The demo library must contain exactly 20 premium stories")
    if {story.category for story in stories} != {genre.category for genre in GENRES}:
        raise ValueError("Every configured story category must be represented")
    for story in stories:
        if len(story.chapters) != CHAPTERS_PER_STORY:
            raise ValueError(f"{story.title} does not have {CHAPTERS_PER_STORY} chapters")
        if any(chapter.word_count < 220 for chapter in story.chapters):
            raise ValueError(f"{story.title} contains a chapter that is too short")
