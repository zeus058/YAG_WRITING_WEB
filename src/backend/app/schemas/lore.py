"""Pydantic schemas for Lorebook (story_lores) CRUD."""

import uuid
from pydantic import BaseModel, Field, ConfigDict


VALID_ENTITY_TYPES = {"character", "location", "item", "skill", "other"}


class LoreCreate(BaseModel):
    entity_name: str = Field(min_length=1, max_length=100)
    entity_type: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1)


class LoreUpdate(BaseModel):
    entity_name: str | None = Field(default=None, max_length=100)
    entity_type: str | None = Field(default=None, max_length=50)
    description: str | None = None


class LoreOut(BaseModel):
    id: uuid.UUID
    story_id: uuid.UUID
    entity_name: str
    entity_type: str
    description: str

    model_config = ConfigDict(from_attributes=True)
