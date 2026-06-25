"""
Pydantic Schemas Package.
Contains request/response data schemas, validation layers, and serialization parameters.
"""

from app.schemas.common import (
    StandardResponse,
    ErrorDetail,
    ErrorResponse,
    PaginationParams,
)
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordChange,
    ProfileUpdate,
    ProfileResponse,
)
from app.schemas.story import (
    AuthorBrief,
    StoryCreate,
    StoryUpdate,
    StoryResponse,
    StoryListItem,
    StoryListResponse,
)
from app.schemas.chapter import (
    ChapterCreate,
    ChapterUpdate,
    ChapterPublishRequest,
    ChapterResponse,
    ChapterListItem,
)
from app.schemas.comment import (
    CommentCreate,
    CommentResponse,
)
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
)
from app.schemas.membership import (
    MembershipPlanResponse,
    MembershipStatusResponse,
    CheckoutRequest,
    CheckoutResponse,
)
from app.schemas.payment import (
    PaymentResultResponse,
    TransactionHistoryItem,
)
from app.schemas.ai import (
    AISuggestionItem,
    AISuggestionRequest,
    AISuggestionResponse,
    AISemanticSearchItem,
    AISemanticSearchRequest,
    AISemanticSearchResponse,
    AIRecommendationItem,
    AIRecommendationResponse,
)
from app.schemas.forum import (
    ForumPostCreate,
    ForumPostResponse,
    ForumReplyCreate,
    ForumReplyResponse,
)

__all__ = [
    # Common
    "StandardResponse",
    "ErrorDetail",
    "ErrorResponse",
    "PaginationParams",
    # User / Auth
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    "PasswordChange",
    # Profile
    "ProfileResponse",
    "ProfileUpdate",
    # Story
    "AuthorBrief",
    "StoryCreate",
    "StoryUpdate",
    "StoryResponse",
    "StoryListItem",
    "StoryListResponse",
    # Chapter
    "ChapterCreate",
    "ChapterUpdate",
    "ChapterPublishRequest",
    "ChapterResponse",
    "ChapterListItem",
    # Comment
    "CommentCreate",
    "CommentResponse",
    # Review
    "ReviewCreate",
    "ReviewResponse",
    # Membership
    "MembershipPlanResponse",
    "MembershipStatusResponse",
    "CheckoutRequest",
    "CheckoutResponse",
    # Payment
    "PaymentResultResponse",
    "TransactionHistoryItem",
    # AI
    "AISuggestionItem",
    "AISuggestionRequest",
    "AISuggestionResponse",
    "AISemanticSearchItem",
    "AISemanticSearchRequest",
    "AISemanticSearchResponse",
    "AIRecommendationItem",
    "AIRecommendationResponse",
    # Forum
    "ForumPostCreate",
    "ForumPostResponse",
    "ForumReplyCreate",
    "ForumReplyResponse",
]

