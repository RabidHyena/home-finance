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

    def test_removes_new_russian_noise_words(self):
        result = normalize_merchant_name("списание Магнит по карте")
        assert "списание" not in result
        assert "по карте" not in result
        assert "магнит" in result

    def test_removes_zachislenie(self):
        result = normalize_merchant_name("зачисление от Иванов И.И.")
        assert "зачисление" not in result

    def test_strips_legal_prefixes(self):
        assert "ооо" not in normalize_merchant_name("ООО Пятёрочка")
        assert "ип" not in normalize_merchant_name("ИП Иванов")
        assert "пао" not in normalize_merchant_name("ПАО Сбербанк")
        assert "ао" not in normalize_merchant_name("АО Тинькофф")

    def test_strips_legal_prefix_keeps_name(self):
        result = normalize_merchant_name("ООО Яндекс.Еда")
        assert "ооо" not in result
        assert "яндекс" in result
        assert "еда" in result

    def test_normalizes_dots_between_words(self):
        result = normalize_merchant_name("Яндекс.Еда")
        assert result == "яндекс еда"

    def test_normalizes_slashes_between_words(self):
        result = normalize_merchant_name("Delivery/Club")
        assert result == "delivery club"

    def test_removes_trailing_reference_hash(self):
        result = normalize_merchant_name("Магазин #12345")
        assert "#12345" not in result
        assert "12345" not in result
        assert "магазин" in result

    def test_removes_trailing_reference_numero(self):
        result = normalize_merchant_name("Магазин №67890")
        assert "67890" not in result
        assert "магазин" in result

    def test_removes_beznalichnaya_oplata(self):
        result = normalize_merchant_name("безналичная оплата Перекрёсток")
        assert "безналичная" not in result
        assert "перекрёсток" in result


