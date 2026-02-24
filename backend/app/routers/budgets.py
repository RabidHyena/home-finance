from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Budget, Transaction, User
from app.schemas import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetStatus,
)

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.post("", response_model=BudgetResponse, status_code=201)
def create_budget(
    budget: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new budget for a category."""
    # Check if budget already exists for this category and user
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == budget.category,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Budget for category '{budget.category}' already exists"
        )

    db_budget = Budget(
        user_id=current_user.id,
        category=budget.category,
        limit_amount=budget.limit_amount,
        period=budget.period,
    )
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget


@router.get("", response_model=list[BudgetResponse])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all budgets."""
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    return budgets


@router.get("/status", response_model=list[BudgetStatus])
def get_budgets_status(
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get budget status with current spending."""
    # Default to current month
    if not year or not month:
        now = datetime.now(timezone.utc)
        year = now.year
        month = now.month

    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    if not budgets:
        return []

    # Pre-compute spending for all categories in bulk (2 queries max instead of N)
    # Monthly spending by category
    monthly_spent_rows = db.query(
        Transaction.category,
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == 'expense',
        extract('year', Transaction.date) == year,
        extract('month', Transaction.date) == month,
    ).group_by(Transaction.category).all()
    monthly_spent = {row.category: Decimal(str(row.total)) for row in monthly_spent_rows}

    # Weekly spending by category (only if any budget uses weekly)
    weekly_spent: dict[str, Decimal] = {}
    if any(b.period == 'weekly' for b in budgets):
        today = datetime.now(timezone.utc)
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        weekly_spent_rows = db.query(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == 'expense',
            Transaction.date >= week_start.replace(hour=0, minute=0, second=0),
            Transaction.date <= week_end.replace(hour=23, minute=59, second=59),
        ).group_by(Transaction.category).all()
        weekly_spent = {row.category: Decimal(str(row.total)) for row in weekly_spent_rows}

    statuses = []
    for budget in budgets:
        spent_lookup = weekly_spent if budget.period == 'weekly' else monthly_spent
        spent = spent_lookup.get(budget.category, Decimal('0'))
        remaining = budget.limit_amount - spent
        percentage = float((spent / budget.limit_amount) * 100) if budget.limit_amount > 0 else 0

        statuses.append(BudgetStatus(
            budget=budget,
            spent=spent,
            remaining=remaining,
            percentage=percentage,
            exceeded=spent > budget.limit_amount,
        ))

    return statuses


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single budget by ID."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    update_data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing budget."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(budget, field, value)

    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a budget."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(budget)
    db.commit()
