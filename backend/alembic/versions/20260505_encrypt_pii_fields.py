"""encrypt raw_text and image_path PII fields

Revision ID: encrypt_pii_fields
Revises: add_password_reset_tokens
Create Date: 2026-05-05 11:00:00.000000
"""
import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'encrypt_pii_fields'
down_revision: Union[str, None] = 'add_password_reset_tokens'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_fernet():
    from base64 import urlsafe_b64encode
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF

    secret_key = os.environ.get("SECRET_KEY", "change-me-in-production")
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"home-finance-pii-v1",
        info=b"field-encryption",
    )
    key = urlsafe_b64encode(hkdf.derive(secret_key.encode()))
    return Fernet(key)


def _looks_encrypted(value: str) -> bool:
    """Fernet tokens start with 'gAAAAA' (base64 of version byte 0x80)."""
    return value.startswith("gAAAAA")


def upgrade() -> None:
    conn = op.get_bind()
    f = _get_fernet()

    rows = conn.execute(sa.text(
        "SELECT id, raw_text, image_path FROM transactions "
        "WHERE raw_text IS NOT NULL OR image_path IS NOT NULL"
    )).fetchall()

    for row in rows:
        updates: dict = {}
        if row.raw_text and not _looks_encrypted(row.raw_text):
            updates['raw_text'] = f.encrypt(row.raw_text.encode()).decode()
        if row.image_path and not _looks_encrypted(row.image_path):
            updates['image_path'] = f.encrypt(row.image_path.encode()).decode()
        if updates:
            set_clause = ', '.join(f"{k} = :{k}" for k in updates)
            conn.execute(
                sa.text(f"UPDATE transactions SET {set_clause} WHERE id = :id"),
                {**updates, 'id': row.id},
            )


def downgrade() -> None:
    """Decrypt fields back to plaintext."""
    conn = op.get_bind()
    f = _get_fernet()

    rows = conn.execute(sa.text(
        "SELECT id, raw_text, image_path FROM transactions "
        "WHERE raw_text IS NOT NULL OR image_path IS NOT NULL"
    )).fetchall()

    for row in rows:
        updates: dict = {}
        if row.raw_text and _looks_encrypted(row.raw_text):
            updates['raw_text'] = f.decrypt(row.raw_text.encode()).decode()
        if row.image_path and _looks_encrypted(row.image_path):
            updates['image_path'] = f.decrypt(row.image_path.encode()).decode()
        if updates:
            set_clause = ', '.join(f"{k} = :{k}" for k in updates)
            conn.execute(
                sa.text(f"UPDATE transactions SET {set_clause} WHERE id = :id"),
                {**updates, 'id': row.id},
            )
