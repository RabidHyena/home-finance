"""Tests for analytics endpoints (comparison, trends, forecast, ai-accuracy)."""


def make_transaction(client, **overrides):
    """Helper to create a transaction."""
    data = {
        "amount": 100.00,
        "description": "Test",
        "category": "Food",
        "date": "2026-01-15T10:00:00",
        **overrides,
    }
    resp = client.post("/api/transactions", json=data)
    assert resp.status_code == 201
    return resp.json()


class TestAIAccuracy:
    """Tests for AI accuracy endpoint."""

    def test_no_predictions(self, client):
        resp = client.get("/api/transactions/analytics/ai-accuracy")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_predictions"] == 0
        assert data["correct_predictions"] == 0
        assert data["accuracy_percentage"] == 0
        assert data["learned_merchants"] == 0

    def test_all_correct(self, client):
        make_transaction(client, category="Food", ai_category="Food", ai_confidence=0.95)
        make_transaction(client, category="Transport", ai_category="Transport", ai_confidence=0.90)

        resp = client.get("/api/transactions/analytics/ai-accuracy")
        data = resp.json()
        assert data["total_predictions"] == 2
        assert data["correct_predictions"] == 2
        assert data["accuracy_percentage"] == 100.0

    def test_mixed_accuracy(self, client):
        make_transaction(client, category="Food", ai_category="Food", ai_confidence=0.9)
        make_transaction(client, category="Transport", ai_category="Food", ai_confidence=0.6)

        resp = client.get("/api/transactions/analytics/ai-accuracy")
        data = resp.json()
        assert data["total_predictions"] == 2
        assert data["correct_predictions"] == 1
        assert data["accuracy_percentage"] == 50.0

    def test_ignores_transactions_without_ai(self, client):
        make_transaction(client, category="Food")  # no ai_category
        make_transaction(client, category="Food", ai_category="Food", ai_confidence=0.9)

        resp = client.get("/api/transactions/analytics/ai-accuracy")
        data = resp.json()
        assert data["total_predictions"] == 1


