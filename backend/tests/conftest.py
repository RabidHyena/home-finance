import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import User
from app.services.auth_service import create_access_token
import bcrypt
from app.config import get_settings

# Shared in-memory SQLite for all tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after."""
    # Clear auth state and caches before each test
    from app.routers.auth import _failed_logins, _failed_logins_lock, _auth_limiter
    with _failed_logins_lock:
        _failed_logins.clear()
    _auth_limiter.clear()
    from app.cache import analytics_cache
    analytics_cache.clear()

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Unauthenticated test client fixture."""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create a test user in the database."""
    db = TestingSessionLocal()
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode('utf-8'),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def auth_client(test_user):
    """Test client with JWT cookie set for authentication."""
    settings = get_settings()
    token = create_access_token(test_user.id)
    client = TestClient(app)
    client.cookies.set(settings.cookie_name, token)
    return client


@pytest.fixture
def second_user():
    """Create a second test user for data isolation tests."""
    db = TestingSessionLocal()
    user = User(
        email="second@example.com",
        username="seconduser",
        hashed_password=bcrypt.hashpw(b"password456", bcrypt.gensalt()).decode('utf-8'),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def second_auth_client(second_user):
    """Test client authenticated as second user."""
    settings = get_settings()
    token = create_access_token(second_user.id)
    client = TestClient(app)
    client.cookies.set(settings.cookie_name, token)
    return client
