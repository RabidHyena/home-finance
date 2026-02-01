import base64
import json
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import anthropic

from app.config import get_settings
from app.schemas import ParsedTransaction


class OCRService:
    """Service for parsing bank screenshots using Claude Vision API."""

    SYSTEM_PROMPT = """You are a financial data extraction assistant.
Your task is to extract transaction information from bank app screenshots.

Extract the following information:
- amount: The transaction amount (numeric value only, without currency symbol)
- description: The merchant name or transaction description
- date: The transaction date in ISO format (YYYY-MM-DDTHH:MM:SS)
- category: Suggested category (one of: Food, Transport, Entertainment, Shopping, Bills, Health, Other)

Respond ONLY with valid JSON in this exact format:
{
    "amount": 123.45,
    "description": "Store Name",
    "date": "2024-01-15T14:30:00",
    "category": "Shopping",
    "confidence": 0.95
}

If you cannot extract some information, make reasonable assumptions and lower the confidence score.
If the image is not a bank transaction screenshot, return confidence: 0."""

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def parse_image(self, image_path: str) -> ParsedTransaction:
        """Parse a bank screenshot and extract transaction data."""
        # Read and encode image
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        with open(path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        # Determine media type
        suffix = path.suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        media_type = media_types.get(suffix, "image/jpeg")

        # Call Claude Vision API
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extract the transaction information from this bank app screenshot.",
                        },
                    ],
                }
            ],
            system=self.SYSTEM_PROMPT,
        )

        # Parse response
        response_text = message.content[0].text

        # Extract JSON from response (handle potential markdown code blocks)
        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if not json_match:
            raise ValueError("Failed to parse AI response")

        data = json.loads(json_match.group())

        return ParsedTransaction(
            amount=Decimal(str(data["amount"])),
            description=data["description"],
            date=datetime.fromisoformat(data["date"]),
            category=data.get("category"),
            raw_text=response_text,
            confidence=data.get("confidence", 0.5),
        )

    def parse_image_bytes(self, image_bytes: bytes, filename: str) -> ParsedTransaction:
        """Parse image from bytes."""
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")

        # Determine media type from filename
        suffix = Path(filename).suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        media_type = media_types.get(suffix, "image/jpeg")

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extract the transaction information from this bank app screenshot.",
                        },
                    ],
                }
            ],
            system=self.SYSTEM_PROMPT,
        )

        response_text = message.content[0].text

        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if not json_match:
            raise ValueError("Failed to parse AI response")

        data = json.loads(json_match.group())

        return ParsedTransaction(
            amount=Decimal(str(data["amount"])),
            description=data["description"],
            date=datetime.fromisoformat(data["date"]),
            category=data.get("category"),
            raw_text=response_text,
            confidence=data.get("confidence", 0.5),
        )


def get_ocr_service() -> OCRService:
    """Dependency for getting OCR service."""
    return OCRService()
