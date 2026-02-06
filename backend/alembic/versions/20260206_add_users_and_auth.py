"""add users table and user_id to all models

Revision ID: add_users_and_auth
Revises: add_budgets_table
Create Date: 2026-02-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_users_and_auth'
down_revision: Union[str, None] = 'add_budgets_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Create users table
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('username', sa.String(length=100), nullable=False),
            sa.Column('hashed_password', sa.String(length=255), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
        op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 2. Seed default user for data migration (only if not exists)
    import bcrypt
    import os
    result = conn.execute(sa.text("SELECT id FROM users WHERE email = 'admin@example.com'"))
    default_user_id = result.scalar()

    if default_user_id is None:
        seed_password = os.environ.get("SEED_ADMIN_PASSWORD", "changeme")
        hashed = bcrypt.hashpw(seed_password.encode(), bcrypt.gensalt()).decode('utf-8')
        conn.execute(
            sa.text("INSERT INTO users (email, username, hashed_password) VALUES (:email, :username, :pw)"),
            {"email": "admin@example.com", "username": "admin", "pw": hashed}
        )
        result = conn.execute(sa.text("SELECT id FROM users WHERE email = 'admin@example.com'"))
        default_user_id = result.scalar()

    # 3. Add user_id columns as nullable first
    tables_to_update = ['transactions', 'category_corrections', 'merchant_category_mappings', 'budgets']
    for table in tables_to_update:
        if table in existing_tables:
            cols = [c['name'] for c in inspector.get_columns(table)]
            if 'user_id' not in cols:
                op.add_column(table, sa.Column('user_id', sa.Integer(), nullable=True))

    # 4. Backfill existing rows
    for table in tables_to_update:
        if table in existing_tables:
            conn.execute(
                sa.text(f"UPDATE {table} SET user_id = :uid WHERE user_id IS NULL"),
                {"uid": default_user_id}
            )

    # 5. Alter to NOT NULL + add FK + index
    for table in tables_to_update:
        if table in existing_tables:
            op.alter_column(table, 'user_id', nullable=False)
            op.create_foreign_key(
                f'fk_{table}_user_id', table, 'users', ['user_id'], ['id'], ondelete='CASCADE'
            )
            op.create_index(f'ix_{table}_user_id', table, ['user_id'], unique=False)

    # 6. Drop old unique constraints, create composite ones
    # Budget: drop unique on category, add (user_id, category)
    if 'budgets' in existing_tables:
        # Drop old unique constraint on category
        try:
            op.drop_constraint('budgets_category_key', 'budgets', type_='unique')
        except Exception:
            pass
        op.create_unique_constraint('uq_user_budget_category', 'budgets', ['user_id', 'category'])

    # MerchantCategoryMapping: drop unique on merchant_normalized, add (user_id, merchant_normalized)
    if 'merchant_category_mappings' in existing_tables:
        try:
            op.drop_constraint('merchant_category_mappings_merchant_normalized_key', 'merchant_category_mappings', type_='unique')
        except Exception:
            pass
        op.create_unique_constraint('uq_user_merchant', 'merchant_category_mappings', ['user_id', 'merchant_normalized'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Remove composite constraints, restore old ones
    if 'budgets' in existing_tables:
        try:
            op.drop_constraint('uq_user_budget_category', 'budgets', type_='unique')
        except Exception:
            pass
        op.create_unique_constraint('budgets_category_key', 'budgets', ['category'])

    if 'merchant_category_mappings' in existing_tables:
        try:
            op.drop_constraint('uq_user_merchant', 'merchant_category_mappings', type_='unique')
        except Exception:
            pass
        op.create_unique_constraint(
            'merchant_category_mappings_merchant_normalized_key',
            'merchant_category_mappings', ['merchant_normalized']
        )

    # Drop user_id from all tables
    tables = ['transactions', 'category_corrections', 'merchant_category_mappings', 'budgets']
    for table in tables:
        if table in existing_tables:
            try:
                op.drop_constraint(f'fk_{table}_user_id', table, type_='foreignkey')
            except Exception:
                pass
            try:
                op.drop_index(f'ix_{table}_user_id', table_name=table)
            except Exception:
                pass
            op.drop_column(table, 'user_id')

    # Drop users table
    if 'users' in existing_tables:
        op.drop_index(op.f('ix_users_username'), table_name='users')
        op.drop_index(op.f('ix_users_email'), table_name='users')
        op.drop_index(op.f('ix_users_id'), table_name='users')
        op.drop_table('users')
