"""
Media upload services.
Cloudinary credentials stay on the backend; clients only receive delivery URLs.
"""
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_cover_file(cover_file: UploadFile) -> None:
    filename = cover_file.filename or ""
    suffix = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cover image must be a JPG, PNG, or WEBP file",
        )

    if cover_file.content_type and cover_file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cover image content type must be image/jpeg, image/png, or image/webp",
        )


def ensure_cloudinary_configured() -> None:
    if not all(
        [
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        ]
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        )


def upload_story_cover_to_cloudinary(cover_file: UploadFile) -> str:
    validate_cover_file(cover_file)
    ensure_cloudinary_configured()

    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary SDK is not installed. Run pip install -r requirements.txt.",
        ) from exc

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )

    cover_file.file.seek(0)
    try:
        result = cloudinary.uploader.upload(
            cover_file.file,
            folder=settings.CLOUDINARY_COVER_FOLDER,
            resource_type="image",
            use_filename=False,
            unique_filename=True,
            overwrite=False,
            transformation=[
                {"width": 1200, "height": 1600, "crop": "limit"},
                {"quality": "auto", "fetch_format": "auto"},
            ],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cloudinary upload failed: {exc}",
        ) from exc

    secure_url = result.get("secure_url")
    if not secure_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary upload did not return a secure URL",
        )
    return secure_url
