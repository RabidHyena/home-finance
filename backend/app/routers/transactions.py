import csv
import logging
from datetime import datetime, timezone
from decimal import Decimal
from io import StringIO
from typing import Literal, Optional

from statistics import mean, pstdev
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func, extract, or_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.cache import analytics_cache, make_cache_key
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Transaction, MerchantCategoryMapping, User
from app.schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionList,
    MonthlyReport,
)
from app.services.learning_service import log_correction


def _invalidate_user_cache(user_id: int) -> None:
    """Invalidate all analytics caches for a user after data changes."""
    for prefix in ("reports", "forecast", "trends", "comparison"):
        analytics_cache.invalidate_prefix(f"{prefix}:u{user_id}:")

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _apply_filters(query, user_id: int, category=None, date_from=None, date_to=None, search=None, tx_type=None):
    """Apply common filters to a transaction query."""
    query = query.filter(Transaction.user_id == user_id)
    if tx_type:
        query = query.filter(Transaction.type == tx_type)
    if category:
        query = query.filter(Transaction.category == category)
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)
    if search:
        escaped = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        pattern = f"%{escaped}%"
        query = query.filter(
            or_(
                Transaction.description.ilike(pattern),
                Transaction.raw_text.ilike(pattern)
            )
        )
    return query


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new transaction."""
    db_transaction = Transaction(
        user_id=current_user.id,
        amount=transaction.amount,
        description=transaction.description,
        category=transaction.category or "Other",
        date=transaction.date,
        currency=transaction.currency,
        type=transaction.type,
        image_path=transaction.image_path,
        raw_text=transaction.raw_text,
        ai_category=transaction.ai_category,
        ai_confidence=transaction.ai_confidence,
    )
    db.add(db_transaction)
    db.flush()  # Get ID before logging

    # Log correction if category was changed
    log_correction(db, db_transaction, current_user.id)

    db.commit()
    db.refresh(db_transaction)
    _invalidate_user_cache(current_user.id)
    return db_transaction


@router.get("", response_model=TransactionList)
def get_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    type: Optional[Literal['expense', 'income']] = Query(None, description="Filter by type: expense or income"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated list of transactions."""
    base_query = _apply_filters(
        db.query(Transaction), current_user.id,
        category=category, date_from=date_from, date_to=date_to, search=search, tx_type=type,
    )

    # Single query: window function for total count + paginated rows
    count_col = func.count().over().label('_total')
    rows = (
        base_query.add_columns(count_col)
        .order_by(Transaction.date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    if rows:
        items = [row[0] for row in rows]
        total = rows[0][1]
    else:
        items = []
        # Window function returns nothing when offset is beyond data;
        # fall back to a COUNT query so total stays correct.
        total = base_query.count()

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
    type: Optional[Literal['expense', 'income']] = Query(None, description="Filter by type: expense or income"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export transactions as CSV with filters."""
    query = _apply_filters(
        db.query(Transaction), current_user.id,
        category=category, date_from=date_from, date_to=date_to, search=search, tx_type=type,
    ).order_by(Transaction.date.desc())

    def sanitize_csv_field(value: str) -> str:
        """Prevent CSV formula injection by prefixing dangerous characters."""
        if value and value[0] in ('=', '+', '-', '@', '\t', '\r'):
            return f"'{value}"
        return value

    def generate_csv():
        # BOM for Excel UTF-8 compatibility
        yield '\ufeff'

        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(['ID', 'Дата', 'Сумма', 'Валюта', 'Описание', 'Категория', 'Создано'])
        yield buf.getvalue()

        for tx in query.yield_per(500):
            buf = StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                tx.id,
                tx.date.isoformat(),
                float(tx.amount),
                tx.currency,
                sanitize_csv_field(tx.description),
                sanitize_csv_field(tx.category or ''),
                tx.created_at.isoformat(),
            ])
            yield buf.getvalue()

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=transactions_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/reports/monthly", response_model=list[MonthlyReport])
def get_monthly_reports(
    year: Optional[int] = None,
    type: Optional[Literal['expense', 'income']] = Query(None, description="Filter by type: expense or income"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly spending reports."""
    cache_key = make_cache_key("reports", current_user.id, year=year, type=type)
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    query = db.query(
        extract("year", Transaction.date).label("year"),
        extract("month", Transaction.date).label("month"),
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.user_id == current_user.id
    )

    if type:
        query = query.filter(Transaction.type == type)

    query = query.group_by(
        extract("year", Transaction.date),
        extract("month", Transaction.date),
    )

    if year:
        query = query.filter(extract("year", Transaction.date) == year)

    results = query.order_by(
        extract("year", Transaction.date).desc(),
        extract("month", Transaction.date).desc(),
    ).all()

    # Get all category breakdowns in a single query to avoid N+1
    category_results = db.query(
        extract("year", Transaction.date).label("year"),
        extract("month", Transaction.date).label("month"),
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
    ).filter(
        Transaction.user_id == current_user.id
    )

    if type:
        category_results = category_results.filter(Transaction.type == type)

    if year:
        category_results = category_results.filter(extract("year", Transaction.date) == year)

    category_results = category_results.group_by(
        extract("year", Transaction.date),
        extract("month", Transaction.date),
        Transaction.category,
    ).all()

    # Build lookup: (year, month) -> {category: total}
    category_lookup: dict[tuple[int, int], dict[str, Decimal]] = {}
    for cat_row in category_results:
        key = (int(cat_row.year), int(cat_row.month))
        if key not in category_lookup:
            category_lookup[key] = {}
        cat_name = cat_row.category or "Uncategorized"
        category_lookup[key][cat_name] = Decimal(str(cat_row.total))

    reports = []
    for row in results:
        key = (int(row.year), int(row.month))
        by_category = category_lookup.get(key, {})

        reports.append(
            MonthlyReport(
                year=int(row.year),
                month=int(row.month),
                total_amount=Decimal(str(row.total)),
                transaction_count=row.count,
                by_category=by_category,
            )
        )

    analytics_cache.set(cache_key, reports)
    return reports


@router.get("/analytics/ai-accuracy")
def get_ai_accuracy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI categorization accuracy metrics."""
    result = db.query(
        func.count().label('total'),
        func.count(case(
            (Transaction.ai_category == Transaction.category, 1),
        )).label('correct'),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.ai_category.isnot(None),
    ).first()

    total = result.total or 0
    correct = result.correct or 0
    accuracy = (correct / total * 100) if total > 0 else 0

    learned = db.query(func.count()).select_from(MerchantCategoryMapping).filter(
        MerchantCategoryMapping.user_id == current_user.id
    ).scalar()

    return {
        "total_predictions": total,
        "correct_predictions": correct,
        "accuracy_percentage": round(accuracy, 2),
        "learned_merchants": learned,
    }


@router.get("/analytics/forecast")
def get_spending_forecast(
    history_months: int = Query(6, ge=3, le=12),
    forecast_months: int = Query(3, ge=1, le=6),
    type: Optional[Literal['expense', 'income']] = Query(None, description="Filter by type: expense or income"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Forecast future spending based on historical data."""
    cache_key = make_cache_key("forecast", current_user.id,
                               history=history_months, forecast=forecast_months, type=type)
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    # Get historical data
    end_date = datetime.now(timezone.utc)
    start_date = end_date - relativedelta(months=history_months)

    # Aggregate by month in SQL instead of loading all transactions
    base_filter = [
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    ]
    if type:
        base_filter.append(Transaction.type == type)

    monthly_rows = db.query(
        extract("year", Transaction.date).label("year"),
        extract("month", Transaction.date).label("month"),
        func.sum(Transaction.amount).label("total"),
    ).filter(
        *base_filter
    ).group_by(
        extract("year", Transaction.date),
        extract("month", Transaction.date),
    ).all()

    monthly_data = {
        (int(row.year), int(row.month)): Decimal(str(row.total))
        for row in monthly_rows
    }

    # Create historical series
    historical = []
    current = start_date.replace(day=1)
    while current <= end_date:
        key = (current.year, current.month)
        total = monthly_data.get(key, Decimal('0'))
        historical.append({
            "year": current.year,
            "month": current.month,
            "amount": float(total),
            "is_forecast": False
        })
        current = current + relativedelta(months=1)

    # Calculate statistics
    amounts = [h["amount"] for h in historical if h["amount"] > 0]
    if not amounts:
        # No data to forecast
        return {
            "historical": historical,
            "forecast": [],
            "statistics": {
                "average": 0,
                "std_deviation": 0,
                "confidence_interval": {"min": 0, "max": 0}
            }
        }

    avg = float(mean(amounts))
    std = float(pstdev(amounts)) if len(amounts) > 1 else 0.0

    # Generate forecast (simple moving average)
    forecast = []
    current = end_date.replace(day=1) + relativedelta(months=1)
    for _ in range(forecast_months):
        # Use average as prediction
        predicted = avg

        # Confidence interval (±1 std deviation)
        min_val = max(0, predicted - std)
        max_val = predicted + std

        forecast.append({
            "year": current.year,
            "month": current.month,
            "amount": predicted,
            "is_forecast": True,
            "confidence_min": min_val,
            "confidence_max": max_val
        })
        current = current + relativedelta(months=1)

    result = {
        "historical": historical,
        "forecast": forecast,
        "statistics": {
            "average": avg,
            "std_deviation": std,
            "confidence_interval": {
                "min": float(max(0, avg - std)),
                "max": float(avg + std)
            }
        }
    }
    analytics_cache.set(cache_key, result)
    return result


@router.get("/analytics/trends")
def get_spending_trends(
    months: int = Query(6, ge=3, le=24),
    type: Optional[Literal['expense', 'income']] = Query(None, description="Filter by type: expense or income"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get spending trends for last N months."""
    cache_key = make_cache_key("trends", current_user.id, months=months, type=type)
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    # Calculate date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - relativedelta(months=months)

    # Aggregate by month in SQL
    base_filter = [
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    ]
    if type:
        base_filter.append(Transaction.type == type)

    monthly_rows = db.query(
        extract("year", Transaction.date).label("year"),
        extract("month", Transaction.date).label("month"),
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        *base_filter
    ).group_by(
        extract("year", Transaction.date),
        extract("month", Transaction.date),
    ).all()

    monthly_data = {
        (int(row.year), int(row.month)): {"total": Decimal(str(row.total)), "count": row.count}
        for row in monthly_rows
    }

    # Create series
    series = []
    current = start_date.replace(day=1)
    while current <= end_date:
        key = (current.year, current.month)
        data = monthly_data.get(key, {"total": Decimal('0'), "count": 0})
        series.append({
            "year": current.year,
            "month": current.month,
            "total": float(data["total"]),
            "count": data["count"]
        })
        current = current + relativedelta(months=1)

    # Calculate trend (linear regression)
    trend_line = []
    if len(series) >= 2:
        x = list(range(len(series)))
        y = [s["total"] for s in series]

        # Simple linear regression
        n = len(x)
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        sum_x2 = sum(xi * xi for xi in x)
        denom = n * sum_x2 - sum_x * sum_x
        if denom != 0:
            slope = (n * sum_xy - sum_x * sum_y) / denom
            intercept = (sum_y - slope * sum_x) / n
            trend_line = [float(slope * i + intercept) for i in range(n)]
        else:
            avg_y = sum_y / n if n > 0 else 0
            trend_line = [float(avg_y)] * n

    # Calculate statistics
    totals = [s["total"] for s in series if s["total"] > 0]
    avg = float(mean(totals)) if totals else 0
    std = float(pstdev(totals)) if len(totals) > 1 else 0
    min_val = float(min(totals)) if totals else 0
    max_val = float(max(totals)) if totals else 0

    result = {
        "period": f"{months} months",
        "data": series,
        "trend_line": trend_line,
        "statistics": {
            "average": avg,
            "std_deviation": std,
            "min": min_val,
            "max": max_val
        }
    }
    analytics_cache.set(cache_key, result)
    return result


@router.get("/analytics/comparison")
def get_month_comparison(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    type: Optional[Literal['expense', 'income']] = Query(None, description="Filter by type: expense or income"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare current month with previous month."""
    cache_key = make_cache_key("comparison", current_user.id, year=year, month=month, type=type)
    cached = analytics_cache.get(cache_key)
    if cached is not None:
        return cached

    # Current month dates
    current_start = datetime(year, month, 1)
    if month == 12:
        current_end = datetime(year + 1, 1, 1) - relativedelta(days=1)
    else:
        current_end = datetime(year, month + 1, 1) - relativedelta(days=1)

    # Previous month dates
    prev_start = current_start - relativedelta(months=1)
    prev_end = current_start - relativedelta(days=1)

    # Build type filter
    type_filter = [Transaction.type == type] if type else []

    # Aggregate current month totals in SQL
    current_agg = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= current_start,
        Transaction.date <= current_end,
        *type_filter,
    ).one()

    # Aggregate previous month totals in SQL
    prev_agg = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= prev_start,
        Transaction.date <= prev_end,
        *type_filter,
    ).one()

    current_total = Decimal(str(current_agg.total))
    prev_total = Decimal(str(prev_agg.total))
    current_count = current_agg.count
    prev_count = prev_agg.count

    # Category breakdown via SQL
    current_cat_rows = db.query(
        func.coalesce(Transaction.category, 'Other').label("cat"),
        func.sum(Transaction.amount).label("total"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= current_start,
        Transaction.date <= current_end,
        *type_filter,
    ).group_by(func.coalesce(Transaction.category, 'Other')).all()

    prev_cat_rows = db.query(
        func.coalesce(Transaction.category, 'Other').label("cat"),
        func.sum(Transaction.amount).label("total"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= prev_start,
        Transaction.date <= prev_end,
        *type_filter,
    ).group_by(func.coalesce(Transaction.category, 'Other')).all()

    current_by_category = {row.cat: Decimal(str(row.total)) for row in current_cat_rows}
    prev_by_category = {row.cat: Decimal(str(row.total)) for row in prev_cat_rows}

    # Calculate changes
    total_change = float((current_total - prev_total) / prev_total * 100) if prev_total > 0 else 0
    count_change = float((current_count - prev_count) / prev_count * 100) if prev_count > 0 else 0

    # Top categories by change
    category_changes = []
    all_cats = set(current_by_category.keys()) | set(prev_by_category.keys())
    for cat in all_cats:
        curr = float(current_by_category.get(cat, 0))
        prev = float(prev_by_category.get(cat, 0))
        change_pct = ((curr - prev) / prev * 100) if prev > 0 else (100 if curr > 0 else 0)
        category_changes.append({
            "category": cat,
            "current": curr,
            "previous": prev,
            "change_percent": round(change_pct, 1)
        })

    # Sort by absolute change
    category_changes.sort(key=lambda x: abs(x["change_percent"]), reverse=True)

    result = {
        "current_month": {"year": year, "month": month},
        "previous_month": {"year": prev_start.year, "month": prev_start.month},
        "current": {
            "total": float(current_total),
            "count": current_count,
            "by_category": {k: float(v) for k, v in current_by_category.items()}
        },
        "previous": {
            "total": float(prev_total),
            "count": prev_count,
            "by_category": {k: float(v) for k, v in prev_by_category.items()}
        },
        "changes": {
            "total_percent": round(total_change, 1),
            "count_percent": round(count_change, 1),
            "by_category": category_changes[:5]  # Top 5
        }
    }
    analytics_cache.set(cache_key, result)
    return result


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single transaction by ID."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    update_data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing transaction."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(transaction, field, value)

    # Log correction if category was changed (for AI learning)
    log_correction(db, transaction, current_user.id)

    db.commit()
    db.refresh(transaction)
    _invalidate_user_cache(current_user.id)
    return transaction


@router.delete("", status_code=204)
def delete_all_transactions(
    type: Optional[Literal['expense', 'income']] = Query(None, description="Filter by type: expense or income"),
    confirm: bool = Query(False, description="Must be true to confirm bulk deletion"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all transactions for the current user."""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Bulk deletion requires confirm=true query parameter",
        )
    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
    )
    if type:
        query = query.filter(Transaction.type == type)
    count = query.delete(synchronize_session=False)
    db.commit()
    _invalidate_user_cache(current_user.id)
    logger.info("Deleted %d transactions for user %d", count, current_user.id)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a transaction."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()
    _invalidate_user_cache(current_user.id)
