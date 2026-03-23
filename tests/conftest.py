"""
Pytest configuration for Worst Captcha tests.
"""

import pytest
from app import app


@pytest.fixture(autouse=True)
def setup_test_app():
    """Configure app for testing."""
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False  # Disable CSRF for testing
    # Disable rate limiting for tests by setting very high limits
    app.config["RATELIMIT_STORAGE_URI"] = "memory://"
    app.config["RATELIMIT_DEFAULT"] = "1000 per second"
    yield
