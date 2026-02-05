import base64
import json
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Optional

from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import get_settings
from app.schemas import ParsedTransaction

VALID_CATEGORIES = {"Food", "Transport", "Entertainment", "Shopping", "Bills", "Health", "Other"}


class OCRService:
    """Service for parsing bank screenshots using Gemini 3 Flash Preview via OpenRouter."""

    SYSTEM_PROMPT = """You are a financial data extraction assistant.
Your task is to extract ALL financial information from bank app screenshots, including transactions AND charts/diagrams.

## Extract transactions:
For EACH transaction visible in a list, extract:
- amount: The transaction amount (numeric value only, without currency symbol)
- description: The merchant name or transaction description
- date: The transaction date in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g. 2026-01-15T14:30:00). If time is unknown, use 00:00:00.
- category: One of EXACTLY these values: Food, Transport, Entertainment, Shopping, Bills, Health, Other
- confidence: Your confidence level (0.0 to 1.0)

## Extract charts/diagrams:
If you see a pie chart, bar chart, or any spending diagram showing category breakdowns, extract:
- type: "pie", "bar", "line", or "other"
- categories: Array of {name, value, percentage (optional)}
- total: Total amount shown in the chart
- period: Time period (e.g., "January 2024", "Last month")
- confidence: Your confidence level (0.0 to 1.0)

IMPORTANT:
- Extract ALL visible transactions from lists
- If a chart/diagram is present, extract its data too
- Categories should match: Food, Transport, Entertainment, Shopping, Bills, Health, Other
- If the image shows ONLY a chart (no transaction list), return empty transactions array

Respond with a JSON object in this exact format:
{
    "transactions": [
        {
            "amount": 123.45,
            "description": "Store Name",
            "date": "2026-01-15T14:30:00",
            "category": "Shopping",
            "confidence": 0.95
        }
    ],
    "total_amount": 123.45,
    "chart": {
        "type": "pie",
        "categories": [
            {"name": "Food", "value": 5000.50, "percentage": 45.5},
            {"name": "Transport", "value": 3000.00, "percentage": 27.3},
            {"name": "Shopping", "value": 3000.00, "percentage": 27.2}
        ],
        "total": 11000.50,
        "period": "January 2024",
        "confidence": 0.90
    }
}

If no chart is visible, omit the "chart" field or set it to null.
If you cannot extract some information, make reasonable assumptions and lower the confidence score."""

    MEDIA_TYPES = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }

    def __init__(self, db: Optional[Session] = None):
        settings = get_settings()
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
        self.db = db

    def _get_media_type(self, filename: str) -> str:
        """Determine media type from file extension."""
        suffix = Path(filename).suffix.lower()
        return self.MEDIA_TYPES.get(suffix, "image/jpeg")

    def _call_vision_api(self, image_data_b64: str, media_type: str) -> str:
        """Call the vision API and return raw response text."""
        response = self.client.chat.completions.create(
            model="google/gemini-3-flash-preview",
            max_tokens=4096,  # Increased for multiple transactions
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
        return content

    def _parse_response(self, response_text: str) -> ParsedTransaction:
        """Parse the AI response text into a ParsedTransaction."""
        # Try to extract JSON — handle both single object and array responses
        stripped = response_text.strip()

        # Remove markdown code fences if present
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
        stripped = stripped.strip()

        try:
            data = json.loads(stripped)
        except json.JSONDecodeError:
            # Fallback: try to find any JSON object in the text
            json_match = re.search(r"\{[^{}]*\}", response_text)
            if not json_match:
                raise ValueError(f"No valid JSON found in AI response: {response_text[:200]}")
            data = json.loads(json_match.group())

        # If response is an array, take the first item
        if isinstance(data, list):
            if not data:
                raise ValueError("AI returned empty transaction list")
            data = data[0]

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected response format: {type(data)}")

        # Parse amount robustly
        try:
            amount = Decimal(str(data["amount"]))
        except (KeyError, InvalidOperation, TypeError):
            raise ValueError(f"Invalid amount in AI response: {data.get('amount')}")

        # Parse date robustly — fallback to now if invalid
        date_str = data.get("date", "")
        parsed_date = None
        for fmt in [
            lambda s: datetime.fromisoformat(s),
            lambda s: datetime.strptime(s, "%Y-%m-%d"),
            lambda s: datetime.strptime(s, "%d.%m.%Y"),
            lambda s: datetime.strptime(s, "%d/%m/%Y"),
        ]:
            try:
                parsed_date = fmt(date_str)
                break
            except (ValueError, TypeError):
                continue
        if parsed_date is None:
            parsed_date = datetime.now()

        # Normalize category — fallback to Other
        category = data.get("category", "Other")
        if category not in VALID_CATEGORIES:
            category = "Other"

        # Clamp confidence
        try:
            confidence = float(data.get("confidence", 0.5))
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.5

        return ParsedTransaction(
            amount=amount,
            description=data.get("description", "Unknown"),
            date=parsed_date,
            category=category,
            raw_text=response_text,
            confidence=confidence,
        )

    def _parse_multiple_response(self, response_text: str) -> dict:
        """Parse the AI response text into multiple transactions."""
        # Remove markdown code fences if present
        stripped = response_text.strip()
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
        stripped = stripped.strip()

        try:
            data = json.loads(stripped)
        except json.JSONDecodeError:
            # Fallback: try to find JSON object in the text
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if not json_match:
                raise ValueError(f"No valid JSON found in AI response: {response_text[:200]}")
            data = json.loads(json_match.group())

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected response format: {type(data)}")

        transactions_data = data.get("transactions", [])
        if not isinstance(transactions_data, list):
            raise ValueError("Expected 'transactions' to be an array")

        parsed_transactions = []
        for tx_data in transactions_data:
            # Parse amount
            try:
                amount = Decimal(str(tx_data["amount"]))
            except (KeyError, InvalidOperation, TypeError):
                continue  # Skip invalid transactions

            # Parse date
            date_str = tx_data.get("date", "")
            parsed_date = None
            for fmt in [
                lambda s: datetime.fromisoformat(s),
                lambda s: datetime.strptime(s, "%Y-%m-%d"),
                lambda s: datetime.strptime(s, "%d.%m.%Y"),
                lambda s: datetime.strptime(s, "%d/%m/%Y"),
            ]:
                try:
                    parsed_date = fmt(date_str)
                    break
                except (ValueError, TypeError):
                    continue
            if parsed_date is None:
                parsed_date = datetime.now()

            # Normalize category
            category = tx_data.get("category", "Other")
            if category not in VALID_CATEGORIES:
                category = "Other"

            # Clamp confidence
            try:
                confidence = float(tx_data.get("confidence", 0.5))
                confidence = max(0.0, min(1.0, confidence))
            except (TypeError, ValueError):
                confidence = 0.5

            # Apply learned categories if available
            if self.db:
                from app.services.learning_service import get_learned_category
                description = tx_data.get("description", "Unknown")
                learned = get_learned_category(self.db, description)
                if learned:
                    learned_category, learned_confidence = learned
                    # Override if learned confidence is higher
                    if float(learned_confidence) > confidence:
                        category = learned_category
                        confidence = float(learned_confidence)

            parsed_transactions.append(ParsedTransaction(
                amount=amount,
                description=tx_data.get("description", "Unknown"),
                date=parsed_date,
                category=category,
                raw_text=response_text,
                confidence=confidence,
            ))

        # Parse total amount
        total_amount = Decimal("0")
        try:
            total_amount = Decimal(str(data.get("total_amount", 0)))
        except (InvalidOperation, TypeError):
            # Calculate from transactions if not provided
            total_amount = sum(tx.amount for tx in parsed_transactions)

        # Parse chart data if present
        chart_data = None
        if "chart" in data and data["chart"] is not None:
            try:
                chart = data["chart"]
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
                        continue  # Skip invalid categories

                if parsed_categories:  # Only include chart if we parsed at least one category
                    chart_confidence = float(chart.get("confidence", 0.5))
                    chart_confidence = max(0.0, min(1.0, chart_confidence))

                    chart_data = {
                        "type": chart.get("type", "unknown"),
                        "categories": parsed_categories,
                        "total": Decimal(str(chart.get("total", 0))),
                        "period": chart.get("period"),
                        "confidence": chart_confidence,
                    }
            except (KeyError, TypeError, ValueError):
                # If chart parsing fails, just skip it
                pass

        return {
            "transactions": parsed_transactions,
            "total_amount": total_amount,
            "chart": chart_data,
            "raw_text": response_text,
        }

    def parse_image(self, image_path: str) -> ParsedTransaction:
        """Parse a bank screenshot and extract transaction data."""
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        with open(path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        media_type = self._get_media_type(image_path)
        response_text = self._call_vision_api(image_data, media_type)
        return self._parse_response(response_text)

    def parse_image_bytes(self, image_bytes: bytes, filename: str) -> ParsedTransaction:
        """Parse image from bytes (single transaction - legacy)."""
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
        media_type = self._get_media_type(filename)
        response_text = self._call_vision_api(image_data, media_type)
        return self._parse_response(response_text)

    def parse_image_bytes_multiple(self, image_bytes: bytes, filename: str) -> dict:
        """Parse image from bytes and extract multiple transactions."""
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
        media_type = self._get_media_type(filename)
        response_text = self._call_vision_api(image_data, media_type)
        return self._parse_multiple_response(response_text)


def get_ocr_service() -> OCRService:
    """Dependency for getting OCR service."""
    return OCRService()