class TestOCRResponseParsing:
    """Tests for OCR service response parsing (without API calls)."""

    def _make_service(self):
        """Create OCR service with mocked API auth_client."""
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
        """When chart is present, transactions are dropped (chart takes priority)."""
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
        # Chart present → transactions ignored
        assert len(result["transactions"]) == 0
        assert result["total_amount"] == 10000

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

    def test_parse_type_expense(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 500,
            "description": "Пятёрочка",
            "date": "2026-01-15",
            "category": "Food",
            "type": "expense",
            "confidence": 0.9,
        })
        result = svc._parse_response(response)
        assert result.type == "expense"

    def test_parse_type_income(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 50000,
            "description": "Зарплата",
            "date": "2026-01-10",
            "category": "Salary",
            "type": "income",
            "confidence": 0.95,
        })
        result = svc._parse_response(response)
        assert result.type == "income"
        assert result.category == "Salary"

    def test_parse_type_defaults_to_expense(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15",
            "category": "Food",
            "confidence": 0.5,
        })
        result = svc._parse_response(response)
        assert result.type == "expense"

    def test_parse_type_invalid_defaults_to_expense(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15",
            "category": "Food",
            "type": "refund",
            "confidence": 0.5,
        })
        result = svc._parse_response(response)
        assert result.type == "expense"

    def test_parse_currency(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15",
            "category": "Shopping",
            "currency": "USD",
            "confidence": 0.9,
        })
        result = svc._parse_response(response)
        assert result.currency == "USD"

    def test_parse_currency_defaults_to_rub(self):
        svc = self._make_service()
        response = json.dumps({
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15",
            "category": "Food",
            "confidence": 0.9,
        })
        result = svc._parse_response(response)
        assert result.currency == "RUB"

    def test_parse_amount_russian_format_spaces_and_comma(self):
        svc = self._make_service()
        assert svc._parse_amount("1 500,50") == Decimal("1500.50")

    def test_parse_amount_plain_number(self):
        svc = self._make_service()
        assert svc._parse_amount(1500.50) == Decimal("1500.5")

    def test_parse_amount_with_ruble_symbol(self):
        svc = self._make_service()
        assert svc._parse_amount("1500 ₽") == Decimal("1500")

    def test_parse_amount_with_rub_word(self):
        svc = self._make_service()
        assert svc._parse_amount("1500 руб") == Decimal("1500")

    def test_parse_amount_negative_becomes_positive(self):
        svc = self._make_service()
        assert svc._parse_amount("-1500.50") == Decimal("1500.50")
        assert svc._parse_amount("−1 500,50") == Decimal("1500.50")

    def test_parse_amount_with_plus_sign(self):
        svc = self._make_service()
        assert svc._parse_amount("+5000") == Decimal("5000")

    def test_parse_amount_with_dollar_sign(self):
        svc = self._make_service()
        assert svc._parse_amount("$99.99") == Decimal("99.99")

    def test_parse_amount_with_euro_sign(self):
        svc = self._make_service()
        assert svc._parse_amount("€49,99") == Decimal("49.99")

    def test_parse_amount_nbsp_as_thousands_separator(self):
        svc = self._make_service()
        assert svc._parse_amount("1\u00a0500,50") == Decimal("1500.50")

    def test_retry_on_parse_failure(self):
        """Retry once when JSON parsing fails on first attempt."""
        svc = self._make_service()
        good_response = json.dumps({
            "transactions": [
                {"amount": 100, "description": "Store", "date": "2026-01-15", "category": "Food", "confidence": 0.9},
            ],
            "total_amount": 100,
        })
        call_count = 0

        def mock_call_api(image_data, media_type):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return "This is not valid JSON at all"
            return good_response

        svc._call_vision_api = mock_call_api
        result = svc._call_with_retry("base64data", "image/png", svc._parse_multiple_response)
        assert call_count == 2
        assert len(result["transactions"]) == 1

    def test_retry_exhausted_raises(self):
        """Raises after all retries exhausted."""
        svc = self._make_service()

        def mock_call_api(image_data, media_type):
            return "Not JSON"

        svc._call_vision_api = mock_call_api
        with pytest.raises(ValueError, match="No valid JSON"):
            svc._call_with_retry("base64data", "image/png", svc._parse_multiple_response)

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

    def test_no_correction_when_categories_match(self, auth_client):
        """No correction logged if ai_category == category."""
        auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Starbucks",
            "category": "Food",
            "ai_category": "Food",
            "ai_confidence": 0.95,
            "date": "2026-01-15T10:00:00",
        })
        # Check AI accuracy — should be 1 correct prediction
        resp = auth_client.get("/api/transactions/analytics/ai-accuracy")
        data = resp.json()
        assert data["total_predictions"] == 1
        assert data["correct_predictions"] == 1

    def test_correction_logged_when_categories_differ(self, auth_client):
        """Correction logged if ai_category != category."""
        auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Starbucks",
            "category": "Food",
            "ai_category": "Shopping",
            "ai_confidence": 0.6,
            "date": "2026-01-15T10:00:00",
        })
        resp = auth_client.get("/api/transactions/analytics/ai-accuracy")
        data = resp.json()
        assert data["total_predictions"] == 1
        assert data["correct_predictions"] == 0

    def test_learning_threshold_not_met(self, auth_client):
        """Merchant mapping NOT created with < 3 corrections."""
        for i in range(2):
            auth_client.post("/api/transactions", json={
                "amount": 100,
                "description": "Starbucks Coffee",
                "category": "Food",
                "ai_category": "Shopping",
                "ai_confidence": 0.5,
                "date": f"2026-01-{10+i}T10:00:00",
            })
        resp = auth_client.get("/api/transactions/analytics/ai-accuracy")
        assert resp.json()["learned_merchants"] == 0

    def test_learning_threshold_met(self, auth_client):
        """Merchant mapping created after 3+ corrections with 70%+ agreement."""
        for i in range(3):
            auth_client.post("/api/transactions", json={
                "amount": 100,
                "description": "Starbucks Coffee",
                "category": "Food",
                "ai_category": "Shopping",
                "ai_confidence": 0.5,
                "date": f"2026-01-{10+i}T10:00:00",
            })
        resp = auth_client.get("/api/transactions/analytics/ai-accuracy")
        assert resp.json()["learned_merchants"] == 1
