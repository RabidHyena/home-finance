"""add composite indexes for query optimization

Revision ID: add_composite_indexes
Revises: add_transaction_type
Create Date: 2026-02-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'add_composite_indexes'
down_revision: Union[str, None] = 'add_transaction_type'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_tx_user_date', 'transactions', ['user_id', 'date'])
    op.create_index('ix_tx_user_category', 'transactions', ['user_id', 'category'])
    op.create_index('ix_tx_user_type_date', 'transactions', ['user_id', 'type', 'date'])


def downgrade() -> None:
    op.drop_index('ix_tx_user_type_date', table_name='transactions')
    op.drop_index('ix_tx_user_category', table_name='transactions')
    op.drop_index('ix_tx_user_date', table_name='transactions')
