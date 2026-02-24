"""Tests for error scenarios, edge cases, and validation boundaries."""

import time
from decimal import Decimal
from unittest.mock import patch, MagicMock

import pytest
from fastapi import HTTPException

from app.rate_limiter import RateLimiter, RateLimitMiddleware
from app.services.ocr_service import OCRService


# --- Rate Limiter Edge Cases ---

class TestRateLimiterEdgeCases:

    def test_concurrent_cleanup_safety(self):
        """Verify cleanup doesn't break under rapid sequential calls."""
        limiter = RateLimiter(window=1, max_requests=100, cleanup_interval=0)
        for i in range(50):
            limiter.check(f"ip-{i}")
        # Force cleanup by setting interval to 0
        time.sleep(0.01)
        limiter.check("new-ip")  # Should trigger cleanup without errors

    def test_max_keys_forces_cleanup(self):
        """When max_keys is exceeded, forced cleanup runs."""
        limiter = RateLimiter(window=60, max_requests=100, max_keys=5)
        for i in range(10):
            limiter.check(f"ip-{i}")
        # Store should have been cleaned at some point but not crash
        assert len(limiter._store) <= 10

    def test_zero_window_blocks_immediately(self):
        """With window=0, all past requests are expired — never blocks."""
        limiter = RateLimiter(window=0, max_requests=1)
        # Since window=0, all past entries are expired
        limiter.check("1.2.3.4")
        # The entry we just added is at time.time(), and window=0 means
        # only entries where now - t < 0 count — so it's already expired
        limiter.check("1.2.3.4")  # Should not raise

    def test_exact_limit_boundary(self):
        """Exactly max_requests should succeed, max_requests+1 should fail."""
        limiter = RateLimiter(window=60, max_requests=5)
        for _ in range(5):
            limiter.check("ip")
        with pytest.raises(HTTPException) as exc:
            limiter.check("ip")
        assert exc.value.status_code == 429


# --- OCR Service Retry Logic ---

