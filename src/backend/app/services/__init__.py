"""
Business Logic Service Layer Package.
Contains reusable helper classes, transaction orchestrators, and system-wide services:
- AuthService, UserService
- StoryService, ChapterService
- PayOSService (PayOS)
- AIService (Gemini search & prompt engines)
"""

from app.services.auth_service import AuthService  # noqa: F401
