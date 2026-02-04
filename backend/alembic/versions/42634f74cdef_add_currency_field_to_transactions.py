"""add_currency_field_to_transactions

Revision ID: 42634f74cdef
Revises: 
Create Date: 2026-02-04 23:18:03.228990

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42634f74cdef'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add currency column with default value for existing rows
    op.add_column('transactions',
        sa.Column('currency', sa.String(3), nullable=False, server_default='RUB')
    )
    # Remove server_default after backfill (default is now in model)
    op.alter_column('transactions', 'currency', server_default=None)


def downgrade() -> None:
    # Remove currency column
    op.drop_column('transactions', 'currency')
