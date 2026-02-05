from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import Transaction, CategoryCorrection, MerchantCategoryMapping
from app.services.merchant_normalization import normalize_merchant_name


def normalize_merchant(description: str) -> str:
    """Normalize merchant name for pattern matching."""
    return normalize_merchant_name(description)


def log_correction(db: Session, transaction: Transaction):
    """Log category correction for learning."""
    if not transaction.ai_category or transaction.ai_category == transaction.category:
        return  # No correction to log

    merchant = normalize_merchant(transaction.description)

    # Create correction log
    correction = CategoryCorrection(
        transaction_id=transaction.id,
        original_category=transaction.ai_category,
        corrected_category=transaction.category,
        confidence=transaction.ai_confidence or Decimal('0.5'),
        merchant_normalized=merchant
    )
    db.add(correction)
    db.flush()

    # Update merchant mapping
    _update_merchant_mapping(db, merchant, transaction.category)


def _update_merchant_mapping(db: Session, merchant: str, category: str):
    """Update or create merchant-category mapping if threshold met."""
    # Count corrections for this merchant → category
    category_count = db.query(CategoryCorrection).filter_by(
        merchant_normalized=merchant,
        corrected_category=category
    ).count()

    total_count = db.query(CategoryCorrection).filter_by(
        merchant_normalized=merchant
    ).count()

    # Require: 3+ corrections AND 70%+ agreement
    if category_count >= 3 and (category_count / total_count) >= 0.7:
        confidence = Decimal(str(min(0.95, category_count / total_count)))

        mapping = db.query(MerchantCategoryMapping).filter_by(
            merchant_normalized=merchant
        ).first()

        if mapping:
            mapping.learned_category = category
            mapping.correction_count = category_count
            mapping.confidence = confidence
        else:
            mapping = MerchantCategoryMapping(
                merchant_normalized=merchant,
                learned_category=category,
                correction_count=category_count,
                confidence=confidence
            )
            db.add(mapping)


def get_learned_category(db: Session, description: str) -> tuple[str, Decimal] | None:
    """Get learned category for merchant if available."""
    merchant = normalize_merchant(description)
    mapping = db.query(MerchantCategoryMapping).filter_by(
        merchant_normalized=merchant
    ).first()

    if mapping:
        return (mapping.learned_category, mapping.confidence)
    return None