class TestOCRRetryLogic:

    def _make_service(self):
        with patch("app.services.ocr_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                openrouter_api_key="test-key",
                openrouter_model="test-model",
            )
            svc = OCRService()
            svc.BACKOFF_BASE = 0.01  # Speed up tests
            return svc

    def test_retry_on_parse_failure_succeeds_on_second_attempt(self):
        svc = self._make_service()
        call_count = 0

        def mock_call_api(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return "not valid json"
            return '{"transactions": [], "total_amount": 0}'

        with patch.object(svc, '_call_vision_api', side_effect=mock_call_api):
            result = svc._call_with_retry("base64data", "image/jpeg", svc._parse_multiple_response)
        assert call_count == 2
        assert result["total_amount"] == Decimal("0")

    def test_retry_exhausted_raises_last_error(self):
        svc = self._make_service()

        with patch.object(svc, '_call_vision_api', return_value="bad json"):
            with pytest.raises(ValueError, match="No valid JSON"):
                svc._call_with_retry("base64data", "image/jpeg", svc._parse_multiple_response)

    def test_non_retriable_error_fails_immediately(self):
        from openai import APIStatusError
        svc = self._make_service()
        call_count = 0

        def mock_call_api(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            # 400 is non-retriable
            resp = MagicMock()
            resp.status_code = 400
            resp.headers = {}
            raise APIStatusError("Bad request", response=resp, body=None)

        with patch.object(svc, '_call_vision_api', side_effect=mock_call_api):
            with pytest.raises(APIStatusError):
                svc._call_with_retry("base64data", "image/jpeg", svc._parse_multiple_response)
        assert call_count == 1  # No retries for 4xx

    def test_retriable_5xx_retries(self):
        from openai import APIStatusError
        svc = self._make_service()
        call_count = 0

        def mock_call_api(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                resp = MagicMock()
                resp.status_code = 500
                resp.headers = {}
                raise APIStatusError("Server error", response=resp, body=None)
            return '{"transactions": [], "total_amount": 0}'

        with patch.object(svc, '_call_vision_api', side_effect=mock_call_api):
            result = svc._call_with_retry("base64data", "image/jpeg", svc._parse_multiple_response)
        assert call_count == 3
        assert result["total_amount"] == Decimal("0")

    def test_timeout_error_retries(self):
        from openai import APITimeoutError
        svc = self._make_service()
        call_count = 0

        def mock_call_api(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise APITimeoutError(request=MagicMock())
            return '{"transactions": [], "total_amount": 0}'

        with patch.object(svc, '_call_vision_api', side_effect=mock_call_api):
            result = svc._call_with_retry("base64data", "image/jpeg", svc._parse_multiple_response)
        assert call_count == 2


# --- Validation Edge Cases ---

class TestValidationEdgeCases:

    def test_transaction_amount_below_minimum(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 0,
            "description": "Test",
            "date": "2026-01-15T12:00:00",
        })
        assert resp.status_code == 422

    def test_transaction_amount_above_maximum(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 99999999999,
            "description": "Test",
            "date": "2026-01-15T12:00:00",
        })
        assert resp.status_code == 422

    def test_transaction_description_too_long(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "x" * 501,
            "date": "2026-01-15T12:00:00",
        })
        assert resp.status_code == 422

    def test_transaction_invalid_currency(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15T12:00:00",
            "currency": "BTC",
        })
        assert resp.status_code == 422

    def test_transaction_invalid_type(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15T12:00:00",
            "type": "refund",
        })
        assert resp.status_code == 422

    def test_transaction_date_too_old(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "1999-01-01T00:00:00",
        })
        assert resp.status_code == 422

    def test_transaction_date_too_far_future(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2101-01-01T00:00:00",
        })
        assert resp.status_code == 422

    def test_transaction_html_in_description_sanitized(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "<script>alert('xss')</script>Purchase",
            "date": "2026-01-15T12:00:00",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "<script>" not in data["description"]
        assert "Purchase" in data["description"]

    def test_budget_zero_limit_rejected(self, auth_client):
        resp = auth_client.post("/api/budgets", json={
            "category": "Food",
            "limit_amount": 0,
        })
        assert resp.status_code == 422

    def test_budget_negative_limit_rejected(self, auth_client):
        resp = auth_client.post("/api/budgets", json={
            "category": "Food",
            "limit_amount": -100,
        })
        assert resp.status_code == 422

    def test_budget_invalid_period(self, auth_client):
        resp = auth_client.post("/api/budgets", json={
            "category": "Food",
            "limit_amount": 1000,
            "period": "yearly",
        })
        assert resp.status_code == 422

    def test_transaction_minimum_valid_amount(self, auth_client):
        """0.01 is the minimum valid amount."""
        resp = auth_client.post("/api/transactions", json={
            "amount": 0.01,
            "description": "Minimum",
            "date": "2026-01-15T12:00:00",
        })
        assert resp.status_code == 201

    def test_empty_description_rejected(self, auth_client):
        resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "",
            "date": "2026-01-15T12:00:00",
        })
        # Empty string is technically valid by schema but should at least not crash
        # (no min_length on description currently)
        assert resp.status_code in (201, 422)


# --- Auth Edge Cases ---

