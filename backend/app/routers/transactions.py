from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, or_
from decimal import Decimal
from datetime import datetime
from typing import Optional
import csv
from io import StringIO

from app.database import get_db
from app.models import Transaction, MerchantCategoryMapping
from app.schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionList,
    MonthlyReport,
)
from app.services.learning_service import log_correction

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
):
    """Create a new transaction."""
    db_transaction = Transaction(
        amount=transaction.amount,
        description=transaction.description,
        category=transaction.category or "Other",
        date=transaction.date,
        currency=transaction.currency,
        image_path=transaction.image_path,
        raw_text=transaction.raw_text,
        ai_category=transaction.ai_category,
        ai_confidence=transaction.ai_confidence,
    )
    db.add(db_transaction)
    db.flush()  # Get ID before logging

    # Log correction if category was changed
    log_correction(db, db_transaction)

    db.commit()
    db.refresh(db_transaction)
    return db_transaction


@router.get("", response_model=TransactionList)
def get_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get paginated list of transactions."""
    query = db.query(Transaction)

    if category:
        query = query.filter(Transaction.category == category)
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.description.ilike(search_pattern),
                Transaction.raw_text.ilike(search_pattern)
            )
        )

    total = query.count()
    items = (
        query.order_by(Transaction.date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return TransactionList(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/export")
def export_transactions(
    category: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export transactions as CSV with filters."""
    # Build query with same filters as get_transactions
    query = db.query(Transaction).order_by(Transaction.date.desc())

    if category:
        query = query.filter(Transaction.category == category)
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.description.ilike(search_pattern),
                Transaction.raw_text.ilike(search_pattern)
            )
        )

    # Safety limit to prevent memory issues
    transactions = query.limit(10000).all()

    # Generate CSV
    output = StringIO()
    # Add BOM for Excel UTF-8 compatibility
    output.write('\ufeff')
    writer = csv.writer(output)

    # Header
    writer.writerow(['ID', 'Дата', 'Сумма', 'Валюта', 'Описание', 'Категория', 'Создано'])

    # Rows
    for tx in transactions:
        writer.writerow([
            tx.id,
            tx.date.isoformat(),
            float(tx.amount),
            tx.currency,
            tx.description,
            tx.category or '',
            tx.created_at.isoformat(),
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/reports/monthly", response_model=list[MonthlyReport])
def get_monthly_reports(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Get monthly spending reports."""
    query = db.query(
        extract("year", Transaction.date).label("year"),
        extract("month", Transaction.date).label("month"),
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).group_by(
        extract("year", Transaction.date),
        extract("month", Transaction.date),
    )

    if year:
        query = query.filter(extract("year", Transaction.date) == year)

    results = query.order_by(
        extract("year", Transaction.date).desc(),
        extract("month", Transaction.date).desc(),
    ).all()

    reports = []
    for row in results:
        # Get category breakdown for this month
        category_query = (
            db.query(
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
            )
            .filter(
                extract("year", Transaction.date) == int(row.year),
                extract("month", Transaction.date) == int(row.month),
            )
            .group_by(Transaction.category)
            .all()
        )

        by_category = {
            cat or "Uncategorized": Decimal(str(total))
            for cat, total in category_query
        }

        reports.append(
            MonthlyReport(
                year=int(row.year),
                month=int(row.month),
                total_amount=Decimal(str(row.total)),
                transaction_count=row.count,
                by_category=by_category,
            )
        )

    return reports


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    """Get a single transaction by ID."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    update_data: TransactionUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing transaction."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    """Delete a transaction."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()


@router.get("/analytics/ai-accuracy")
def get_ai_accuracy(db: Session = Depends(get_db)):
    """Get AI categorization accuracy metrics."""
    total = db.query(Transaction).filter(Transaction.ai_category.isnot(None)).count()
    correct = db.query(Transaction).filter(
        Transaction.ai_category.isnot(None),
        Transaction.ai_category == Transaction.category
    ).count()

    accuracy = (correct / total * 100) if total > 0 else 0

    return {
        "total_predictions": total,
        "correct_predictions": correct,
        "accuracy_percentage": round(accuracy, 2),
        "learned_merchants": db.query(MerchantCategoryMapping).count()
    }
