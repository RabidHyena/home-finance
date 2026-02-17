import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Transaction, CategoryCorrection, MerchantCategoryMapping
from app.services.merchant_normalization import normalize_merchant_name

logger = logging.getLogger(__name__)


def log_correction(db: Session, transaction: Transaction, user_id: int):
    """Log category correction for learning."""
    if not transaction.ai_category or transaction.ai_category == transaction.category:
        return  # No correction to log

    merchant = normalize_merchant_name(transaction.description)

    # Create correction log
    correction = CategoryCorrection(
        user_id=user_id,
        transaction_id=transaction.id,
        original_category=transaction.ai_category,
        corrected_category=transaction.category,
        confidence=transaction.ai_confidence or Decimal('0.5'),
        merchant_normalized=merchant
    )
    db.add(correction)
    db.flush()

    # Update merchant mapping
    _update_merchant_mapping(db, merchant, transaction.category, user_id)


def _update_merchant_mapping(db: Session, merchant: str, category: str, user_id: int):
    """Update or create merchant-category mapping if threshold met."""
    # Count corrections for this merchant → category
    category_count = db.query(CategoryCorrection).filter_by(
        user_id=user_id,
        merchant_normalized=merchant,
        corrected_category=category
    ).count()

    total_count = db.query(CategoryCorrection).filter_by(
        user_id=user_id,
        merchant_normalized=merchant
    ).count()

    # Require: 3+ corrections AND 70%+ agreement
    if category_count >= 3 and (category_count / total_count) >= 0.7:
        confidence = Decimal(str(min(0.95, category_count / total_count)))

        mapping = db.query(MerchantCategoryMapping).filter_by(
            user_id=user_id,
            merchant_normalized=merchant
        ).first()

        if mapping:
            mapping.learned_category = category
            mapping.correction_count = category_count
            mapping.confidence = confidence
        else:
            mapping = MerchantCategoryMapping(
                user_id=user_id,
                merchant_normalized=merchant,
                learned_category=category,
                correction_count=category_count,
                confidence=confidence
            )
            db.add(mapping)


def get_learned_category(db: Session, description: str, user_id: int) -> tuple[str, Decimal] | None:
    """Get learned category for merchant if available."""
    merchant = normalize_merchant_name(description)
    mapping = db.query(MerchantCategoryMapping).filter_by(
        user_id=user_id,
        merchant_normalized=merchant
    ).first()

    if mapping:
        return (mapping.learned_category, mapping.confidence)
    return None


def apply_learned_category(
    db: Optional[Session],
    user_id: Optional[int],
    description: str,
    category: str,
    confidence: float,
) -> tuple[str, float]:
    """Override category with learned mapping if available and more confident."""
    if not db or not user_id:
        return category, confidence

    learned = get_learned_category(db, description, user_id)
    if learned:
        learned_category, learned_confidence = learned
        if float(learned_confidence) > confidence:
            logger.debug(
                "Overriding category '%s' (%.2f) with learned '%s' (%.2f) for '%s'",
                category, confidence, learned_category, float(learned_confidence), description,
            )
            return learned_category, float(learned_confidence)

    return category, confidence
