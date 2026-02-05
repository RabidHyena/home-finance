"""Tests for services: OCR parsing, learning, merchant normalization."""

import json
import pytest
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.services.merchant_normalization import normalize_merchant_name
from app.services.ocr_service import OCRService


class TestMerchantNormalization:
    """Tests for merchant name normalization."""

    def test_basic_normalization(self):
        assert normalize_merchant_name("Starbucks") == "starbucks"

    def test_removes_russian_noise(self):
        result = normalize_merchant_name("оплата Пятёрочка покупка")
        assert "оплата" not in result
        assert "покупка" not in result
        assert "пятёрочка" in result

    def test_removes_english_noise(self):
        result = normalize_merchant_name("payment Starbucks purchase")
        assert "payment" not in result
        assert "purchase" not in result
        assert "starbucks" in result

    def test_removes_card_numbers(self):
        result = normalize_merchant_name("Магазин 4276-1234-5678-9012")
        assert "4276" not in result
        assert "магазин" in result

    def test_removes_amounts(self):
        result = normalize_merchant_name("Starbucks 150.50")
        assert "150" not in result
        assert "starbucks" in result

    def test_removes_dates(self):
        result = normalize_merchant_name("Магазин 15.01.2026")
        assert "15.01.2026" not in result

    def test_collapses_whitespace(self):
        result = normalize_merchant_name("  Starbucks   Coffee  ")
        assert "  " not in result
        assert result == "starbucks coffee"

    def test_truncates_long_names(self):
        long_name = "a" * 600
        result = normalize_merchant_name(long_name)
        assert len(result) <= 500

    def test_empty_string(self):
        assert normalize_merchant_name("") == ""

    def test_only_noise(self):
        result = normalize_merchant_name("оплата покупка")
        assert result.strip() == ""


class TestOCRResponseParsing:
    """Tests for OCR service response parsing (without API calls)."""

    def _make_service(self):
        """Create OCR service with mocked API client."""
        with patch("app.services.ocr_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                openrouter_api_key="test-key",
                openrouter_model="test-model",
            )
            return OCRService()

    def test_parse_single_transaction(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 1500.50,
            "description": "Пятёрочка",
            "date": "2026-01-15T14:30:00",
            "category": "Food",
            "confidence": 0.95,
        })
        result = svc._parse_response(response)
        assert result.amount == Decimal("1500.50")
        assert result.description == "Пятёрочка"
        assert result.category == "Food"
        assert result.confidence == 0.95

    def test_parse_strips_markdown_fences(self):
        svc = self._make_service()
        response = '```json\n{"amount": 100, "description": "Test", "date": "2026-01-15", "category": "Food", "confidence": 0.9}\n```'
        result = svc._parse_response(response)
        assert result.amount == Decimal("100")

    def test_parse_invalid_category_falls_back_to_other(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15",
            "category": "InvalidCategory",
            "confidence": 0.5,
        })
        result = svc._parse_response(response)
        assert result.category == "Other"

    def test_parse_clamps_confidence(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15",
            "category": "Food",
            "confidence": 1.5,
        })
        result = svc._parse_response(response)
        assert result.confidence == 1.0

    def test_parse_negative_confidence(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15",
            "category": "Food",
            "confidence": -0.5,
        })
        result = svc._parse_response(response)
        assert result.confidence == 0.0

    def test_parse_various_date_formats(self):
        svc = self._make_service()
        dates = [
            ("2026-01-15T14:30:00", 2026),
            ("2026-01-15", 2026),
            ("15.01.2026", 2026),
            ("15/01/2026", 2026),
        ]
        for date_str, expected_year in dates:
            response = json.dumps({
                "amount": 100,
                "description": "Test",
                "date": date_str,
                "category": "Food",
                "confidence": 0.5,
            })
            result = svc._parse_response(response)
            assert result.date.year == expected_year, f"Failed for {date_str}"

    def test_parse_invalid_date_falls_back_to_now(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "not-a-date",
            "category": "Food",
            "confidence": 0.5,
        })
        result = svc._parse_response(response)
        assert result.date is not None  # falls back to datetime.now()

    def test_parse_array_response_takes_first(self):
        svc = self._make_service()
        response = json.dumps([
            {"amount": 100, "description": "First", "date": "2026-01-15", "category": "Food", "confidence": 0.9},
            {"amount": 200, "description": "Second", "date": "2026-01-16", "category": "Transport", "confidence": 0.8},
        ])
        result = svc._parse_response(response)
        assert result.description == "First"
        assert result.amount == Decimal("100")

    def test_parse_invalid_amount_raises(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": "not-a-number",
            "description": "Test",
            "date": "2026-01-15",
            "category": "Food",
        })
        with pytest.raises(ValueError):
            svc._parse_response(response)

    def test_parse_no_json_raises(self):
        svc = self._make_service()
        with pytest.raises(ValueError, match="No valid JSON"):
            svc._parse_response("This is not JSON at all")

    def test_parse_multiple_transactions(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [
                {"amount": 100, "description": "Store A", "date": "2026-01-15", "category": "Food", "confidence": 0.9},
                {"amount": 200, "description": "Store B", "date": "2026-01-16", "category": "Transport", "confidence": 0.8},
                {"amount": 300, "description": "Store C", "date": "2026-01-17", "category": "Shopping", "confidence": 0.7},
            ],
            "total_amount": 600,
        })
        result = svc._parse_multiple_response(response)
        assert len(result["transactions"]) == 3
        assert float(result["total_amount"]) == 600

    def test_parse_multiple_with_chart(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [
                {"amount": 100, "description": "Store", "date": "2026-01-15", "category": "Food", "confidence": 0.9},
            ],
            "total_amount": 100,
            "chart": {
                "type": "pie",
                "categories": [
                    {"name": "Food", "value": 5000, "percentage": 50},
                    {"name": "Transport", "value": 3000, "percentage": 30},
                ],
                "total": 10000,
                "period": "January 2026",
                "confidence": 0.85,
            }
        })
        result = svc._parse_multiple_response(response)
        assert result["chart"] is not None
        assert result["chart"]["type"] == "pie"
        assert len(result["chart"]["categories"]) == 2

    def test_parse_multiple_skips_invalid_transactions(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [
                {"amount": 100, "description": "Valid", "date": "2026-01-15", "category": "Food", "confidence": 0.9},
                {"description": "No amount", "date": "2026-01-16", "category": "Food"},
                {"amount": "invalid", "description": "Bad amount", "date": "2026-01-17"},
            ],
            "total_amount": 100,
        })
        result = svc._parse_multiple_response(response)
        assert len(result["transactions"]) == 1
        assert result["transactions"][0].description == "Valid"

    def test_parse_multiple_null_chart(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [
                {"amount": 100, "description": "Store", "date": "2026-01-15", "category": "Food", "confidence": 0.9},
            ],
            "total_amount": 100,
            "chart": None,
        })
        result = svc._parse_multiple_response(response)
        assert result["chart"] is None

    def test_media_type_detection(self):
        svc = self._make_service()
        assert svc._get_media_type("photo.jpg") == "image/jpeg"
        assert svc._get_media_type("photo.jpeg") == "image/jpeg"
        assert svc._get_media_type("photo.png") == "image/png"
        assert svc._get_media_type("photo.gif") == "image/gif"
        assert svc._get_media_type("photo.webp") == "image/webp"
        assert svc._get_media_type("photo.bmp") == "image/jpeg"  # fallback


