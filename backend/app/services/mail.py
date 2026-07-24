from dataclasses import dataclass
from email.message import EmailMessage
import smtplib

from app.core.config import settings


@dataclass(frozen=True)
class MailResult:
    sent: bool
    error: str | None = None


def send_mail(to_email: str, subject: str, body: str) -> MailResult:
    if not settings.smtp_host:
        return MailResult(sent=True)

    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_tls:
                smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
    except Exception as exc:  # pragma: no cover - depende de proveedor externo
        return MailResult(sent=False, error=str(exc))

    return MailResult(sent=True)
