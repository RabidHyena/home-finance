import base64
import json
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from openai import OpenAI

from app.config import get_settings
from app.schemas import ParsedTransaction


class OCRService:
    """Service for parsing bank screenshots using Gemini 3 Flash via OpenRouter."""

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
            model="google/gemini-3-flash-preview",
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
        return response.choices[0].message.content

    def _parse_response(self, response_text: str) -> ParsedTransaction:
        """Parse the AI response text into a ParsedTransaction."""
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
