import random
import smtplib
import logging
import hashlib
import hmac
from email.mime.text import MIMEText
from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import redis

import uuid
from datetime import datetime, timezone
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.profile import Profile
from app.schemas.auth import UserRegister, UserLogin, PasswordResetConfirm

logger = logging.getLogger("auth_service")
AUTH_LOCKOUT_MAX_ATTEMPTS = 5
AUTH_LOCKOUT_SECONDS = 15 * 60
OTP_TTL_SECONDS = 300


def _auth_attempt_key(identifier: str) -> str:
    return f"auth:login:attempts:{identifier.strip().lower() or 'unknown'}"


def _auth_lock_key(identifier: str) -> str:
    return f"auth:login:lock:{identifier.strip().lower() or 'unknown'}"


def _check_login_lock(identifier: str) -> None:
    try:
        r = get_redis_client()
        if r.get(_auth_lock_key(identifier)):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="ACCOUNT_TEMP_LOCKED",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(
            "Login lockout check skipped because Redis is unavailable: %s", exc
        )


def _record_login_failure(identifier: str) -> None:
    try:
        r = get_redis_client()
        attempts = r.incr(_auth_attempt_key(identifier))
        r.expire(_auth_attempt_key(identifier), AUTH_LOCKOUT_SECONDS)
        if attempts >= AUTH_LOCKOUT_MAX_ATTEMPTS:
            r.setex(_auth_lock_key(identifier), AUTH_LOCKOUT_SECONDS, "1")
            r.delete(_auth_attempt_key(identifier))
    except Exception as exc:
        logger.warning(
            "Login failure counter skipped because Redis is unavailable: %s", exc
        )


def _clear_login_failures(identifier: str) -> None:
    try:
        r = get_redis_client()
        r.delete(_auth_attempt_key(identifier))
        r.delete(_auth_lock_key(identifier))
    except Exception as exc:
        logger.warning(
            "Login failure cleanup skipped because Redis is unavailable: %s", exc
        )


def get_redis_client():
    """Initializes and returns a Redis client."""
    if settings.REDIS_URL:
        return redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=2.0,
        )

    # Use standard host and default port 6379
    redis_kwargs = {
        "host": settings.REDIS_HOST,
        "port": settings.REDIS_PORT,
        "db": 0,
        "decode_responses": True,
        "socket_timeout": 2.0,
    }
    redis_password = getattr(settings, "REDIS_PASSWORD", None)
    if isinstance(redis_password, str) and redis_password:
        redis_kwargs["password"] = redis_password
    return redis.Redis(**redis_kwargs)


def _otp_cache_key(email: str) -> str:
    return f"otp:{email.strip().lower()}"


def _hash_otp(email: str, otp: str) -> str:
    message = f"{email.strip().lower()}:{otp}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _otp_matches(email: str, otp: str, cached_value: str | None) -> bool:
    if not cached_value:
        return False
    expected_hash = _hash_otp(email, otp)
    return hmac.compare_digest(cached_value, expected_hash) or hmac.compare_digest(
        cached_value, otp
    )


def send_otp_email(email: str, otp: str):
    """Sends OTP email via SMTP; development may log only that an OTP was issued."""
    subject = "[YAG] Yêu cầu khôi phục mật khẩu"
    body = f"Mã OTP khôi phục mật khẩu của bạn là: {otp}\nHiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai."

    smtp_host = settings.SMTP_HOST
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM or smtp_user

    if smtp_host and smtp_user and smtp_password and smtp_from:
        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = f"YAG Platform <{smtp_from}>"
            msg["To"] = email

            with smtplib.SMTP_SSL(
                smtp_host, settings.SMTP_PORT, timeout=5.0
            ) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, email, msg.as_string())
            logger.info(f"OTP successfully sent via SMTP to {email}")
        except Exception as e:
            logger.error(
                f"Failed to send email via SMTP: {e}."
            )
    else:
        logger.info("SMTP credentials not configured; OTP email was not sent.")


def send_verification_email(email: str, otp: str):
    """Sends verification OTP email via SMTP; development logs it."""
    subject = "[YAG] Xác thực tài khoản đăng ký"
    body = f"Mã OTP xác thực tài khoản của bạn là: {otp}\nHiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai."

    smtp_host = settings.SMTP_HOST
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM or smtp_user

    if smtp_host and smtp_user and smtp_password and smtp_from:
        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = f"YAG Platform <{smtp_from}>"
            msg["To"] = email

            with smtplib.SMTP_SSL(
                smtp_host, settings.SMTP_PORT, timeout=5.0
            ) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, email, msg.as_string())
            logger.info(f"Verification OTP successfully sent via SMTP to {email}")
        except Exception as e:
            logger.error(f"Failed to send verification email via SMTP: {e}.")
    else:
        logger.info(f"SMTP credentials not configured; Verification OTP for {email} is: {otp}")


