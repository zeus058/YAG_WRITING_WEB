from datetime import date
from typing import Literal, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class AdminReasonRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)


class ModerationOverrideRequest(BaseModel):
    decision: Literal["approved", "rejected", "flagged"]
    reason: str = Field(..., min_length=3, max_length=1000)
    violation_category: Optional[str] = Field(default=None, max_length=50)
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)


class AdminStatsResponse(BaseModel):
    users_total: int
    users_new_7d: int
    users_locked: int
    stories_total: int
    chapters_total: int
    premium_revenue_total: float
    premium_revenue_30d: float
    moderation_pending: int
    moderation_flagged: int
    moderation_rejected: int
    moderation_approved: int
    unresolved_admin_alerts: int
    audit_logs_total: int


class AdminRevenuePoint(BaseModel):
    label: str
    revenue: float
    revenue_vnd: float
    memberships: int


class AdminRevenueSeriesResponse(BaseModel):
    range: Literal["week", "month", "quarter"]
    series: list[AdminRevenuePoint]


class AdminReportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_date: date = Field(validation_alias=AliasChoices("from_date", "from"))
    to_date: date = Field(validation_alias=AliasChoices("to_date", "to"))
    report_type: Literal["revenue", "users", "content"] = Field(
        default="revenue",
        validation_alias=AliasChoices("report_type", "type"),
    )


class AdminReportRow(BaseModel):
    label: str
    revenue: float
    revenue_vnd: float
    memberships: int
    users: int
    content: int


class AdminReportResponse(BaseModel):
    from_date: date
    to_date: date
    report_type: Literal["revenue", "users", "content"]
    rows: list[AdminReportRow]
