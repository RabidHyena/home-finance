"""Tests for CSRF protection middleware."""
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import create_access_token
from app.config import get_settings


class TestCsrfEndpoint:
    def test_csrf_endpoint_returns_token(self, client):
        response = client.get("/api/auth/csrf")
        assert response.status_code == 200
        data = response.json()
        assert "csrf_token" in data
        assert len(data["csrf_token"]) == 64  # 32 bytes hex

    def test_csrf_endpoint_sets_non_httponly_cookie(self, client):
        response = client.get("/api/auth/csrf")
        assert "csrf_token" in response.cookies


class TestCsrfProtection:
    def test_authenticated_post_without_csrf_returns_403(self, test_user):
        settings = get_settings()
        token = create_access_token(test_user.id)
        c = TestClient(app)
        c.cookies.set(settings.cookie_name, token)
        response = c.post("/api/transactions", json={
            "amount": 100,
            "description": "test",
            "date": "2026-01-15T10:00:00",
        })
        assert response.status_code == 403
        assert "CSRF" in response.json()["detail"]

    def test_authenticated_post_with_mismatched_csrf_returns_403(self, test_user):
        settings = get_settings()
        token = create_access_token(test_user.id)
        c = TestClient(app, headers={"X-CSRF-Token": "attacker-token"})
        c.cookies.set(settings.cookie_name, token)
        c.cookies.set("csrf_token", "real-token")
        response = c.post("/api/transactions", json={
            "amount": 100,
            "description": "test",
            "date": "2026-01-15T10:00:00",
        })
        assert response.status_code == 403

    def test_authenticated_post_with_valid_csrf_succeeds(self, auth_client):
        response = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "test",
            "date": "2026-01-15T10:00:00",
        })
        assert response.status_code == 201

    def test_get_requests_do_not_require_csrf(self, test_user):
        settings = get_settings()
        token = create_access_token(test_user.id)
        c = TestClient(app)
        c.cookies.set(settings.cookie_name, token)
        response = c.get("/api/transactions")
        assert response.status_code == 200


class TestCsrfEndToEnd:
    def test_csrf_token_from_endpoint_satisfies_post(self, test_user):
        """Verify: GET /csrf issues a token that a subsequent POST accepts."""
        settings = get_settings()
        token = create_access_token(test_user.id)
        c = TestClient(app)
        c.cookies.set(settings.cookie_name, token)

        # Get real CSRF token from the endpoint
        csrf_response = c.get("/api/auth/csrf")
        assert csrf_response.status_code == 200
        csrf_token = csrf_response.json()["csrf_token"]
        assert csrf_token == c.cookies.get("csrf_token")

        # Use the token in a state-mutating request
        response = c.post(
            "/api/transactions",
            json={"amount": 50, "description": "e2e csrf test", "date": "2026-01-15T10:00:00"},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response.status_code == 201


class TestCsrfExemptions:
    def test_login_exempt_from_csrf(self, client, test_user):
        response = client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "password123",
        })
        assert response.status_code != 403

    def test_register_exempt_from_csrf(self, client):
        response = client.post("/api/auth/register", json={
            "email": "newcsrf@example.com",
            "username": "newcsrfuser",
            "password": "password123",
        })
        assert response.status_code != 403

    def test_health_endpoint_exempt_from_csrf(self, client):
        response = client.get("/health")
        assert response.status_code == 200
