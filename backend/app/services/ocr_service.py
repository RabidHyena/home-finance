import base64
import json
import logging
import re
import time
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Optional

from openai import APITimeoutError, APIConnectionError, APIStatusError, OpenAI
from sqlalchemy.orm import Session

from app.config import get_settings
from app.schemas import ParsedTransaction

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"Food", "Transport", "Entertainment", "Shopping", "Bills", "Health", "Other",
                     "Salary", "Transfer", "Cashback", "Investment", "OtherIncome"}

DATE_FORMATS = [
    lambda s: datetime.fromisoformat(s),
    lambda s: datetime.strptime(s, "%Y-%m-%d"),
    lambda s: datetime.strptime(s, "%d.%m.%Y"),
    lambda s: datetime.strptime(s, "%d/%m/%Y"),
]


def _parse_date(date_str: str) -> datetime:
    """Parse date string trying multiple formats, fallback to now."""
    for fmt in DATE_FORMATS:
        try:
            return fmt(date_str)
        except (ValueError, TypeError):
            continue
    logger.warning("Could not parse date '%s', falling back to now()", date_str)
    return datetime.now(timezone.utc)


def _normalize_category(category: str) -> str:
    """Normalize category to a valid value, fallback to Other."""
    if category in VALID_CATEGORIES:
        return category
    logger.debug("Unknown category '%s', falling back to Other", category)
    return "Other"


def _clamp_confidence(value, default: float = 0.5) -> float:
    """Clamp confidence to [0.0, 1.0] range."""
    try:
        conf = float(value)
        return max(0.0, min(1.0, conf))
    except (TypeError, ValueError):
        return default


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from AI response."""
    stripped = text.strip()
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
    stripped = re.sub(r"\s*```$", "", stripped)
    return stripped.strip()


def _extract_json(text: str) -> dict | list:
    """Extract JSON from AI response text, handling markdown fences and embedded JSON."""
    stripped = _strip_markdown_fences(text)

    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # Fallback: try parsing from each '{' or '[' position, tolerating trailing text
    decoder = json.JSONDecoder()
    for i, ch in enumerate(text):
        if ch in ('{', '['):
            try:
                obj, _ = decoder.raw_decode(text, i)
                return obj
            except json.JSONDecodeError:
                continue

    raise ValueError(f"No valid JSON found in AI response: {text[:200]}")


class OCRService:
    """Service for parsing bank screenshots using Gemini 3 Flash Preview via OpenRouter."""

    SYSTEM_PROMPT = """You are a financial data extraction assistant specialized in Russian bank app screenshots.
Your task is to extract ALL financial information from bank app screenshots, including transactions AND charts/diagrams.

## Extract transactions:
For EACH transaction visible in a list, extract:
- amount: The transaction amount as a positive number (no currency symbols, no spaces). Examples: 1500.50, 250, 49999.99
- description: The merchant name or transaction description (clean name only, no amounts or dates)
- date: The EXACT date shown for THIS specific transaction in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g. 2026-01-15T14:30:00). If time is unknown, use 12:00:00.
- category: One of EXACTLY these values:
  - Expense categories: Food, Transport, Entertainment, Shopping, Bills, Health, Other
  - Income categories: Salary, Transfer, Cashback, Investment, OtherIncome
- type: "expense" or "income". Use "income" for salary, cashback, refunds, incoming transfers, top-ups. Use "expense" for purchases, payments, outgoing transfers, fees.
- currency: Three-letter code if visible: "RUB", "USD", "EUR". Default to "RUB".
- confidence: Your confidence level (0.0 to 1.0)

## Amount extraction rules:
- Russian format uses spaces as thousand separators and comma for decimals: "1 500,50" → 1500.50
- Strip currency symbols: ₽, руб., $, €, р.
- Always return a POSITIVE number regardless of sign shown on screen
- If amount shows "−1 500 ₽" or "- 1500 руб" → amount=1500, type="expense"
- If amount shows "+5 000 ₽" or "Зачисление 5000" → amount=5000, type="income"
- Common formats: "1500", "1 500", "1500,00", "1 500,50 ₽", "1500.00 руб"

