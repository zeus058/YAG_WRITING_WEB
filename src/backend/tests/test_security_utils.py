from datetime import timedelta
from jose import jwt
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    ALGORITHM,
)


def test_password_hashing():
    password = "secret_password"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_verify_password_exception():
    # Should catch exceptions (e.g. invalid hash formats) and return False
    assert verify_password("plain", "not-a-bcrypt-hash") is False
    assert verify_password("plain", None) is False


def test_access_tokens():
    sub = "user_id_123"
    token = create_access_token(sub)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == sub

    # Test with expires_delta
    token_with_delta = create_access_token(sub, expires_delta=timedelta(minutes=5))
    decoded_delta = jwt.decode(token_with_delta, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded_delta["sub"] == sub
