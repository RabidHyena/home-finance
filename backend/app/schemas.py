from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from decimal import Decimal
from typing import Optional


class TransactionBase(BaseModel):
    """Base schema for transaction data."""

    amount: Decimal = Field(..., description="Transaction amount", gt=0)
    description: str = Field(..., description="Transaction description", max_length=500)
    category: Optional[str] = Field(None, description="Transaction category", max_length=100)
    date: datetime = Field(..., description="Transaction date")
    currency: str = Field(default='RUB', max_length=3, pattern='^(RUB|USD|EUR|GBP)$')


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction."""

    image_path: Optional[str] = None
    raw_text: Optional[str] = None
    ai_category: Optional[str] = None
    ai_confidence: Optional[Decimal] = Field(None, ge=0, le=1)


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    date: Optional[datetime] = None
    currency: Optional[str] = Field(None, max_length=3, pattern='^(RUB|USD|EUR|GBP)$')


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    id: int
    currency: str
    image_path: Optional[str] = None
    raw_text: Optional[str] = None
    ai_category: Optional[str] = None
    ai_confidence: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class TransactionList(BaseModel):
    """Schema for paginated transaction list."""

    items: list[TransactionResponse]
    total: int
    page: int
    per_page: int


class ParsedTransaction(BaseModel):
    """Schema for AI-parsed transaction data."""

    amount: Decimal
    description: str
    date: datetime
    category: Optional[str] = None
    currency: str = 'RUB'
    raw_text: str
    confidence: float = Field(..., ge=0, le=1)

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class ChartDataItem(BaseModel):
    """Schema for a single chart data item."""

    name: str
    value: Decimal
    percentage: Optional[float] = None

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class ParsedChart(BaseModel):
    """Schema for AI-parsed chart data."""

    type: str  # 'pie', 'bar', 'line', etc.
    categories: list[ChartDataItem]
    total: Decimal
    period: Optional[str] = None
    confidence: float = Field(..., ge=0, le=1)

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class ParsedTransactions(BaseModel):
    """Schema for multiple AI-parsed transactions and charts."""

    transactions: list[ParsedTransaction]
    total_amount: Decimal
    chart: Optional[ParsedChart] = None
    raw_text: str

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class MonthlyReport(BaseModel):
    """Schema for monthly spending report."""

    year: int
    month: int
    total_amount: Decimal
    transaction_count: int
    by_category: dict[str, Decimal]

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str
    database: str
    version: str


class BatchUploadResult(BaseModel):
    """Schema for a single batch upload result."""

    filename: str
    status: str  # 'success' or 'error'
    data: Optional[ParsedTransactions] = None
    error: Optional[str] = None


class BatchUploadResponse(BaseModel):
    """Schema for batch upload response."""

    results: list[BatchUploadResult]
    total_files: int
    successful: int
    failed: int


class BudgetBase(BaseModel):
    """Base schema for budget data."""

    category: str = Field(..., max_length=100)
    limit_amount: Decimal = Field(..., gt=0)
    period: str = Field(default='monthly', pattern='^(monthly|weekly)$')


class BudgetCreate(BudgetBase):
    """Schema for creating a budget."""
    pass


class BudgetUpdate(BaseModel):
    """Schema for updating a budget."""

    limit_amount: Optional[Decimal] = Field(None, gt=0)
    period: Optional[str] = Field(None, pattern='^(monthly|weekly)$')


class BudgetResponse(BudgetBase):
    """Schema for budget response."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class BudgetStatus(BaseModel):
    """Schema for budget status with current spending."""

    budget: BudgetResponse
    spent: Decimal
    remaining: Decimal
    percentage: float
    exceeded: bool

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )
