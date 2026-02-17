"""add_transaction_type

Revision ID: add_transaction_type
Revises: 21b16e06d53d
Create Date: 2026-02-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_transaction_type'
down_revision: Union[str, None] = '21b16e06d53d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    columns = [c['name'] for c in inspector.get_columns('transactions')]
    if 'type' not in columns:
        op.add_column('transactions',
            sa.Column('type', sa.String(10), nullable=False, server_default='expense')
        )
        # Backfill existing rows
        op.execute("UPDATE transactions SET type = 'expense' WHERE type IS NULL")
        # Add index
        op.create_index('ix_transactions_type', 'transactions', ['type'])
        # Remove server default after backfill
        op.alter_column('transactions', 'type', server_default=None)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('transactions')]
    if 'type' in columns:
        op.drop_index('ix_transactions_type', table_name='transactions')
        op.drop_column('transactions', 'type')