class AuthService:
    @staticmethod
    def register(db: Session, user_in: UserRegister) -> User:
        """Atomically registers a new User and creates their corresponding Profile."""
        # 1. Check if email already registered
        existing_email = db.query(User).filter(User.email == user_in.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="EMAIL_EXISTS"
            )

        # 2. Check if username already registered
        existing_username = (
            db.query(User).filter(User.username == user_in.username).first()
        )
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="USERNAME_EXISTS"
            )

        # 3. Create User & Profile atomically
        try:
            db_user = User(
                id=uuid.uuid4(),
                username=user_in.username,
                email=user_in.email,
                password_hash=get_password_hash(user_in.password),
                role="reader",
            )
            db.add(db_user)
            db.flush()  # Populates db_user.id for profile matching

            db_profile = Profile(
                user_id=db_user.id, display_name=db_user.username, reputation_score=100
            )
            db.add(db_profile)
            db.commit()
            db.refresh(db_user)
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to register user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="DANG_KY_THAT_BAI",
            )

    @staticmethod
    def login(db: Session, login_in: UserLogin) -> User:
        """Verifies credentials mapping email/username against PostgreSQL."""
        identifier = login_in.email.strip().lower()
        _check_login_lock(identifier)

        # 1. Locate user via email or username
        db_user = (
            db.query(User)
            .filter((User.email == login_in.email) | (User.username == login_in.email))
            .first()
        )

        if not db_user:
            _record_login_failure(identifier)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_CREDENTIALS"
            )

        # 2. Verify hashed password
        if not verify_password(login_in.password, db_user.password_hash):
            _record_login_failure(identifier)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_CREDENTIALS"
            )

        if not db_user.email_verified_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="EMAIL_NOT_VERIFIED"
            )

        if db_user.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_LOCKED",
            )

        db_user.last_login_at = datetime.now(timezone.utc)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        _clear_login_failures(identifier)
        return db_user

    @staticmethod
    def request_password_reset(
        db: Session, email: str, background_tasks: BackgroundTasks
    ) -> dict:
        """Generates a 6-digit OTP, caches in Redis, and dispatches an email background task."""
        # Check if email exists in database
        db_user = db.query(User).filter(User.email == email).first()

        # We always return 200 message to prevent account harvesting
        response_msg = {"message": "Email khôi phục đã được gửi nếu tài khoản tồn tại"}
        if not db_user:
            return response_msg

        # Generate 6-digit numeric OTP
        otp = f"{random.randint(100000, 999999)}"

        # Save in Redis with 5 minutes (300 seconds) expiration
        try:
            r = get_redis_client()
            r.setex(_otp_cache_key(email), OTP_TTL_SECONDS, _hash_otp(email, otp))
        except Exception as e:
            logger.error(f"Redis is offline, cannot store OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="REDIS_OFFLINE_ERROR"
            )

        # Dispatch background mail sending
        background_tasks.add_task(send_otp_email, email, otp)
        return response_msg

    @staticmethod
    def confirm_password_reset(db: Session, confirm_in: PasswordResetConfirm) -> dict:
        """Validates the reset OTP against the Redis cache and updates the user's password."""
        # 1. Fetch OTP from Redis
        try:
            r = get_redis_client()
            cached_otp = r.get(_otp_cache_key(confirm_in.email))
        except Exception as e:
            logger.error(f"Redis is offline, cannot confirm OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="REDIS_OFFLINE_ERROR"
            )

        # 2. Match OTP
        if not _otp_matches(confirm_in.email, confirm_in.otp, cached_otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_OTP"
            )

        # 3. Update PostgreSQL
        db_user = db.query(User).filter(User.email == confirm_in.email).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND"
            )

        try:
            db_user.password_hash = get_password_hash(confirm_in.new_password)
            db.add(db_user)
            db.commit()

            # Delete OTP from Redis immediately to prevent reuse
            r.delete(_otp_cache_key(confirm_in.email))
            return {"message": "Mật khẩu đã được cập nhật"}
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to reset password: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="RESET_THAT_BAI",
            )

    @staticmethod
    def request_register_otp(email: str, background_tasks: BackgroundTasks) -> dict:
        """Generates a 6-digit OTP, caches in Redis under verify_email:otp:{email}, and sends a background email."""
        # Generate 6-digit numeric OTP
        otp = f"{random.randint(100000, 999999)}"

        # Save in Redis with 5 minutes (300 seconds) expiration
        try:
            r = get_redis_client()
            r.setex(
                f"verify_email:otp:{email.strip().lower()}",
                OTP_TTL_SECONDS,
                _hash_otp(email, otp)
            )
        except Exception as e:
            logger.error(f"Redis is offline, cannot store verification OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="REDIS_OFFLINE_ERROR"
            )

        # Dispatch background mail sending
        background_tasks.add_task(send_verification_email, email, otp)
        return {"message": "VERIFICATION_PENDING", "email": email}

    @staticmethod
    def verify_register_otp(db: Session, email: str, otp: str) -> User:
        """Validates the registration OTP from Redis, updates email_verified_at in DB, and returns the verified user."""
        email_key = f"verify_email:otp:{email.strip().lower()}"
        
        # 1. Fetch OTP from Redis
        try:
            r = get_redis_client()
            cached_otp = r.get(email_key)
        except Exception as e:
            logger.error(f"Redis is offline, cannot confirm verification OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="REDIS_OFFLINE_ERROR"
            )

        # 2. Match OTP
        if not _otp_matches(email, otp, cached_otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_OTP"
            )

        # 3. Update PostgreSQL
        db_user = db.query(User).filter(User.email == email).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND"
            )

        if db_user.email_verified_at is not None:
            return db_user

        try:
            db_user.email_verified_at = datetime.now(timezone.utc)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

            # Delete OTP from Redis immediately to prevent reuse
            r.delete(email_key)
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to verify email: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="VERIFY_THAT_BAI",
            )

