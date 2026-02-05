from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Transaction(Base):
    """Model for financial transactions."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=True)
    date = Column(DateTime, nullable=False)
    currency = Column(String(3), nullable=False, default='RUB')
    image_path = Column(String(500), nullable=True)
    raw_text = Column(Text, nullable=True)
    ai_category = Column(String(100), nullable=True)  # Original AI prediction
    ai_confidence = Column(Numeric(3, 2), nullable=True)  # AI confidence 0.00-1.00
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Transaction(id={self.id}, amount={self.amount}, description={self.description})>"


class CategoryCorrection(Base):
    """Log of user category corrections for learning."""
    __tablename__ = "category_corrections"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False)
    original_category = Column(String(100), nullable=False)  # AI suggestion
    corrected_category = Column(String(100), nullable=False)  # User choice
    confidence = Column(Numeric(3, 2), nullable=False)  # Original AI confidence
    merchant_normalized = Column(String(500), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class MerchantCategoryMapping(Base):
    """Learned merchant-to-category mappings."""
    __tablename__ = "merchant_category_mappings"

    id = Column(Integer, primary_key=True, index=True)
    merchant_normalized = Column(String(500), unique=True, nullable=False, index=True)
    learned_category = Column(String(100), nullable=False)
    correction_count = Column(Integer, default=1)  # How many times corrected
    confidence = Column(Numeric(3, 2), nullable=False)  # Agreement rate
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Budget(Base):
    """Budget limits for categories."""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False, unique=True)
    limit_amount = Column(Numeric(12, 2), nullable=False)
    period = Column(String(20), default='monthly')  # monthly, weekly
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
