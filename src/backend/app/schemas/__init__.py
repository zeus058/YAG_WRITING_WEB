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
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserInToken,
    TokenResponse,
    PasswordReset,
    PasswordResetConfirm,
    PasswordChange,
)
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdate,
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
    VNPAYIPNResponse,
    PaymentResultResponse,
)
from app.schemas.search import (
    SearchResultItem,
    SearchResponse,
    SemanticSearchRequest,
    SemanticSearchResultItem,
    SemanticSearchResponse,
)
from app.schemas.ai import (
    AISuggestRequest,
    SuggestionItem,
    AISuggestResponse,
    AIRecommendRequest,
    AIRecommendResponse,
)

__all__ = [
    # Common
    "StandardResponse",
    "ErrorDetail",
    "ErrorResponse",
    "PaginationParams",
    # User / Auth
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserInToken",
    "TokenResponse",
    "PasswordReset",
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
    "VNPAYIPNResponse",
    "PaymentResultResponse",
    # Search
    "SearchResultItem",
    "SearchResponse",
    "SemanticSearchRequest",
    "SemanticSearchResultItem",
    "SemanticSearchResponse",
    # AI
    "AISuggestRequest",
    "SuggestionItem",
    "AISuggestResponse",
    "AIRecommendRequest",
    "AIRecommendResponse",
]
