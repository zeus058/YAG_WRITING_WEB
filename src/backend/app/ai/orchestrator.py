"""AI orchestration for writing suggestions and recommendation reranking."""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from typing import Any

from app.ai.gateway import (
    GeminiConfigurationError,
    GeminiGateway,
    GeminiGatewayError,
)
from app.ai.skills import RECOMMENDATION_CURATOR_SKILL, WRITING_COACH_SKILL
from app.ai.tools import (
    get_author_style_profile,
    get_reader_profile,
    get_story_context,
    safe_truncate,
)
from app.core.config import settings
from app.schemas.ai import (
    AIRecommendationItem,
    AISuggestionItem,
    AISuggestionRequest,
    AISuggestionResponse,
    AiMode,
)

logger = logging.getLogger(__name__)

DEFAULT_MODE: AiMode = "plot"

MODE_ALIASES: dict[str, AiMode] = {
    "plot": "plot",
    "gợi ý": "plot",
    "goi y": "plot",
    "kịch tính": "kịch tính",
    "kich tinh": "kịch tính",
    "dramatic": "kịch tính",
    "rewrite": "rewrite",
    "viet lai": "rewrite",
    "viết lại": "rewrite",
    "lãng mạn": "lãng mạn",
    "lang man": "lãng mạn",
    "romance": "lãng mạn",
    "continue": "continue",
    "viet tiep": "continue",
    "viết tiếp": "continue",
    "outline": "outline",
    "dan y": "outline",
    "dàn ý": "outline",
    "dialogue": "dialogue",
    "doi thoai": "dialogue",
    "đối thoại": "dialogue",
    "pacing": "pacing",
    "nhip truyen": "pacing",
    "nhịp truyện": "pacing",
    "bí ẩn": "bí ẩn",
    "bi an": "bí ẩn",
    "mystery": "bí ẩn",
    "write_chapter": "write_chapter",
    "viet ca chuong": "write_chapter",
    "viết cả chương": "write_chapter",
    "full chapter": "write_chapter",
    # Backward compatibility with older mojibake fixtures.
    "kÃ¡Â»â€¹ch tÃƒÂ­nh": "kịch tính",
    "ká»‹ch tÃ­nh": "kịch tính",
    "lÃƒÂ£ng mÃ¡ÂºÂ¡n": "lãng mạn",
    "lÃ£ng máº¡n": "lãng mạn",
    "bÃƒÂ­ Ã¡ÂºÂ©n": "bí ẩn",
    "bÃ­ áº©n": "bí ẩn",
}

