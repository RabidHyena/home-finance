import base64
import json
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from openai import OpenAI

from app.config import get_settings
from app.schemas import ParsedTransaction

VALID_CATEGORIES = {"Food", "Transport", "Entertainment", "Shopping", "Bills", "Health", "Other"}


class OCRService:
    """Service for parsing bank screenshots using Gemini 3 Flash via OpenRouter."""

    SYSTEM_PROMPT = """You are a financial data extraction assistant.
Your task is to extract transaction information from bank app screenshots.

Extract the following information:
- amount: The transaction amount (numeric value only, without currency symbol)
- description: The merchant name or transaction description
- date: The transaction date in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g. 2026-01-15T14:30:00). If time is unknown, use 00:00:00. If only month is visible, use the 1st day.
- category: One of EXACTLY these values: Food, Transport, Entertainment, Shopping, Bills, Health, Other

If the screenshot contains multiple transactions, return ONLY the most prominent/largest one.

Respond ONLY with a single valid JSON object (not an array) in this exact format:
{
    "amount": 123.45,
    "description": "Store Name",
    "date": "2026-01-15T14:30:00",
    "category": "Shopping",
    "confidence": 0.95
}

If you cannot extract some information, make reasonable assumptions and lower the confidence score.
If the image is not a bank transaction screenshot, return confidence: 0."""

    MEDIA_TYPES = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }

    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )

    def _get_media_type(self, filename: str) -> str:
        """Determine media type from file extension."""
        suffix = Path(filename).suffix.lower()
        return self.MEDIA_TYPES.get(suffix, "image/jpeg")

    def _call_vision_api(self, image_data_b64: str, media_type: str) -> str:
        """Call the vision API and return raw response text."""
        response = self.client.chat.completions.create(
            model="google/gemini-2.5-flash",
            max_tokens=1024,
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
                            "text": "Extract the transaction information from this bank app screenshot.",
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
        """Parse image from bytes."""
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
        media_type = self._get_media_type(filename)
        response_text = self._call_vision_api(image_data, media_type)
        return self._parse_response(response_text)


def get_ocr_service() -> OCRService:
    """Dependency for getting OCR service."""
    return OCRService()
