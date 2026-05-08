"""Unit tests for the email service."""

from unittest.mock import MagicMock, patch

from app.services.email_service import send_password_reset_email

SMTP_KWARGS = dict(
    to_email="user@example.com",
    reset_token="tok123",
    username="testuser",
    smtp_host="smtp.example.com",
    smtp_port=587,
    smtp_user="sender@example.com",
    smtp_password="secret",
    smtp_from="sender@example.com",
    smtp_tls=True,
    frontend_url="http://localhost:3000",
)


def _make_smtp_mock():
    """Return a context-manager-compatible SMTP mock."""
    mock_server = MagicMock()
    mock_cls = MagicMock()
    mock_cls.return_value.__enter__ = MagicMock(return_value=mock_server)
    mock_cls.return_value.__exit__ = MagicMock(return_value=False)
    return mock_cls, mock_server


class TestEmailServiceNoConfig:
    def test_returns_false_when_smtp_host_empty(self):
        result = send_password_reset_email(
            **{**SMTP_KWARGS, "smtp_host": "", "smtp_from": ""},
        )
        assert result is False

    def test_returns_false_when_smtp_from_empty(self):
        result = send_password_reset_email(
            **{**SMTP_KWARGS, "smtp_from": ""},
        )
        assert result is False

    def test_no_smtp_call_when_not_configured(self):
        with patch("app.services.email_service.smtplib.SMTP") as mock_cls:
            send_password_reset_email(**{**SMTP_KWARGS, "smtp_host": ""})
            mock_cls.assert_not_called()


class TestEmailServiceSend:
    def test_returns_true_on_success(self):
        mock_cls, _ = _make_smtp_mock()
        with patch("app.services.email_service.smtplib.SMTP", mock_cls):
            result = send_password_reset_email(**SMTP_KWARGS)
        assert result is True

    def test_sendmail_called_once(self):
        mock_cls, mock_server = _make_smtp_mock()
        with patch("app.services.email_service.smtplib.SMTP", mock_cls):
            send_password_reset_email(**SMTP_KWARGS)
        mock_server.sendmail.assert_called_once()

    def test_reset_url_in_message_body(self):
        captured = {}

        def capture_sendmail(from_addr, to_addrs, msg_str):
            captured["msg"] = msg_str

        mock_cls, mock_server = _make_smtp_mock()
        mock_server.sendmail.side_effect = capture_sendmail

        with patch("app.services.email_service.smtplib.SMTP", mock_cls):
            send_password_reset_email(**SMTP_KWARGS)

        # MIME parts are base64-encoded; decode each part and search there
        import email as _email
        parsed = _email.message_from_string(captured["msg"])
        body_text = "\n".join(
            part.get_payload(decode=True).decode("utf-8", errors="replace")
            for part in parsed.walk()
            if part.get_payload(decode=True)
        )
        assert "tok123" in body_text
        assert "http://localhost:3000/reset-password" in body_text

    def test_frontend_url_trailing_slash_stripped(self):
        captured = {}

        def capture_sendmail(from_addr, to_addrs, msg_str):
            captured["msg"] = msg_str

        mock_cls, mock_server = _make_smtp_mock()
        mock_server.sendmail.side_effect = capture_sendmail

        with patch("app.services.email_service.smtplib.SMTP", mock_cls):
            send_password_reset_email(**{**SMTP_KWARGS, "frontend_url": "http://localhost:3000/"})

        import email as _email
        parsed = _email.message_from_string(captured["msg"])
        body_text = "\n".join(
            part.get_payload(decode=True).decode("utf-8", errors="replace")
            for part in parsed.walk()
            if part.get_payload(decode=True)
        )
        assert "http://localhost:3000/reset-password" in body_text
        assert "//reset-password" not in body_text

    def test_starttls_called_when_tls_enabled(self):
        mock_cls, mock_server = _make_smtp_mock()
        with patch("app.services.email_service.smtplib.SMTP", mock_cls):
            with patch("app.services.email_service.ssl.create_default_context"):
                send_password_reset_email(**SMTP_KWARGS)
        mock_server.starttls.assert_called_once()

    def test_login_called_with_credentials(self):
        mock_cls, mock_server = _make_smtp_mock()
        with patch("app.services.email_service.smtplib.SMTP", mock_cls):
            send_password_reset_email(**SMTP_KWARGS)
        mock_server.login.assert_called_once_with("sender@example.com", "secret")

    def test_login_skipped_when_no_credentials(self):
        mock_cls, mock_server = _make_smtp_mock()
        with patch("app.services.email_service.smtplib.SMTP", mock_cls):
            send_password_reset_email(**{**SMTP_KWARGS, "smtp_user": "", "smtp_password": ""})
        mock_server.login.assert_not_called()


class TestEmailServiceFailure:
    def test_returns_false_on_smtp_error(self):
        with patch("app.services.email_service.smtplib.SMTP", side_effect=Exception("refused")):
            result = send_password_reset_email(**SMTP_KWARGS)
        assert result is False

    def test_never_raises_on_any_exception(self):
        with patch("app.services.email_service.smtplib.SMTP", side_effect=RuntimeError("boom")):
            # Must not raise
            send_password_reset_email(**SMTP_KWARGS)