FALLBACK_LIBRARY: dict[AiMode, list[tuple[str, str, str, str, float]]] = {
    "plot": [
        (
            "Đẩy mục tiêu rõ hơn",
            "Cho nhân vật chính chọn một mục tiêu cụ thể trong cảnh kế tiếp.",
            "Mục tiêu rõ giúp chương có lực kéo và tránh lan man.",
            "Nhân vật nhìn lại điều vừa mất, rồi quyết định bước tới một nơi có thể đổi lấy câu trả lời.",
            0.78,
        ),
        (
            "Tạo trở lực mới",
            "Đặt một nhân vật phụ hoặc manh mối cũ thành trở ngại trực tiếp.",
            "Trở lực nối với chi tiết đã có sẽ tạo cảm giác liền mạch.",
            "Ngay khi kế hoạch tưởng như ổn, một chi tiết quen thuộc xuất hiện sai vị trí.",
            0.76,
        ),
        (
            "Kết bằng lựa chọn khó",
            "Khép đoạn bằng hai lựa chọn đều có cái giá riêng.",
            "Lựa chọn khó giữ độc giả tò mò sang chương sau.",
            "Cánh cửa mở ra, nhưng thứ chờ phía sau buộc nhân vật phải bỏ lại một điều quan trọng.",
            0.74,
        ),
    ],
    "rewrite": [
        (
            "Làm câu văn có lực hơn",
            "Giữ ý chính nhưng thay câu kể bằng hành động và cảm giác cụ thể.",
            "Bản viết lại nên cho độc giả thấy thay vì chỉ được kể.",
            "Không khí lặng đi. Nhân vật siết tay, nhận ra câu trả lời đã nằm trong điều mình luôn né tránh.",
            0.8,
        ),
        (
            "Tăng điểm nhìn nhân vật",
            "Viết lại cảnh qua cảm nhận tức thời của nhân vật chính.",
            "Điểm nhìn rõ làm cảm xúc đáng tin hơn.",
            "Mỗi âm thanh trong phòng bỗng trở nên sắc cạnh, như thể tất cả đều đang chờ nhân vật phạm sai lầm.",
            0.77,
        ),
        (
            "Rút nhịp đoạn chậm",
            "Cắt giải thích dư và giữ lại chi tiết có tác dụng chuyển cảnh.",
            "Nhịp gọn giúp đoạn văn chuyên nghiệp hơn.",
            "Nhân vật không giải thích nữa. Một bước chân, một ánh nhìn, và mọi thứ đã đổi hướng.",
            0.75,
        ),
    ],
    "continue": [
        (
            "Viết tiếp bằng hệ quả",
            "Mở đoạn kế bằng hậu quả trực tiếp của hành động cuối cùng.",
            "Hệ quả giữ tính nhân quả của chương.",
            "Tiếng động vừa dứt, cả căn phòng lập tức hiểu rằng không ai còn đường quay lại.",
            0.79,
        ),
        (
            "Mở một cuộc đối đầu nhỏ",
            "Cho nhân vật bị chất vấn bằng một câu hỏi không thể né.",
            "Đối đầu nhỏ tạo nhịp đọc nhanh và tự nhiên.",
            "Người kia bước tới, hạ giọng hỏi đúng điều nhân vật sợ nhất bị nghe thấy.",
            0.77,
        ),
        (
            "Đưa manh mối vào hành động",
            "Cho manh mối xuất hiện qua vật thể hoặc hành vi thay vì lời giải thích.",
            "Manh mối trong hành động giúp cảnh sống động hơn.",
            "Trên mép bàn, dấu vết nhỏ ấy nằm im, nhưng đủ khiến mọi giả thuyết trước đó sụp xuống.",
            0.76,
        ),
    ],
    "outline": [
        (
            "Ba nhịp cho chương kế",
            "Mở bằng mục tiêu, giữa bằng biến cố, cuối bằng lựa chọn khó.",
            "Cấu trúc ba nhịp dễ triển khai thành chương hoàn chỉnh.",
            "1. Mục tiêu mới. 2. Trở ngại bất ngờ. 3. Một quyết định làm thay đổi quan hệ.",
            0.79,
        ),
        (
            "Dàn cảnh theo cảm xúc",
            "Sắp chương theo đường cảm xúc: nghi ngờ, va chạm, nhận ra.",
            "Cảm xúc rõ giúp dàn ý không chỉ là chuỗi sự kiện.",
            "Nghi ngờ âm thầm tăng lên, một va chạm buộc nhân vật nói thật, rồi nhận ra mình đã hiểu sai.",
            0.76,
        ),
        (
            "Cài móc chương sau",
            "Đặt một câu hỏi chưa trả lời ở cuối dàn ý.",
            "Móc nối giúp lịch đăng chương có sức kéo.",
            "Khi mọi chuyện tưởng khép lại, nhân vật phụ để lộ một thông tin không ai hỏi tới.",
            0.74,
        ),
    ],
    "dialogue": [
        (
            "Đối thoại có ẩn ý",
            "Cho nhân vật nói lệch khỏi điều họ thật sự muốn.",
            "Ẩn ý làm thoại tự nhiên và có chiều sâu.",
            '"Ngươi đến muộn." "Ta vẫn đến, không phải sao?"',
            0.78,
        ),
        (
            "Cắt lời đúng lúc",
            "Dùng một câu bị ngắt để tạo căng thẳng.",
            "Cắt lời làm xung đột hiện lên ngay trong nhịp thoại.",
            '"Nếu ngươi biết sự thật thì..." "Ta biết từ lâu rồi."',
            0.76,
        ),
        (
            "Một câu lộ tính cách",
            "Để nhân vật chọn từ ngữ phản ánh nỗi sợ hoặc tham vọng.",
            "Thoại tốt vừa đẩy cảnh vừa khắc họa con người.",
            '"Ta không cần thắng. Ta chỉ cần các ngươi nhớ ai đã khiến đêm nay bắt đầu."',
            0.75,
        ),
    ],
    "pacing": [
        (
            "Rút đoạn giải thích",
            "Chuyển một phần giải thích thành hành động hoặc phản ứng.",
            "Nhịp truyện nhanh hơn khi thông tin đi qua cảnh.",
            "Thay vì giải thích kế hoạch, hãy để nhân vật thử một bước và trả giá ngay.",
            0.78,
        ),
        (
            "Thêm khoảng lặng",
            "Sau biến cố lớn, cho một khoảnh khắc ngắn để cảm xúc lắng xuống.",
            "Khoảng lặng giúp cao trào sau đó có trọng lượng hơn.",
            "Không ai nói gì trong vài giây, và chính khoảng im đó khiến sự thật trở nên nặng hơn.",
            0.75,
        ),
        (
            "Chia cảnh bằng mục tiêu",
            "Mỗi đoạn nên có một mục tiêu nhỏ, một trở ngại, một thay đổi.",
            "Cách chia này giữ nhịp đọc rõ ràng.",
            "Nếu đoạn không làm mục tiêu đổi hướng, hãy gộp hoặc cắt nó.",
            0.74,
        ),
    ],
    "kịch tính": [
        (
            "Tăng áp lực ngay",
            "Cho nhân vật chính đối diện một lượt phản công bắt buộc.",
            "Giữ nhịp nhanh và đẩy xung đột lên cao.",
            "Đối thủ không chờ thêm nữa; đòn phản công buộc nhân vật chọn giữa an toàn và lời hứa.",
            0.78,
        ),
        (
            "Lật ngược ưu thế",
            "Đặt một chi tiết mới khiến tình thế từ lợi thành bất lợi.",
            "Tạo cú bước ngoặt mạnh mẽ.",
            "Thứ tưởng là bằng chứng cứu nguy lại trở thành lý do khiến mọi người nghi ngờ nhân vật.",
            0.77,
        ),
        (
            "Kết bằng một đe dọa",
            "Khép cảnh bằng dấu hiệu cho thấy nguy cơ vẫn chưa chấm dứt.",
            "Giữ độ dở dang cho chương sau.",
            "Khi cánh cửa đóng lại, một giọng nói lạ vang lên từ phía không ai canh giữ.",
            0.75,
        ),
    ],
    "lãng mạn": [
        (
            "Để cảm xúc chạm nhau",
            "Cho hai nhân vật vừa hiểu lầm vừa muốn lại gần nhau hơn.",
            "Tăng độ rung cảm và gần gũi.",
            "Họ cùng im lặng, nhưng lần này khoảng cách giữa hai người không còn lạnh như trước.",
            0.78,
        ),
        (
            "Một chi tiết nhỏ riêng tư",
            "Đưa vào một cử chỉ chân thật chỉ hai người hiểu.",
            "Làm nổi bật sự tinh tế của mối quan hệ.",
            "Nhân vật đặt lại món đồ cũ vào tay người kia, như trả về một lời chưa từng nói.",
            0.76,
        ),
        (
            "Khép cảnh bằng một lời chưa nói",
            "Để câu quan trọng nhất dừng lại ngay trước khi được thốt ra.",
            "Giữ dư âm nhẹ nhàng và tiếc nuối.",
            "Câu trả lời nằm trên đầu môi, nhưng tiếng mưa đã kịp che nó đi.",
            0.74,
        ),
    ],
    "bí ẩn": [
        (
            "Cài một manh mối lệch",
            "Thêm một chi tiết nhỏ nhưng phá vỡ logic bề mặt.",
            "Kéo độc giả vào việc suy đoán.",
            "Trong đống tro, có một mảnh giấy không hề cháy, ghi đúng tên người không nên xuất hiện.",
            0.78,
        ),
        (
            "Một người xuất hiện sai lúc",
            "Cho một nhân vật phụ có hành vi không khớp với lời nói.",
            "Tạo cảm giác có điều bị che giấu.",
            "Người ấy nói chưa từng đến đây, nhưng lại tránh đúng tấm ván sàn bị gãy.",
            0.77,
        ),
        (
            "Đóng cảnh bằng khoảng trống",
            "Kết chương bằng một phát hiện chưa đủ để giải thích mọi thứ.",
            "Giữ độ tò mò cho chương sau.",
            "Chiếc hộp trống rỗng, nhưng lớp bụi bên trong cho thấy thứ bị lấy đi chỉ mới biến mất.",
            0.75,
        ),
    ],
    "write_chapter": [
        (
            "Chương hành động mở màn",
            "Một chương mở đầu với nhịp nhanh, hành động dồn dập và kết thúc bằng một bước ngoặt.",
            "Chương hành động giúp thu hút độc giả ngay từ đầu.",
            "Tiếng kiếm vang lên giữa đêm. Nhân vật lao vào bóng tối, nơi kẻ thù đã chờ sẵn. "
            "Mỗi bước chân là một canh bạc, mỗi nhát chém là một lời thề không được phép phá vỡ. "
            "Khi ánh trăng xuyên qua mái nhà đổ, nhân vật nhận ra đối thủ không phải người lạ — "
            "đó là người mà mình đã từng tin tưởng nhất. Thanh kiếm trong tay bỗng nặng trĩu. "
            "\"Ngươi biết từ đầu, phải không?\" Giọng nhân vật run, nhưng lưỡi kiếm thì không.",
            0.82,
        ),
        (
            "Chương đối thoại và cảm xúc",
            "Một chương xoay quanh cuộc trò chuyện sâu sắc giữa hai nhân vật, bộc lộ quá khứ và xung đột nội tâm.",
            "Đối thoại chân thực giúp độc giả hiểu nhân vật và gắn kết cảm xúc.",
            "Căn phòng chỉ có hai người và một ngọn nến sắp tắt. \"Ta đã chờ ngươi nói điều này rất lâu,\" "
            "người đối diện cất tiếng, giọng nhẹ như gió nhưng nặng như đá. Nhân vật không đáp ngay. "
            "Ký ức ùa về — những ngày còn cùng nhau chạy dưới mưa, những lần hứa sẽ không bao giờ bỏ đi. "
            "\"Ta không bỏ đi. Ta chỉ chọn một con đường khác.\" \"Khác?\" Người kia cười buồn. "
            "\"Khác nghĩa là bỏ lại tất cả những gì chúng ta từng có.\"",
            0.80,
        ),
        (
            "Chương khám phá và bí ẩn",
            "Một chương nơi nhân vật phát hiện một manh mối quan trọng, dẫn đến nhiều câu hỏi hơn câu trả lời.",
            "Bí ẩn và khám phá giữ nhịp truyện hấp dẫn và tạo lực kéo cho chương sau.",
            "Căn hầm dưới lòng đất không có trên bất kỳ bản đồ nào. Nhân vật bước xuống từng bậc thang đá, "
            "ngọn đuốc trong tay run rẩy theo nhịp gió lạ. Trên tường, những ký hiệu cổ xưa xếp thành hàng — "
            "không phải ngôn ngữ nào nhân vật từng biết, nhưng có một ký hiệu quen thuộc đến rùng mình: "
            "biểu tượng gia tộc của chính mình. \"Tại sao ở đây?\" Câu hỏi vang vọng trong bóng tối, "
            "nhưng không ai trả lời. Chỉ có tiếng nước nhỏ giọt đều đều, như đếm ngược thời gian.",
            0.79,
        ),
    ],
}


