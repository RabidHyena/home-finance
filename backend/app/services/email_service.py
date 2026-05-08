import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_password_reset_email(
    to_email: str,
    reset_token: str,
    username: str,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    smtp_from: str,
    smtp_tls: bool,
    frontend_url: str,
) -> bool:
    """Send password reset email. Returns True on success, False on failure. Never raises."""
    if not smtp_host or not smtp_from:
        logger.info("SMTP not configured — skipping password reset email to %s", to_email)
        return False

    reset_url = f"{frontend_url.rstrip('/')}/reset-password?token={reset_token}"

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h2 style="color: #4f46e5; margin-top: 0;">Сброс пароля</h2>
    <p>Здравствуйте, <strong>{username}</strong>!</p>
    <p>Мы получили запрос на сброс пароля для вашего аккаунта Home Finance.</p>
    <p style="margin: 28px 0; text-align: center;">
      <a href="{reset_url}" style="background: #4f46e5; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
        Сбросить пароль
      </a>
    </p>
    <p style="color: #666; font-size: 0.875rem;">Ссылка действительна 1 час. Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #999; font-size: 0.75rem;">Если кнопка не работает, скопируйте и вставьте в браузер:<br>{reset_url}</p>
  </div>
</body>
</html>
"""
    text_body = f"Сброс пароля Home Finance\n\nПерейдите по ссылке: {reset_url}\n\nСсылка действительна 1 час."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Сброс пароля — Home Finance"
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if smtp_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls(context=context)
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, to_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, to_email, msg.as_string())
        logger.info("Password reset email sent to %s", to_email)
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False
