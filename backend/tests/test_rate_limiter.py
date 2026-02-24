"""Tests for rate limiter and chart parsing in OCR service."""

import json
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock

import pytest
from fastapi import HTTPException

from app.rate_limiter import RateLimiter
from app.config import get_settings
from app.services.ocr_service import OCRService


class TestRateLimiter:
    """Tests for in-memory rate limiter."""

    def setup_method(self):
        """Create a fresh limiter before each test."""
        settings = get_settings()
        self.max_requests = settings.rate_limit_max_requests
        self.window = settings.rate_limit_window
        self.limiter = RateLimiter(
            window=self.window,
            max_requests=self.max_requests,
        )

    def test_allows_requests_under_limit(self):
        for _ in range(self.max_requests - 1):
            self.limiter.check("1.2.3.4")
        # Should not raise

    def test_blocks_requests_over_limit(self):
        for _ in range(self.max_requests):
            self.limiter.check("1.2.3.4")
        with pytest.raises(HTTPException) as exc_info:
            self.limiter.check("1.2.3.4")
        assert exc_info.value.status_code == 429

    def test_different_ips_independent(self):
        for _ in range(self.max_requests):
            self.limiter.check("1.1.1.1")
        # Different IP should still work
        self.limiter.check("2.2.2.2")

    def test_expired_entries_cleaned(self):
        """Requests outside the window should be ignored."""
        past = time.time() - self.window - 10
        self.limiter._store["5.5.5.5"] = [past] * self.max_requests
        # Should not raise — old entries are expired
        self.limiter.check("5.5.5.5")

    def test_cleanup_removes_expired_ips(self):
        past = time.time() - self.window - 10
        self.limiter._store["old.ip"] = [past]
        self.limiter._store["fresh.ip"] = [time.time()]
        self.limiter._cleanup(time.time())
        assert "old.ip" not in self.limiter._store
        assert "fresh.ip" in self.limiter._store

    def test_clear(self):
        self.limiter.check("1.2.3.4")
        assert len(self.limiter._store) > 0
        self.limiter.clear()
        assert len(self.limiter._store) == 0


class TestChartParsing:
    """Tests for OCR chart data parsing."""

    def _make_service(self):
        with patch("app.services.ocr_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                openrouter_api_key="test-key",
                openrouter_model="test-model",
            )
            return OCRService()

    def test_chart_with_period_type(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [],
            "total_amount": 0,
            "chart": {
                "type": "pie",
                "categories": [
                    {"name": "Food", "value": 5000, "percentage": 50},
                    {"name": "Transport", "value": 5000, "percentage": 50},
                ],
                "total": 10000,
                "period": "2026",
                "period_type": "year",
                "confidence": 0.9,
            }
        })
        result = svc._parse_multiple_response(response)
        chart = result["chart"]
        assert chart is not None
        assert chart["type"] == "pie"
        assert chart["period"] == "2026"
        assert chart["period_type"] == "year"
        assert chart["confidence"] == 0.9

    def test_chart_month_period(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [],
            "total_amount": 0,
            "chart": {
                "type": "bar",
                "categories": [{"name": "Food", "value": 3000}],
                "total": 3000,
                "period": "2026-01",
                "period_type": "month",
                "confidence": 0.85,
            }
        })
        result = svc._parse_multiple_response(response)
        chart = result["chart"]
        assert chart["period"] == "2026-01"
        assert chart["period_type"] == "month"

    def test_chart_range_period(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [],
            "total_amount": 0,
            "chart": {
                "type": "bar",
                "categories": [{"name": "Bills", "value": 12000}],
                "total": 12000,
                "period": "2025-06 to 2026-01",
                "period_type": "custom",
                "confidence": 0.8,
            }
        })
        result = svc._parse_multiple_response(response)
        chart = result["chart"]
        assert chart["period"] == "2025-06 to 2026-01"
        assert chart["period_type"] == "custom"

    def test_chart_with_no_percentage(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [],
            "total_amount": 0,
            "chart": {
                "type": "pie",
                "categories": [
                    {"name": "Food", "value": 7000},
                    {"name": "Transport", "value": 3000},
                ],
                "total": 10000,
                "confidence": 0.7,
            }
        })
        result = svc._parse_multiple_response(response)
        chart = result["chart"]
        assert len(chart["categories"]) == 2
        assert chart["categories"][0]["percentage"] is None

    def test_chart_empty_categories_returns_none(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [],
            "total_amount": 0,
            "chart": {
                "type": "pie",
                "categories": [],
                "total": 0,
                "confidence": 0.5,
            }
        })
        result = svc._parse_multiple_response(response)
        assert result["chart"] is None

    def test_chart_invalid_category_value_skipped(self):
        svc = self._make_service()
        response = json.dumps({
            "transactions": [],
            "total_amount": 0,
            "chart": {
                "type": "pie",
                "categories": [
                    {"name": "Food", "value": 5000},
                    {"name": "Bad", "value": "not-a-number"},
                ],
                "total": 5000,
                "confidence": 0.5,
            }
        })
        result = svc._parse_multiple_response(response)
        chart = result["chart"]
        assert len(chart["categories"]) == 1
        assert chart["categories"][0]["name"] == "Food"

    def test_total_amount_fallback_to_sum(self):
        """When total_amount is invalid, should sum transaction amounts."""
        svc = self._make_service()
        response = json.dumps({
            "transactions": [
                {"amount": 100, "description": "A", "date": "2026-01-15", "category": "Food", "confidence": 0.9},
                {"amount": 200, "description": "B", "date": "2026-01-16", "category": "Food", "confidence": 0.9},
            ],
            "total_amount": "invalid",
        })
        result = svc._parse_multiple_response(response)
        assert result["total_amount"] == Decimal("300")