def _normalize_mode_key(mode: str) -> str:
    return re.sub(r"\s+", " ", mode.strip().lower())


def normalize_mode(mode: str) -> AiMode:
    normalized = _normalize_mode_key(mode)
    if normalized in MODE_ALIASES:
        return MODE_ALIASES[normalized]

    folded = (
        unicodedata.normalize("NFKD", normalized)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    return MODE_ALIASES.get(folded, DEFAULT_MODE)


def truncate_context(context: str, limit_words: int) -> str:
    words = context.split()
    if len(words) <= limit_words:
        return context.strip()
    return " ".join(words[-limit_words:]).strip()


def build_fallback_items(
    mode: AiMode,
    *,
    context: str = "",
    story_context: dict[str, Any] | None = None,
) -> list[AISuggestionItem]:
    normalized_mode = normalize_mode(mode)
    story = (story_context or {}).get("story") or {}
    category = story.get("category") or "thể loại hiện tại"
    reference = story.get("style_reference") or {}
    reference_hint = ", ".join(
        str(value).strip() for value in reference.values() if str(value or "").strip()
    )
    context_hint = safe_truncate(context, 220)

    items = []
    for title, content, reason, insertable_text, score in FALLBACK_LIBRARY[normalized_mode]:
        detail = content
        if context_hint:
            detail = f"{content} Bám vào đoạn gần nhất: {context_hint}"
        items.append(
            AISuggestionItem(
                title=title,
                content=detail,
                reason=(
                    f"{reason} Phù hợp với {category}."
                    + (
                        f" Có thể dùng reference metadata ({reference_hint}) như cảm hứng cấp cao."
                        if reference_hint
                        else ""
                    )
                ),
                insertable_text=insertable_text,
                quality_score=score,
            )
        )
    return items


def normalize_suggestions(data: dict[str, Any], mode: AiMode) -> list[AISuggestionItem]:
    raw_suggestions = data.get("suggestions", [])
    suggestions: list[AISuggestionItem] = []
    for item in raw_suggestions:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        content = str(item.get("content", "")).strip()
        if not title or not content:
            continue

        reason = item.get("reason")
        insertable_text = item.get("insertable_text") or item.get("insertableText")
        quality_score = item.get("quality_score") or item.get("qualityScore")
        try:
            quality = (
                max(0.0, min(1.0, float(quality_score)))
                if quality_score is not None
                else None
            )
        except (TypeError, ValueError):
            quality = None

        suggestions.append(
            AISuggestionItem(
                title=title,
                content=content,
                reason=str(reason).strip() if reason else None,
                insertable_text=(
                    str(insertable_text).strip() if insertable_text else None
                ),
                quality_score=quality,
            )
        )
        if len(suggestions) == 3:
            break

    if len(suggestions) < 3:
        suggestions.extend(build_fallback_items(mode)[len(suggestions):3])

    return suggestions[:3]


def build_fallback_response(
    request: AISuggestionRequest,
    message: str | None = None,
    *,
    story_context: dict[str, Any] | None = None,
) -> AISuggestionResponse:
    return AISuggestionResponse(
        chapter_id=request.chapter_id,
        mode=request.mode,
        provider="fallback",
        model=None,
        fallback=True,
        suggestions=build_fallback_items(
            request.mode,
            context=request.context,
            story_context=story_context,
        ),
        message=message
        or "Gemini is unavailable, so local writing-agent suggestions were used.",
    )


class WritingAgent:
    def __init__(self, gateway: GeminiGateway | None = None) -> None:
        self.gateway = gateway or GeminiGateway()

    def _build_prompt(
        self,
        request: AISuggestionRequest,
        context: str,
        story_context: dict[str, Any],
        style_profile: dict[str, Any],
    ) -> tuple[str, str]:
        normalized_mode = normalize_mode(request.mode)
        tool_bundle = {
            "story_context": story_context,
            "author_style_profile": style_profile,
            "requested_mode": normalized_mode,
            "target_words": request.target_words,
            "selected_text": safe_truncate(request.selected_text, 1600),
            "style_reference": {
                "story_title": request.style_reference_story_title,
                "series_title": request.style_reference_series_title,
                "author": request.style_reference_author,
                "copyright_safety": (
                    "Reference is metadata only. Use it for genre/tempo/high-level "
                    "tone, never copied text, scenes, or protected expression."
                ),
            },
        }
        is_write_chapter = normalized_mode == "write_chapter"

        if is_write_chapter:
            system_prompt = (
                WRITING_COACH_SKILL.strip()
                + "\nReturn JSON only with this exact shape: "
                '{"suggestions":[{"title":"...","content":"...",'
                '"reason":"...","insertable_text":"...","quality_score":0.0}]}. '
                "Return exactly 3 suggestions in Vietnamese. No markdown. "
                "IMPORTANT: For write_chapter mode, each insertable_text MUST be a "
                "complete chapter draft of at least 500-1000 words in Vietnamese prose. "
                "Write vivid, immersive fiction with dialogue, descriptions, and pacing. "
                "The content field should be a 1-2 sentence summary of what the chapter covers."
            )
            user_prompt = (
                f"Mode: {normalized_mode}\n"
                f"Author's idea/context:\n{context}\n\n"
                f"Tool outputs:\n{json.dumps(tool_bundle, ensure_ascii=False)}\n\n"
                "Task: You are the AI co-writer. The author wants you to write a COMPLETE "
                "chapter draft based on the idea provided. Produce three different chapter "
                "drafts with different approaches (e.g. action-oriented, emotional, mysterious). "
                "Each insertable_text must be a full chapter of 500-1000 words of Vietnamese "
                "prose that the author can paste directly into their editor. Use the story "
                "context, style profile, and reference metadata to match the story's tone. "
                "Respect continuity and avoid adding unsupported facts."
            )
        else:
            system_prompt = (
                WRITING_COACH_SKILL.strip()
                + "\nReturn JSON only with this exact shape: "
                '{"suggestions":[{"title":"...","content":"...",'
                '"reason":"...","insertable_text":"...","quality_score":0.0}]}. '
                "Return exactly 3 suggestions in Vietnamese. No markdown."
            )
            user_prompt = (
                f"Mode: {normalized_mode}\n"
                f"Author draft context:\n{context}\n\n"
                f"Tool outputs:\n{json.dumps(tool_bundle, ensure_ascii=False)}\n\n"
                "Task: act as the main writing program. Produce three useful options "
                "that the author can apply immediately. Prefer approved same-story "
                "chapters and the author's previous approved works for style. If there "
                "is no author history, use only the reference metadata as broad "
                "inspiration and do not imitate or copy protected expression. Respect "
                "continuity and avoid adding unsupported facts."
            )
        return system_prompt, user_prompt

    async def generate(
        self, request: AISuggestionRequest, db: Any = None
    ) -> AISuggestionResponse:
        context = truncate_context(request.context, settings.AI_CONTEXT_WORD_LIMIT)
        context = safe_truncate(context, settings.AI_MAX_CONTEXT_CHARS)
        sanitized_request = AISuggestionRequest(
            chapter_id=request.chapter_id,
            story_id=request.story_id,
            context=context,
            mode=request.mode,
            target_words=request.target_words,
            selected_text=request.selected_text,
            style_reference_story_title=request.style_reference_story_title,
            style_reference_series_title=request.style_reference_series_title,
            style_reference_author=request.style_reference_author,
        )
        story_context = get_story_context(
            db,
            story_id=sanitized_request.story_id,
            chapter_id=sanitized_request.chapter_id,
        )
        style_profile = get_author_style_profile(story_context)

        if not settings.AI_AGENT_ENABLED:
            return build_fallback_response(
                sanitized_request,
                "AI agent mode is disabled.",
                story_context=story_context,
            )

        try:
            system_prompt, user_prompt = self._build_prompt(
                sanitized_request, context, story_context, style_profile
            )
            parsed, _raw_text = await self.gateway.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.75,
                max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
                model=settings.GEMINI_STRONG_MODEL,
            )
            suggestions = normalize_suggestions(parsed, request.mode)
            return AISuggestionResponse(
                chapter_id=sanitized_request.chapter_id,
                mode=request.mode,
                provider="gemini",
                model=settings.GEMINI_STRONG_MODEL,
                fallback=False,
                suggestions=suggestions,
                message=(
                    parsed.get("message")
                    if isinstance(parsed.get("message"), str)
                    else None
                ),
            )
        except (GeminiConfigurationError, GeminiGatewayError, ValueError) as exc:
            logger.warning("Writing agent fell back: %s", type(exc).__name__)
            return build_fallback_response(
                sanitized_request,
                str(exc),
                story_context=story_context,
            )


