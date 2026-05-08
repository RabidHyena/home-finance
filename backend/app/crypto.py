import logging
from base64 import urlsafe_b64encode
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy.types import Text, TypeDecorator

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    from app.config import get_settings
    settings = get_settings()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"home-finance-pii-v1",
        info=b"field-encryption",
    )
    key = urlsafe_b64encode(hkdf.derive(settings.secret_key.encode()))
    return Fernet(key)


class EncryptedText(TypeDecorator):
    """Transparently encrypts/decrypts text fields using Fernet symmetric encryption."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return _get_fernet().encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        # Fernet tokens always start with "gAAAAA" (base64 of version+IV prefix).
        # Values without this prefix are legacy plaintext stored before encryption.
        if not value.startswith("gAAAAA"):
            return value
        try:
            return _get_fernet().decrypt(value.encode()).decode()
        except (InvalidToken, Exception):
            logger.error("Failed to decrypt field value — key mismatch or corrupted data")
            return None
