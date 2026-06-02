import logging
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

logger = logging.getLogger("cloudinary_service")

# Initialize configuration only if all credentials are set
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )
else:
    logger.warning("Cloudinary credentials are not configured. Running in local mock upload mode.")

class CloudinaryService:
    @staticmethod
    def upload_avatar(file: UploadFile) -> str:
        """
        Uploads avatar image to Cloudinary, crops and centers it on detected faces
        at a 250x250 square ratio, and optimizes formats to WebP.
        """
        # Graceful fallback for local development or testing environments
        if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
            filename = file.filename or "avatar.png"
            logger.info(f"Mocking Cloudinary avatar upload for: {filename}")
            return f"https://res.cloudinary.com/mock-yag/image/upload/v123456/yag/avatars/{filename}"

        try:
            upload_result = cloudinary.uploader.upload(
                file.file,
                folder="yag/avatars",
                transformation=[
                    {"width": 250, "height": 250, "crop": "thumb", "gravity": "face"},
                    {"fetch_format": "webp", "quality": "auto"}
                ]
            )
            secure_url = upload_result.get("secure_url")
            if not secure_url:
                raise ValueError("secure_url not found in Cloudinary upload payload")
            return secure_url
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Lỗi tải ảnh lên Cloudinary: {str(e)}"
            )
