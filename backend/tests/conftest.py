import os
import pytest
import bcrypt
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db
from app.models import User, PasswordResetToken  # noqa: F401 — needed for table creation
from app.services.auth_service import create_access_token
from app.config import get_settings

# Set by session-scoped fixture before any test runs
engine = None
TestingSessionLocal = None


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def _start_postgres():
    """
    Provide a PostgreSQL engine for the test session.

    If TEST_DATABASE_URL is set (CI / docker compose exec), connect directly.
    Otherwise spin up a temporary container via testcontainers (local dev, requires Docker).

    Tables are created once here and dropped at session end.
    Individual tests truncate via setup_database.
    """
    global engine, TestingSessionLocal

    test_db_url = os.getenv("TEST_DATABASE_URL")
    if test_db_url:
        engine = create_engine(test_db_url, poolclass=NullPool)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        yield
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
    else:
        from testcontainers.postgres import PostgresContainer
        with PostgresContainer("postgres:16-alpine") as pg:
            engine = create_engine(pg.get_connection_url(), poolclass=NullPool)
            TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            app.dependency_overrides[get_db] = override_get_db
            Base.metadata.create_all(bind=engine)
            yield
            Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture(autouse=True)
def setup_database():
    """Truncate all tables before each test for fast, lock-free isolation."""
    from app.routers.auth import _failed_logins, _failed_logins_lock, _auth_limiter
    with _failed_logins_lock:
        _failed_logins.clear()
    _auth_limiter.clear()
    from app.cache import analytics_cache
    analytics_cache.clear()

    table_names = ", ".join(
        f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables)
    )
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {table_names} RESTART IDENTITY CASCADE"))

    yield


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


_CSRF_TEST_TOKEN = "csrf-test-token-fixture-abcdef0123456789abcdef0123456789"


@pytest.fixture
def auth_client(test_user):
    """Test client with JWT cookie and CSRF token set for authentication."""
    settings = get_settings()
    token = create_access_token(test_user.id)
    client = TestClient(app, headers={"X-CSRF-Token": _CSRF_TEST_TOKEN})
    client.cookies.set(settings.cookie_name, token)
    client.cookies.set("csrf_token", _CSRF_TEST_TOKEN)
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
    """Test client authenticated as second user, with CSRF token."""
    settings = get_settings()
    token = create_access_token(second_user.id)
    client = TestClient(app, headers={"X-CSRF-Token": _CSRF_TEST_TOKEN})
    client.cookies.set(settings.cookie_name, token)
    client.cookies.set("csrf_token", _CSRF_TEST_TOKEN)
    return client
