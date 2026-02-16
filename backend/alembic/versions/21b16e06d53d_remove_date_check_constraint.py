"""remove_date_check_constraint

Revision ID: 21b16e06d53d
Revises: add_users_and_auth
Create Date: 2026-02-16 04:07:58.162749

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '21b16e06d53d'
down_revision: Union[str, None] = 'add_users_and_auth'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove CHECK constraint - validation now handled by Pydantic
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_constraint WHERE conname = 'check_transaction_date_range'"
    ))
    if result.fetchone():
        op.drop_constraint('check_transaction_date_range', 'transactions', type_='check')


def downgrade() -> None:
    # Recreate CHECK constraint
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_constraint WHERE conname = 'check_transaction_date_range'"
    ))
    if not result.fetchone():
        op.execute(
            sa.text(
                "ALTER TABLE transactions ADD CONSTRAINT check_transaction_date_range "
                "CHECK (EXTRACT(YEAR FROM date) >= 2000 AND EXTRACT(YEAR FROM date) <= 2100)"
            )
        )