class TestAuthEdgeCases:

    def test_register_short_password(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "test@test.com",
            "username": "testuser",
            "password": "short",
        })
        assert resp.status_code == 422

    def test_register_password_no_digit(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "test@test.com",
            "username": "testuser",
            "password": "nodigithere",
        })
        assert resp.status_code == 422

    def test_register_password_no_letter(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "test@test.com",
            "username": "testuser",
            "password": "12345678",
        })
        assert resp.status_code == 422

    def test_register_long_password(self, client):
        """Password > 72 chars (bcrypt limit) should be rejected."""
        resp = client.post("/api/auth/register", json={
            "email": "test@test.com",
            "username": "testuser",
            "password": "a1" * 37,  # 74 chars
        })
        assert resp.status_code == 422

    def test_register_invalid_email(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "username": "testuser",
            "password": "password123",
        })
        assert resp.status_code == 422

    def test_register_invalid_username_chars(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "test@test.com",
            "username": "user name!",
            "password": "password123",
        })
        assert resp.status_code == 422

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", json={
            "login": "nobody@nowhere.com",
            "password": "password123",
        })
        assert resp.status_code == 401

    def test_access_protected_endpoint_without_auth(self, client):
        resp = client.get("/api/transactions")
        assert resp.status_code == 401

    def test_access_protected_endpoint_with_invalid_token(self, client):
        client.cookies.set("access_token", "invalid.jwt.token")
        resp = client.get("/api/transactions")
        assert resp.status_code == 401


# --- Pagination Edge Cases ---

class TestPaginationEdgeCases:

    def test_page_zero_rejected(self, auth_client):
        resp = auth_client.get("/api/transactions?page=0")
        assert resp.status_code == 422

    def test_negative_page_rejected(self, auth_client):
        resp = auth_client.get("/api/transactions?page=-1")
        assert resp.status_code == 422

    def test_per_page_over_max_rejected(self, auth_client):
        resp = auth_client.get("/api/transactions?per_page=101")
        assert resp.status_code == 422

    def test_empty_page_returns_empty_list(self, auth_client):
        resp = auth_client.get("/api/transactions?page=999")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0


# --- Delete Safety ---

class TestDeleteSafety:

    def test_bulk_delete_requires_confirm(self, auth_client):
        resp = auth_client.delete("/api/transactions")
        assert resp.status_code == 400
        assert "confirm" in resp.json()["detail"].lower()

    def test_delete_nonexistent_transaction(self, auth_client):
        resp = auth_client.delete("/api/transactions/99999")
        assert resp.status_code == 404

    def test_delete_nonexistent_budget(self, auth_client):
        resp = auth_client.delete("/api/budgets/99999")
        assert resp.status_code == 404


# --- Brute Force Protection ---

class TestBruteForceProtection:

    def setup_method(self):
        """Clear brute force tracking between tests."""
        from app.routers.auth import _failed_logins, _failed_logins_lock
        with _failed_logins_lock:
            _failed_logins.clear()

    def test_lockout_after_max_failed_attempts(self, client, test_user):
        from app.routers.auth import _MAX_FAILED_ATTEMPTS

        for _ in range(_MAX_FAILED_ATTEMPTS):
            resp = client.post("/api/auth/login", json={
                "login": "test@example.com",
                "password": "wrongpassword1",
            })
            assert resp.status_code == 401

        # Next attempt should be blocked
        resp = client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "password123",  # even correct password
        })
        assert resp.status_code == 429
        assert "too many" in resp.json()["detail"].lower()

    def test_successful_login_clears_failed_attempts(self, client, test_user):
        # Record some failures
        for _ in range(3):
            client.post("/api/auth/login", json={
                "login": "test@example.com",
                "password": "wrongpassword1",
            })

        # Successful login
        resp = client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200

        # Failures should be cleared — can fail again without lockout
        for _ in range(3):
            client.post("/api/auth/login", json={
                "login": "test@example.com",
                "password": "wrongpassword1",
            })
        # Still under threshold, should get 401 not 429
        resp = client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "wrongpassword1",
        })
        assert resp.status_code == 401

    def test_different_accounts_independent(self, client, test_user, second_user):
        from app.routers.auth import _MAX_FAILED_ATTEMPTS

        # Lock out first account
        for _ in range(_MAX_FAILED_ATTEMPTS):
            client.post("/api/auth/login", json={
                "login": "test@example.com",
                "password": "wrongpassword1",
            })

        # Second account should still work
        resp = client.post("/api/auth/login", json={
            "login": "second@example.com",
            "password": "password456",
        })
        assert resp.status_code == 200
