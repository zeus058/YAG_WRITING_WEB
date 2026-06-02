import random
import smtplib
import logging
from email.mime.text import MIMEText
from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import redis

import uuid
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.profile import Profile
from app.schemas.auth import UserRegister, UserLogin, PasswordResetConfirm

logger = logging.getLogger("auth_service")

def get_redis_client():
    """Initializes and returns a Redis client."""
    # Use standard host and default port 6379
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=6379,
        db=0,
        decode_responses=True,
        socket_timeout=2.0
    )

def send_otp_email(email: str, otp: str):
    """Sends OTP email via SMTP or fallback logs to terminal."""
    subject = "[YAG] Yêu cầu khôi phục mật khẩu"
    body = f"Mã OTP khôi phục mật khẩu của bạn là: {otp}\nHiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai."
    
    # We always print to terminal first so local testing is extremely simple
    print(f"\n========================================================")
    print(f" GỬI EMAIL KHÔI PHỤC MẬT KHẨU CHO: {email}")
    print(f" MÃ OTP CỦA BẠN LÀ: {otp}")
    print(f"========================================================\n")
    
    # Get SMTP configs from environment if present, else fallback graceful
    import os
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if smtp_user and smtp_password:
        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = f"YAG Platform <{smtp_user}>"
            msg["To"] = email
            
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=5.0) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, email, msg.as_string())
            logger.info(f"OTP successfully sent via SMTP to {email}")
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}. Fallback console logging.")
    else:
        logger.info("SMTP credentials not configured. Email logged to console.")

class AuthService:
    @staticmethod
    def register(db: Session, user_in: UserRegister) -> User:
        """Atomically registers a new User and creates their corresponding Profile."""
        # 1. Check if email already registered
        existing_email = db.query(User).filter(User.email == user_in.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="EMAIL_EXISTS"
            )
            
        # 2. Check if username already registered
        existing_username = db.query(User).filter(User.username == user_in.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="USERNAME_EXISTS"
            )

        # 3. Create User & Profile atomically
        try:
            db_user = User(
                id=uuid.uuid4(),
                username=user_in.username,
                email=user_in.email,
                password_hash=get_password_hash(user_in.password),
                role=user_in.role or "reader",
            )
            db.add(db_user)
            db.flush()  # Populates db_user.id for profile matching
            
            db_profile = Profile(
                user_id=db_user.id,
                display_name=db_user.username,
                reputation_score=100
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
                detail="DANG_KY_THAT_BAI"
            )

    @staticmethod
    def login(db: Session, login_in: UserLogin) -> User:
        """Verifies credentials mapping email/username against PostgreSQL."""
        # 1. Locate user via email or username
        db_user = db.query(User).filter(
            (User.email == login_in.email) | (User.username == login_in.email)
        ).first()
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="INVALID_CREDENTIALS"
            )
            
        # 2. Verify hashed password
        if not verify_password(login_in.password, db_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="INVALID_CREDENTIALS"
            )
            
        return db_user

    @staticmethod
    def request_password_reset(db: Session, email: str, background_tasks: BackgroundTasks) -> dict:
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
            r.setex(f"otp:{email}", 300, otp)
        except Exception as e:
            logger.error(f"Redis is offline, cannot store OTP: {e}")
            # If Redis connection fails, we log the OTP directly so local dev is never blocked
            print(f"\n[REDIS OFFLINE FALLBACK] OTP for {email} is: {otp}\n")
            # We raise a graceful error since OTP won't be confirmable if Redis is offline
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="REDIS_OFFLINE_ERROR"
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
            cached_otp = r.get(f"otp:{confirm_in.email}")
        except Exception as e:
            logger.error(f"Redis is offline, cannot confirm OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="REDIS_OFFLINE_ERROR"
            )
            
        # 2. Match OTP
        if not cached_otp or cached_otp != confirm_in.otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INVALID_OTP"
            )

        # 3. Update PostgreSQL
        db_user = db.query(User).filter(User.email == confirm_in.email).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="USER_NOT_FOUND"
            )
            
        try:
            db_user.password_hash = get_password_hash(confirm_in.new_password)
            db.add(db_user)
            db.commit()
            
            # Delete OTP from Redis immediately to prevent reuse
            r.delete(f"otp:{confirm_in.email}")
            return {"message": "Mật khẩu đã được cập nhật"}
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to reset password: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="RESET_THAT_BAI"
            )