## Russian bank app patterns:
- Sberbank (Сбербанк): green UI, shows "Списание"/"Зачисление", dates like "15 янв", amounts with ₽
- Tinkoff (Тинькофф): black/yellow UI, shows merchant name prominently, amounts with ₽ or руб
- Alfa-Bank (Альфа-Банк): red UI, shows "Покупка"/"Перевод", card last 4 digits
- VTB (ВТБ): blue UI, dates in DD.MM format
- Raiffeisen: yellow UI, similar to European format

CRITICAL DATE RULES:
- Each transaction MUST have its OWN date as shown on the screenshot
- Russian date formats: "15 янв", "3 февраля 2026", "15.01.2026", "15.01", "вчера", "сегодня", "позавчера"
- Month abbreviations: янв, фев, мар, апр, май, июн, июл, авг, сен, окт, ноя, дек
- "вчера" (yesterday), "сегодня" (today), "позавчера" (day before yesterday) — convert to actual dates relative to the current screenshot context
- If a group header shows a date like "15 января" and several transactions follow, all those transactions have that date
- If the screenshot shows transactions from different days, each MUST have the correct day
- NEVER assign the same date to all transactions unless they truly occurred on the same day
- If only a month/year is visible (no specific day), distribute transactions across the month (1st, 5th, 10th, 15th, 20th, 25th)

## Extract charts/diagrams:
If you see a pie chart, bar chart, or any spending diagram showing category breakdowns, extract:
- type: "pie", "bar", "line", or "other"
- categories: Array of {name, value, percentage (optional)}
- total: Total amount shown in the chart
- period: Time period in STRUCTURED format ONLY:
  - For a single month: "YYYY-MM" (e.g. "2026-01" for January 2026)
  - For a full year: "YYYY" (e.g. "2026")
  - For a date range: "YYYY-MM to YYYY-MM" (e.g. "2025-06 to 2026-01")
- period_type: "month", "year", "week", or "custom"
- confidence: Your confidence level (0.0 to 1.0)

CRITICAL PERIOD RULES:
- Look carefully at the chart title, header, or labels for the time period
- Common patterns: "Январь 2026" → period="2026-01", period_type="month"
- "2025 год" or "За 2025" → period="2025", period_type="year"
- "Июнь 2025 - Январь 2026" → period="2025-06 to 2026-01", period_type="custom"
- "За последний месяц" → use current month in YYYY-MM format, period_type="month"
- If you see monthly data spanning multiple months (e.g. Jan-Dec), that's a YEAR — use period_type="year"
- NEVER return Russian text as the period value — always use structured YYYY or YYYY-MM format

## Partial/cropped screenshots:
- If the image is cropped or partially visible, extract what you CAN see
- Set confidence lower (0.3-0.6) for partially visible text or amounts
- If a transaction is cut off, skip it rather than guessing

## ACCURACY RULES:
- Do NOT hallucinate or invent data that is not visible in the screenshot
- If text is blurry or unclear, lower the confidence instead of guessing
- Extract ALL visible transactions — do not skip any
- If a chart/diagram is present, extract its data too
- If the image shows ONLY a chart (no transaction list), return empty transactions array

Respond with a JSON object in this exact format:
{
    "transactions": [
        {
            "amount": 1500.50,
            "description": "Пятёрочка",
            "date": "2026-01-15T14:30:00",
            "category": "Food",
            "type": "expense",
            "currency": "RUB",
            "confidence": 0.95
        }
    ],
    "total_amount": 1500.50,
    "chart": {
        "type": "pie",
        "categories": [
            {"name": "Food", "value": 5000.50, "percentage": 45.5},
            {"name": "Transport", "value": 3000.00, "percentage": 27.3},
            {"name": "Shopping", "value": 3000.00, "percentage": 27.2}
        ],
        "total": 11000.50,
        "period": "2026-01",
        "period_type": "month",
        "confidence": 0.90
    }
}

