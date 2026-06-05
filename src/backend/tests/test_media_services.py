import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, UploadFile, status
import io

from app.core.config import settings
from app.services.cloudinary_service import CloudinaryService
from app.services.media_service import (
    validate_cover_file,
    ensure_cloudinary_configured,
    upload_story_cover_to_cloudinary,
)


def test_validate_cover_file_success():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "cover.jpg"
    mock_file.content_type = "image/jpeg"
    
    # Should not raise any exception
    validate_cover_file(mock_file)


def test_validate_cover_file_invalid_extension():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "cover.txt"
    mock_file.content_type = "image/jpeg"
    
    with pytest.raises(HTTPException) as exc_info:
        validate_cover_file(mock_file)
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "must be a JPG, PNG, or WEBP file" in exc_info.value.detail


def test_validate_cover_file_invalid_content_type():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "cover.png"
    mock_file.content_type = "text/plain"
    
    with pytest.raises(HTTPException) as exc_info:
        validate_cover_file(mock_file)
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "content type must be image/jpeg" in exc_info.value.detail


def test_ensure_cloudinary_configured_success():
    with patch("app.services.media_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = "cloud"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"
        
        # Should not raise any exception
        ensure_cloudinary_configured()


def test_ensure_cloudinary_configured_failure():
    with patch("app.services.media_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = None
        mock_settings.CLOUDINARY_API_KEY = None
        mock_settings.CLOUDINARY_API_SECRET = None
        
        with pytest.raises(HTTPException) as exc_info:
            ensure_cloudinary_configured()
        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_upload_story_cover_to_cloudinary_success():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "cover.png"
    mock_file.content_type = "image/png"
    mock_file.file = io.BytesIO(b"dummy data")

    mock_upload_result = {"secure_url": "https://cloudinary.com/success"}

    with patch("app.services.media_service.settings") as mock_settings, \
         patch("app.services.media_service.ensure_cloudinary_configured"), \
         patch("cloudinary.uploader.upload", return_value=mock_upload_result) as mock_upload:
        
        mock_settings.CLOUDINARY_CLOUD_NAME = "cloud"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"
        mock_settings.CLOUDINARY_COVER_FOLDER = "yag/covers"

        url = upload_story_cover_to_cloudinary(mock_file)
        assert url == "https://cloudinary.com/success"
        mock_upload.assert_called_once()


def test_upload_story_cover_to_cloudinary_failure_exception():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "cover.png"
    mock_file.content_type = "image/png"
    mock_file.file = io.BytesIO(b"dummy data")

    with patch("app.services.media_service.settings") as mock_settings, \
         patch("app.services.media_service.ensure_cloudinary_configured"), \
         patch("cloudinary.uploader.upload", side_effect=Exception("Connection failed")):
        
        mock_settings.CLOUDINARY_CLOUD_NAME = "cloud"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"

        with pytest.raises(HTTPException) as exc_info:
            upload_story_cover_to_cloudinary(mock_file)
        assert exc_info.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "Cloudinary upload failed" in exc_info.value.detail


def test_upload_story_cover_to_cloudinary_failure_no_url():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "cover.png"
    mock_file.content_type = "image/png"
    mock_file.file = io.BytesIO(b"dummy data")

    with patch("app.services.media_service.settings") as mock_settings, \
         patch("app.services.media_service.ensure_cloudinary_configured"), \
         patch("cloudinary.uploader.upload", return_value={}): # No secure_url key
        
        mock_settings.CLOUDINARY_CLOUD_NAME = "cloud"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"

        with pytest.raises(HTTPException) as exc_info:
            upload_story_cover_to_cloudinary(mock_file)
        assert exc_info.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "did not return a secure URL" in exc_info.value.detail


def test_cloudinary_service_upload_avatar_fallback():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "myavatar.png"
    
    with patch("app.services.cloudinary_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = None
        mock_settings.CLOUDINARY_API_KEY = None
        mock_settings.CLOUDINARY_API_SECRET = None
        
        url = CloudinaryService.upload_avatar(mock_file)
        assert "mock-yag" in url
        assert "myavatar.png" in url


def test_cloudinary_service_upload_avatar_success():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "myavatar.png"
    mock_file.file = io.BytesIO(b"avatar data")
    
    mock_result = {"secure_url": "https://cloudinary.com/avatar_success"}

    with patch("app.services.cloudinary_service.settings") as mock_settings, \
         patch("cloudinary.uploader.upload", return_value=mock_result):
        mock_settings.CLOUDINARY_CLOUD_NAME = "cloud"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"
        
        url = CloudinaryService.upload_avatar(mock_file)
        assert url == "https://cloudinary.com/avatar_success"


def test_cloudinary_service_upload_avatar_failure():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "myavatar.png"
    mock_file.file = io.BytesIO(b"avatar data")

    with patch("app.services.cloudinary_service.settings") as mock_settings, \
         patch("cloudinary.uploader.upload", side_effect=Exception("Upload error")):
        mock_settings.CLOUDINARY_CLOUD_NAME = "cloud"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"
        
        with pytest.raises(HTTPException) as exc_info:
            CloudinaryService.upload_avatar(mock_file)
        assert exc_info.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "Cloudinary: Upload error" in exc_info.value.detail


def test_cloudinary_service_upload_avatar_no_url():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "myavatar.png"
    mock_file.file = io.BytesIO(b"avatar data")

    with patch("app.services.cloudinary_service.settings") as mock_settings, \
         patch("cloudinary.uploader.upload", return_value={}):
        mock_settings.CLOUDINARY_CLOUD_NAME = "cloud"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"
        
        with pytest.raises(HTTPException) as exc_info:
            CloudinaryService.upload_avatar(mock_file)
        assert exc_info.value.status_code == status.HTTP_502_BAD_GATEWAY
        assert "secure_url not found" in exc_info.value.detail
