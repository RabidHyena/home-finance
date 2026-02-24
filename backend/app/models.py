from sqlalchemy import Column, Index, Integer, String, Numeric, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User account for authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    transactions = relationship("Transaction", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    category_corrections = relationship("CategoryCorrection", back_populates="user")
    merchant_mappings = relationship("MerchantCategoryMapping", back_populates="user")


class Transaction(Base):
    """Model for financial transactions."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    currency = Column(String(3), nullable=False, default='RUB')
    type = Column(String(10), nullable=False, default='expense', index=True)
    image_path = Column(String(500), nullable=True)
    raw_text = Column(Text, nullable=True)
    ai_category = Column(String(100), nullable=True)  # Original AI prediction
    ai_confidence = Column(Numeric(3, 2), nullable=True)  # AI confidence 0.00-1.00
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="transactions")

    __table_args__ = (
        Index('ix_tx_user_date', 'user_id', 'date'),
        Index('ix_tx_user_category', 'user_id', 'category'),
        Index('ix_tx_user_type_date', 'user_id', 'type', 'date'),
    )

    def __repr__(self):
        return f"<Transaction(id={self.id}, amount={self.amount}, description={self.description})>"


class CategoryCorrection(Base):
    """Log of user category corrections for learning."""
    __tablename__ = "category_corrections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False)
    original_category = Column(String(100), nullable=False)  # AI suggestion
    corrected_category = Column(String(100), nullable=False)  # User choice
    confidence = Column(Numeric(3, 2), nullable=False)  # Original AI confidence
    merchant_normalized = Column(String(500), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="category_corrections")


class MerchantCategoryMapping(Base):
    """Learned merchant-to-category mappings."""
    __tablename__ = "merchant_category_mappings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    merchant_normalized = Column(String(500), nullable=False, index=True)
    learned_category = Column(String(100), nullable=False)
    correction_count = Column(Integer, default=1)  # How many times corrected
    confidence = Column(Numeric(3, 2), nullable=False)  # Agreement rate
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="merchant_mappings")

    __table_args__ = (
        UniqueConstraint('user_id', 'merchant_normalized', name='uq_user_merchant'),
    )


class Budget(Base):
    """Budget limits for categories."""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    limit_amount = Column(Numeric(12, 2), nullable=False)
    period = Column(String(20), default='monthly')  # monthly, weekly
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint('user_id', 'category', name='uq_user_budget_category'),
    )