If no chart is visible, omit the "chart" field or set it to null."""

    MEDIA_TYPES = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }

    API_TIMEOUT = 30.0  # seconds

    def __init__(self, db: Optional[Session] = None, user_id: int | None = None):
        settings = get_settings()
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            timeout=self.API_TIMEOUT,
        )
        self.model = settings.openrouter_model
        self.db = db
        self.user_id = user_id

    def _get_media_type(self, filename: str) -> str:
        """Determine media type from file extension."""
        suffix = Path(filename).suffix.lower()
        return self.MEDIA_TYPES.get(suffix, "image/jpeg")

    def _call_vision_api(self, image_data_b64: str, media_type: str) -> str:
        """Call the vision API and return raw response text."""
        logger.info("Calling vision API with model=%s", self.model)
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=8192,
            temperature=0,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_data_b64}",
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extract ALL transaction information from this bank app screenshot.",
                        },
                    ],
                },
            ],
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI returned empty response")
        logger.debug("Vision API response length: %d chars", len(content))
        return content

    def _apply_learned_category(self, description: str, category: str, confidence: float) -> tuple[str, float]:
        """Override category with learned mapping if available and more confident."""
        from app.services.learning_service import apply_learned_category
        return apply_learned_category(self.db, self.user_id, description, category, confidence)

    def _parse_single_tx(self, data: dict) -> ParsedTransaction | None:
        """Parse a single transaction dict into ParsedTransaction."""
        try:
            amount = self._parse_amount(data["amount"])
        except (KeyError, InvalidOperation, TypeError, ValueError):
            logger.warning("Skipping transaction with invalid amount: %s", data.get("amount"))
            return None

        date_str = data.get("date", "")
        parsed_date = _parse_date(date_str)

        category = _normalize_category(data.get("category", "Other"))
        confidence = _clamp_confidence(data.get("confidence", 0.5))
        description = data.get("description", "Unknown")

        # Extract type (expense/income), default to expense
        tx_type = data.get("type", "expense")
        if tx_type not in ("expense", "income"):
            tx_type = "expense"

        # Extract currency if provided
        currency = data.get("currency", "RUB")
        if not isinstance(currency, str) or len(currency) != 3:
            currency = "RUB"

        category, confidence = self._apply_learned_category(description, category, confidence)

        return ParsedTransaction(
            amount=amount,
            description=description,
            date=parsed_date,
            category=category,
            type=tx_type,
            currency=currency.upper(),
            raw_text="",  # filled by caller
            confidence=confidence,
        )

    @staticmethod
    def _parse_amount(raw_amount) -> Decimal:
        """Parse amount from AI response, handling Russian formats.

        Handles: "1 500,50", "1500.50", "₽1500", "1500 руб", negative signs.
        Always returns a positive Decimal.
        """
        text = str(raw_amount).strip()

        # Strip currency symbols and words
        for symbol in ("₽", "$", "€", "руб.", "руб", "р."):
            text = text.replace(symbol, "")

        # Strip sign characters (we determine expense/income from the type field)
        text = text.lstrip("−-+").strip()

        # Handle Russian format: spaces as thousand separators, comma as decimal
        # Detect: if comma is present and dot is not, treat comma as decimal separator
        if "," in text and "." not in text:
            # "1 500,50" → "1500.50"
            text = text.replace(" ", "").replace("\u00a0", "").replace(",", ".")
        else:
            # Remove spaces used as thousand separators
            text = text.replace(" ", "").replace("\u00a0", "")

        amount = Decimal(text)
        return abs(amount)

    def _parse_response(self, response_text: str) -> ParsedTransaction:
        """Parse the AI response text into a ParsedTransaction."""
        data = _extract_json(response_text)

        # If response is an array, take the first item
        if isinstance(data, list):
            if not data:
                raise ValueError("AI returned empty transaction list")
            data = data[0]

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected response format: {type(data)}")

        # If the response has a "transactions" key, extract first transaction
        if "transactions" in data and isinstance(data["transactions"], list) and data["transactions"]:
            data = data["transactions"][0]

        result = self._parse_single_tx(data)
        if result is None:
            raise ValueError(f"Invalid amount in AI response: {data.get('amount')}")

        result.raw_text = response_text
        return result

    def _parse_multiple_response(self, response_text: str) -> dict:
        """Parse the AI response text into multiple transactions."""
        data = _extract_json(response_text)

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected response format: {type(data)}")

        transactions_data = data.get("transactions", [])
        if not isinstance(transactions_data, list):
            raise ValueError("Expected 'transactions' to be an array")

        parsed_transactions = []
        for tx_data in transactions_data:
            tx = self._parse_single_tx(tx_data)
            if tx is not None:
                tx.raw_text = response_text
                parsed_transactions.append(tx)

        logger.info("Parsed %d/%d transactions", len(parsed_transactions), len(transactions_data))

        # Parse chart data if present
        chart_data = self._parse_chart(data.get("chart"))

        # If chart is present, prioritize it — drop transactions to avoid duplicates
        if chart_data:
            logger.info("Chart detected — ignoring %d transactions, using chart data only", len(parsed_transactions))
            return {
                "transactions": [],
                "total_amount": chart_data.get("total", Decimal("0")),
                "chart": chart_data,
                "raw_text": response_text,
            }

        # No chart — return transactions
        total_amount = Decimal("0")
        try:
            total_amount = Decimal(str(data.get("total_amount", 0)))
        except (InvalidOperation, TypeError):
            total_amount = sum(tx.amount for tx in parsed_transactions)

        return {
            "transactions": parsed_transactions,
            "total_amount": total_amount,
            "chart": None,
            "raw_text": response_text,
        }

    def _parse_chart(self, chart: dict | None) -> dict | None:
        """Parse chart data from AI response."""
        if not chart:
            return None

        try:
            categories_data = chart.get("categories", [])

            parsed_categories = []
            for cat in categories_data:
                try:
                    parsed_categories.append({
                        "name": cat.get("name", "Unknown"),
                        "value": Decimal(str(cat.get("value", 0))),
                        "percentage": float(cat.get("percentage")) if cat.get("percentage") is not None else None,
                    })
                except (InvalidOperation, TypeError, ValueError):
                    continue

            if not parsed_categories:
                return None

            return {
                "type": chart.get("type", "unknown"),
                "categories": parsed_categories,
                "total": Decimal(str(chart.get("total", 0))),
                "period": chart.get("period"),
                "period_type": chart.get("period_type", "month"),
                "confidence": _clamp_confidence(chart.get("confidence", 0.5)),
            }
        except (KeyError, TypeError, ValueError):
            logger.warning("Failed to parse chart data", exc_info=True)
            return None

    MAX_RETRIES = 3
    BACKOFF_BASE = 1.0  # seconds; delays: 1s, 2s, 4s

    @staticmethod
    def _is_retriable(exc: Exception) -> bool:
        """Determine if an API error is worth retrying."""
        if isinstance(exc, (APITimeoutError, APIConnectionError)):
            return True
        if isinstance(exc, APIStatusError) and exc.status_code >= 500:
            return True
        if isinstance(exc, APIStatusError) and exc.status_code == 429:
            return True
        # Parse failures are retriable (AI may return valid JSON on retry)
        if isinstance(exc, (ValueError, KeyError)):
            return True
        return False

    def _call_with_retry(self, image_data_b64: str, media_type: str, parser):
        """Call vision API and parse response with exponential backoff."""
        last_error: Exception | None = None
        for attempt in range(self.MAX_RETRIES):
            try:
                response_text = self._call_vision_api(image_data_b64, media_type)
                return parser(response_text)
            except (ValueError, KeyError, APITimeoutError, APIConnectionError, APIStatusError) as e:
                last_error = e
                if not self._is_retriable(e) or attempt == self.MAX_RETRIES - 1:
                    break
                delay = self.BACKOFF_BASE * (2 ** attempt)
                logger.warning(
                    "Attempt %d/%d failed (%s: %s), retrying in %.1fs",
                    attempt + 1, self.MAX_RETRIES, type(e).__name__, e, delay,
                )
                time.sleep(delay)
        raise last_error  # type: ignore[misc]

    def parse_image(self, image_path: str) -> ParsedTransaction:
        """Parse a bank screenshot and extract transaction data."""
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        with open(path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        media_type = self._get_media_type(image_path)
        return self._call_with_retry(image_data, media_type, self._parse_response)

    def parse_image_bytes(self, image_bytes: bytes, filename: str) -> ParsedTransaction:
        """Parse image from bytes (single transaction - legacy)."""
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
        media_type = self._get_media_type(filename)
        return self._call_with_retry(image_data, media_type, self._parse_response)

    def parse_image_bytes_multiple(self, image_bytes: bytes, filename: str) -> dict:
        """Parse image from bytes and extract multiple transactions."""
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
        media_type = self._get_media_type(filename)
        return self._call_with_retry(image_data, media_type, self._parse_multiple_response)