class RecommendationAgent:
    def __init__(self, gateway: GeminiGateway | None = None) -> None:
        self.gateway = gateway or GeminiGateway()

    def _candidate_by_id(
        self, candidates: list[dict[str, Any]]
    ) -> dict[str, dict[str, Any]]:
        return {
            str(candidate.get("story_id")): candidate
            for candidate in candidates
            if candidate.get("story_id")
        }

    def _safe_candidates(
        self, candidates: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        return [
            {
                "story_id": str(candidate.get("story_id")),
                "title": candidate.get("title"),
                "plot_summary": safe_truncate(candidate.get("plot_summary"), 900),
                "category": candidate.get("category"),
                "rating_avg": candidate.get("rating_avg"),
                "view_count": candidate.get("view_count"),
                "similarity": candidate.get("similarity"),
                "source": candidate.get("source", "semantic"),
            }
            for candidate in candidates[: settings.AI_RECOMMENDATION_CANDIDATE_LIMIT]
        ]

    def _build_prompts(
        self,
        *,
        reader_profile: dict[str, Any],
        candidates: list[dict[str, Any]],
        limit: int,
    ) -> tuple[str, str]:
        system_prompt = (
            RECOMMENDATION_CURATOR_SKILL.strip()
            + "\nReturn JSON only with this exact shape: "
            '{"ranking":[{"story_id":"...","reason":"...",'
            '"match_tags":["..."],"source":"llm_rerank"}]}. '
            "Use only supplied story_id values."
        )
        user_prompt = (
            f"Reader profile:\n{json.dumps(reader_profile, ensure_ascii=False)}\n\n"
            f"Candidates:\n{json.dumps(candidates, ensure_ascii=False)}\n\n"
            f"Rank the best {limit} stories for this reader."
        )
        return system_prompt, user_prompt

    def _merge_ranking(
        self,
        *,
        parsed: dict[str, Any],
        candidate_by_id: dict[str, dict[str, Any]],
        candidates: list[dict[str, Any]],
        limit: int,
    ) -> tuple[list[dict[str, Any]], bool]:
        ranked: list[dict[str, Any]] = []
        used_ids: set[str] = set()
        for item in parsed.get("ranking", []):
            if not isinstance(item, dict):
                continue
            story_id = str(item.get("story_id") or "")
            if story_id not in candidate_by_id or story_id in used_ids:
                continue
            row = dict(candidate_by_id[story_id])
            row["reason"] = str(item.get("reason") or "").strip() or None
            raw_tags = item.get("match_tags") or []
            row["match_tags"] = [
                str(tag).strip() for tag in raw_tags if str(tag).strip()
            ][:5]
            row["source"] = "llm_rerank"
            ranked.append(row)
            used_ids.add(story_id)
            if len(ranked) == limit:
                break

        for candidate in candidates:
            story_id = str(candidate.get("story_id") or "")
            if story_id and story_id not in used_ids:
                ranked.append(candidate)
            if len(ranked) == limit:
                break

        return ranked[:limit], bool(used_ids)

    async def rerank(
        self,
        *,
        db: Any,
        user_id: str,
        candidates: list[dict[str, Any]],
        limit: int,
    ) -> tuple[list[dict[str, Any]], bool, str | None]:
        if not settings.AI_AGENT_ENABLED or not candidates:
            return candidates[:limit], False, None

        reader_profile = get_reader_profile(db, user_id)
        safe_candidates = self._safe_candidates(candidates)
        system_prompt, user_prompt = self._build_prompts(
            reader_profile=reader_profile,
            candidates=safe_candidates,
            limit=limit,
        )

        try:
            parsed, _raw_text = await self.gateway.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.25,
                max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
                model=settings.GEMINI_FAST_MODEL,
            )
        except (GeminiConfigurationError, GeminiGatewayError, ValueError) as exc:
            logger.warning("Recommendation rerank fell back: %s", type(exc).__name__)
            return candidates[:limit], False, str(exc)

        ranked, used_llm = self._merge_ranking(
            parsed=parsed,
            candidate_by_id=self._candidate_by_id(candidates),
            candidates=candidates,
            limit=limit,
        )
        return ranked, used_llm, None


def build_recommendation_item(row: dict[str, Any]) -> AIRecommendationItem:
    distance = float(row.get("distance", 0.0) or 0.0)
    similarity = row.get("similarity")
    if similarity is None:
        similarity = max(0.0, min(1.0, 1.0 - distance))
    return AIRecommendationItem(
        story_id=str(row.get("story_id", "")),
        title=str(row.get("title")) if row.get("title") is not None else None,
        plot_summary=str(row.get("plot_summary", "")),
        distance=distance,
        similarity=float(similarity),
        reason=row.get("reason"),
        match_tags=row.get("match_tags") or [],
        source=row.get("source") or "semantic",
    )
