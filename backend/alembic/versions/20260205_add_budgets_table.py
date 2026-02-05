"""add budgets table

Revision ID: add_budgets_table
Revises: 8f5a2c1b9e4d
Create Date: 2026-02-05 08:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_budgets_table'
down_revision: Union[str, None] = '8f5a2c1b9e4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'budgets' not in inspector.get_table_names():
        op.create_table(
            'budgets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('category', sa.String(length=100), nullable=False),
            sa.Column('limit_amount', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('period', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('category')
        )
        op.create_index(op.f('ix_budgets_id'), 'budgets', ['id'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'budgets' in inspector.get_table_names():
        op.drop_index(op.f('ix_budgets_id'), table_name='budgets')
        op.drop_table('budgets')
