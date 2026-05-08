"""add audit_logs table

Revision ID: 20260508_add_audit_log
Revises: add_transaction_type
Create Date: 2026-05-08 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260508_add_audit_log'
down_revision: Union[str, None] = 'add_transaction_type'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'audit_logs' not in inspector.get_table_names():
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('resource_type', sa.String(length=50), nullable=True),
            sa.Column('resource_id', sa.Integer(), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('details', sa.String(length=500), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'])
        op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'])
        op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'])
        op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'])
        op.create_index('ix_audit_user_action', 'audit_logs', ['user_id', 'action'])


def downgrade() -> None:
    op.drop_index('ix_audit_user_action', table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_table('audit_logs')
