import pytest
from unittest.mock import MagicMock, patch
import importlib
from app.core import database


def test_database_get_db():
    gen = database.get_db()
    db = next(gen)
    assert db is not None
    try:
        next(gen)
    except StopIteration:
        pass


def test_database_url_configured():
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.DATABASE_URL = "postgresql://mock_user:mock_pass@mock_host/mock_db"
        mock_settings.DB_POOL_SIZE = 5
        mock_settings.DB_MAX_OVERFLOW = 10
        mock_settings.DB_POOL_TIMEOUT = 30
        mock_settings.DB_POOL_RECYCLE_SECONDS = 3600
        
        importlib.reload(database)
        assert database.DATABASE_URL == "postgresql://mock_user:mock_pass@mock_host/mock_db"
            
    # Restore original configuration
    importlib.reload(database)