class TestMonthComparison:
    """Tests for month-to-month comparison."""

    def test_comparison_basic(self, client):
        # December 2025
        make_transaction(client, amount=5000, category="Food", date="2025-12-10T10:00:00")
        make_transaction(client, amount=3000, category="Transport", date="2025-12-15T10:00:00")

        # January 2026
        make_transaction(client, amount=7000, category="Food", date="2026-01-10T10:00:00")
        make_transaction(client, amount=2000, category="Transport", date="2026-01-15T10:00:00")
        make_transaction(client, amount=1000, category="Shopping", date="2026-01-20T10:00:00")

        resp = client.get("/api/transactions/analytics/comparison?year=2026&month=1")
        assert resp.status_code == 200
        data = resp.json()

        assert data["current_month"] == {"year": 2026, "month": 1}
        assert data["previous_month"] == {"year": 2025, "month": 12}
        assert data["current"]["total"] == 10000
        assert data["current"]["count"] == 3
        assert data["previous"]["total"] == 8000
        assert data["previous"]["count"] == 2
        assert data["changes"]["total_percent"] == 25.0

    def test_comparison_empty_previous(self, client):
        make_transaction(client, amount=5000, category="Food", date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/comparison?year=2026&month=1")
        data = resp.json()
        assert data["current"]["total"] == 5000
        assert data["previous"]["total"] == 0
        assert data["changes"]["total_percent"] == 0  # no previous to compare

    def test_comparison_empty_current(self, client):
        make_transaction(client, amount=5000, category="Food", date="2025-12-15T10:00:00")

        resp = client.get("/api/transactions/analytics/comparison?year=2026&month=1")
        data = resp.json()
        assert data["current"]["total"] == 0
        assert data["previous"]["total"] == 5000

    def test_comparison_category_breakdown(self, client):
        make_transaction(client, amount=3000, category="Food", date="2026-01-10T10:00:00")
        make_transaction(client, amount=2000, category="Transport", date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/comparison?year=2026&month=1")
        data = resp.json()
        assert data["current"]["by_category"]["Food"] == 3000
        assert data["current"]["by_category"]["Transport"] == 2000

    def test_comparison_requires_year_and_month(self, client):
        resp = client.get("/api/transactions/analytics/comparison")
        assert resp.status_code == 422  # missing required params


class TestTrends:
    """Tests for spending trends endpoint."""

    def test_trends_with_data(self, client):
        # Create transactions across several months
        make_transaction(client, amount=5000, date="2025-09-15T10:00:00")
        make_transaction(client, amount=6000, date="2025-10-15T10:00:00")
        make_transaction(client, amount=4000, date="2025-11-15T10:00:00")
        make_transaction(client, amount=7000, date="2025-12-15T10:00:00")
        make_transaction(client, amount=5500, date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/trends?months=6")
        assert resp.status_code == 200
        data = resp.json()
        assert data["period"] == "6 months"
        assert "data" in data
        assert "trend_line" in data
        assert "statistics" in data
        assert data["statistics"]["average"] > 0

    def test_trends_empty(self, client):
        resp = client.get("/api/transactions/analytics/trends?months=6")
        assert resp.status_code == 200
        data = resp.json()
        assert data["statistics"]["average"] == 0

    def test_trends_has_trend_line(self, client):
        make_transaction(client, amount=1000, date="2025-11-15T10:00:00")
        make_transaction(client, amount=2000, date="2025-12-15T10:00:00")
        make_transaction(client, amount=3000, date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/trends?months=3")
        data = resp.json()
        assert len(data["trend_line"]) > 0

    def test_trends_statistics(self, client):
        make_transaction(client, amount=1000, date="2025-12-15T10:00:00")
        make_transaction(client, amount=3000, date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/trends?months=3")
        data = resp.json()
        stats = data["statistics"]
        assert "average" in stats
        assert "std_deviation" in stats
        assert "min" in stats
        assert "max" in stats
        assert stats["min"] <= stats["average"] <= stats["max"]


class TestForecast:
    """Tests for spending forecast endpoint."""

    def test_forecast_with_data(self, client):
        make_transaction(client, amount=5000, date="2025-09-15T10:00:00")
        make_transaction(client, amount=6000, date="2025-10-15T10:00:00")
        make_transaction(client, amount=4000, date="2025-11-15T10:00:00")
        make_transaction(client, amount=7000, date="2025-12-15T10:00:00")
        make_transaction(client, amount=5500, date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/forecast?history_months=6&forecast_months=3")
        assert resp.status_code == 200
        data = resp.json()
        assert "historical" in data
        assert "forecast" in data
        assert "statistics" in data
        assert len(data["forecast"]) == 3

        # Each forecast has confidence intervals
        for f in data["forecast"]:
            assert f["is_forecast"] is True
            assert "confidence_min" in f
            assert "confidence_max" in f
            assert f["confidence_min"] <= f["amount"] <= f["confidence_max"]

    def test_forecast_empty_data(self, client):
        resp = client.get("/api/transactions/analytics/forecast")
        assert resp.status_code == 200
        data = resp.json()
        assert data["forecast"] == []
        assert data["statistics"]["average"] == 0

    def test_forecast_statistics(self, client):
        make_transaction(client, amount=5000, date="2025-10-15T10:00:00")
        make_transaction(client, amount=6000, date="2025-11-15T10:00:00")
        make_transaction(client, amount=7000, date="2025-12-15T10:00:00")
        make_transaction(client, amount=8000, date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/forecast?history_months=6")
        data = resp.json()
        stats = data["statistics"]
        assert stats["average"] > 0
        assert stats["confidence_interval"]["min"] >= 0
        assert stats["confidence_interval"]["max"] >= stats["average"]

    def test_forecast_historical_not_forecast(self, client):
        make_transaction(client, amount=5000, date="2026-01-15T10:00:00")

        resp = client.get("/api/transactions/analytics/forecast?history_months=3")
        data = resp.json()
        for h in data["historical"]:
            assert h["is_forecast"] is False
