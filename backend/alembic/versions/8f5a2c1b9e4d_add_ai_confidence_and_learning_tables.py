"""add_ai_confidence_and_learning_tables

Revision ID: 8f5a2c1b9e4d
Revises: 42634f74cdef
Create Date: 2026-02-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f5a2c1b9e4d'
down_revision: Union[str, None] = '42634f74cdef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Add AI fields to transactions table
    columns = [c['name'] for c in inspector.get_columns('transactions')]
    if 'ai_category' not in columns:
        op.add_column('transactions',
            sa.Column('ai_category', sa.String(100), nullable=True)
        )
    if 'ai_confidence' not in columns:
        op.add_column('transactions',
            sa.Column('ai_confidence', sa.Numeric(3, 2), nullable=True)
        )

    # Create category_corrections table
    if 'category_corrections' not in tables:
        op.create_table(
            'category_corrections',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('transaction_id', sa.Integer(), nullable=False),
            sa.Column('original_category', sa.String(100), nullable=False),
            sa.Column('corrected_category', sa.String(100), nullable=False),
            sa.Column('confidence', sa.Numeric(3, 2), nullable=False),
            sa.Column('merchant_normalized', sa.String(500), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_category_corrections_id'), 'category_corrections', ['id'], unique=False)
        op.create_index(op.f('ix_category_corrections_merchant_normalized'), 'category_corrections', ['merchant_normalized'], unique=False)

    # Create merchant_category_mappings table
    if 'merchant_category_mappings' not in tables:
        op.create_table(
            'merchant_category_mappings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('merchant_normalized', sa.String(500), nullable=False),
            sa.Column('learned_category', sa.String(100), nullable=False),
            sa.Column('correction_count', sa.Integer(), nullable=True),
            sa.Column('confidence', sa.Numeric(3, 2), nullable=False),
            sa.Column('last_updated', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('merchant_normalized')
        )
        op.create_index(op.f('ix_merchant_category_mappings_id'), 'merchant_category_mappings', ['id'], unique=False)
        op.create_index(op.f('ix_merchant_category_mappings_merchant_normalized'), 'merchant_category_mappings', ['merchant_normalized'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'merchant_category_mappings' in tables:
        op.drop_index(op.f('ix_merchant_category_mappings_merchant_normalized'), table_name='merchant_category_mappings')
        op.drop_index(op.f('ix_merchant_category_mappings_id'), table_name='merchant_category_mappings')
        op.drop_table('merchant_category_mappings')

    if 'category_corrections' in tables:
        op.drop_index(op.f('ix_category_corrections_merchant_normalized'), table_name='category_corrections')
        op.drop_index(op.f('ix_category_corrections_id'), table_name='category_corrections')
        op.drop_table('category_corrections')

    columns = [c['name'] for c in inspector.get_columns('transactions')]
    if 'ai_confidence' in columns:
        op.drop_column('transactions', 'ai_confidence')
    if 'ai_category' in columns:
        op.drop_column('transactions', 'ai_category')