class TestLearningService:
    """Tests for learning service using real DB (via conftest fixtures)."""

    def test_no_correction_when_categories_match(self, client):
        """No correction logged if ai_category == category."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Starbucks",
            "category": "Food",
            "ai_category": "Food",
            "ai_confidence": 0.95,
            "date": "2026-01-15T10:00:00",
        })
        # Check AI accuracy — should be 1 correct prediction
        resp = client.get("/api/transactions/analytics/ai-accuracy")
        data = resp.json()
        assert data["total_predictions"] == 1
        assert data["correct_predictions"] == 1

    def test_correction_logged_when_categories_differ(self, client):
        """Correction logged if ai_category != category."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Starbucks",
            "category": "Food",
            "ai_category": "Shopping",
            "ai_confidence": 0.6,
            "date": "2026-01-15T10:00:00",
        })
        resp = client.get("/api/transactions/analytics/ai-accuracy")
        data = resp.json()
        assert data["total_predictions"] == 1
        assert data["correct_predictions"] == 0

    def test_learning_threshold_not_met(self, client):
        """Merchant mapping NOT created with < 3 corrections."""
        for i in range(2):
            client.post("/api/transactions", json={
                "amount": 100,
                "description": "Starbucks Coffee",
                "category": "Food",
                "ai_category": "Shopping",
                "ai_confidence": 0.5,
                "date": f"2026-01-{10+i}T10:00:00",
            })
        resp = client.get("/api/transactions/analytics/ai-accuracy")
        assert resp.json()["learned_merchants"] == 0

    def test_learning_threshold_met(self, client):
        """Merchant mapping created after 3+ corrections with 70%+ agreement."""
        for i in range(3):
            client.post("/api/transactions", json={
                "amount": 100,
                "description": "Starbucks Coffee",
                "category": "Food",
                "ai_category": "Shopping",
                "ai_confidence": 0.5,
                "date": f"2026-01-{10+i}T10:00:00",
            })
        resp = client.get("/api/transactions/analytics/ai-accuracy")
        assert resp.json()["learned_merchants"] == 1
