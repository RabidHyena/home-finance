"""Tests for password reset flow."""


class TestForgotPassword:
    def test_forgot_password_returns_200_for_existing_email(self, client, test_user):
        response = client.post("/api/auth/forgot-password", json={
            "email": "test@example.com",
        })
        assert response.status_code == 200
        assert "message" in response.json()

    def test_forgot_password_returns_200_for_unknown_email(self, client):
        """Should not reveal whether email exists."""
        response = client.post("/api/auth/forgot-password", json={
            "email": "nobody@example.com",
        })
        assert response.status_code == 200

    def test_forgot_password_exposes_token_in_debug_mode(self, client, test_user):
        response = client.post("/api/auth/forgot-password", json={
            "email": "test@example.com",
        })
        data = response.json()
        assert "debug_token" in data
        assert len(data["debug_token"]) == 64  # 32 bytes hex


class TestResetPassword:
    def test_reset_password_with_valid_token_updates_password(self, client, test_user):
        # Get reset token
        forgot_resp = client.post("/api/auth/forgot-password", json={
            "email": "test@example.com",
        })
        token = forgot_resp.json()["debug_token"]

        # Reset password
        response = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "newpassword99",
        })
        assert response.status_code == 200

        # Old password no longer works
        old_login = client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "password123",
        })
        assert old_login.status_code == 401

        # New password works
        new_login = client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "newpassword99",
        })
        assert new_login.status_code == 200

    def test_reset_password_with_invalid_token_returns_400(self, client):
        response = client.post("/api/auth/reset-password", json={
            "token": "a" * 64,
            "new_password": "newpassword99",
        })
        assert response.status_code == 400

    def test_reset_token_can_only_be_used_once(self, client, test_user):
        forgot_resp = client.post("/api/auth/forgot-password", json={
            "email": "test@example.com",
        })
        token = forgot_resp.json()["debug_token"]

        # Use token once
        client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "newpassword99",
        })

        # Try to use it again
        response = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "anotherpassword1",
        })
        assert response.status_code == 400

    def test_new_forgot_password_invalidates_old_token(self, client, test_user):
        # Get first token
        first = client.post("/api/auth/forgot-password", json={"email": "test@example.com"})
        old_token = first.json()["debug_token"]

        # Get second token (should invalidate first)
        client.post("/api/auth/forgot-password", json={"email": "test@example.com"})

        # Old token should no longer work
        response = client.post("/api/auth/reset-password", json={
            "token": old_token,
            "new_password": "newpassword99",
        })
        assert response.status_code == 400
