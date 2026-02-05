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
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Create transactions table if it doesn't exist (initial setup)
    if 'transactions' not in inspector.get_table_names():
        op.create_table(
            'transactions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('description', sa.String(length=500), nullable=False),
            sa.Column('category', sa.String(length=100), nullable=True),
            sa.Column('date', sa.DateTime(), nullable=False),
            sa.Column('image_path', sa.String(length=500), nullable=True),
            sa.Column('raw_text', sa.Text(), nullable=True),
            sa.Column('currency', sa.String(3), nullable=False, server_default='RUB'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)
        return

    # Add currency column if it doesn't exist
    columns = [c['name'] for c in inspector.get_columns('transactions')]
    if 'currency' not in columns:
        op.add_column('transactions',
            sa.Column('currency', sa.String(3), nullable=False, server_default='RUB')
        )
        op.alter_column('transactions', 'currency', server_default=None)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('transactions')]
    if 'currency' in columns:
        op.drop_column('transactions', 'currency')
