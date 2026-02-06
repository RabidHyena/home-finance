"""Tests for budget endpoints."""


def make_budget(auth_client, **overrides):
    """Helper to create a budget."""
    data = {
        "category": "Food",
        "limit_amount": 10000,
        "period": "monthly",
        **overrides,
    }
    resp = auth_client.post("/api/budgets", json=data)
    assert resp.status_code == 201
    return resp.json()


def make_transaction(auth_client, **overrides):
    """Helper to create a transaction."""
    data = {
        "amount": 100.00,
        "description": "Test",
        "category": "Food",
        "date": "2026-01-15T10:00:00",
        **overrides,
    }
    resp = auth_client.post("/api/transactions", json=data)
    assert resp.status_code == 201
    return resp.json()


class TestBudgetCRUD:
    """Tests for budget CRUD operations."""

    def test_create_budget(self, auth_client):
        resp = auth_client.post("/api/budgets", json={
            "category": "Food",
            "limit_amount": 15000,
            "period": "monthly",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["category"] == "Food"
        assert float(data["limit_amount"]) == 15000
        assert data["period"] == "monthly"
        assert "id" in data

    def test_create_budget_weekly(self, auth_client):
        resp = auth_client.post("/api/budgets", json={
            "category": "Transport",
            "limit_amount": 2000,
            "period": "weekly",
        })
        assert resp.status_code == 201
        assert resp.json()["period"] == "weekly"

    def test_create_duplicate_category_rejected(self, auth_client):
        make_budget(auth_client, category="Food")
        resp = auth_client.post("/api/budgets", json={
            "category": "Food",
            "limit_amount": 20000,
            "period": "monthly",
        })
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"]

    def test_get_budgets_empty(self, auth_client):
        resp = auth_client.get("/api/budgets")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_budgets_list(self, auth_client):
        make_budget(auth_client, category="Food")
        make_budget(auth_client, category="Transport")
        resp = auth_client.get("/api/budgets")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_get_budget_by_id(self, auth_client):
        budget = make_budget(auth_client, category="Shopping", limit_amount=5000)
        resp = auth_client.get(f"/api/budgets/{budget['id']}")
        assert resp.status_code == 200
        assert resp.json()["category"] == "Shopping"

    def test_get_budget_not_found(self, auth_client):
        resp = auth_client.get("/api/budgets/999")
        assert resp.status_code == 404

    def test_update_budget(self, auth_client):
        budget = make_budget(auth_client, category="Food", limit_amount=10000)
        resp = auth_client.put(f"/api/budgets/{budget['id']}", json={
            "limit_amount": 20000,
        })
        assert resp.status_code == 200
        assert float(resp.json()["limit_amount"]) == 20000
        assert resp.json()["category"] == "Food"  # unchanged

    def test_update_budget_not_found(self, auth_client):
        resp = auth_client.put("/api/budgets/999", json={"limit_amount": 5000})
        assert resp.status_code == 404

    def test_delete_budget(self, auth_client):
        budget = make_budget(auth_client)
        resp = auth_client.delete(f"/api/budgets/{budget['id']}")
        assert resp.status_code == 204

        resp = auth_client.get(f"/api/budgets/{budget['id']}")
        assert resp.status_code == 404

    def test_delete_budget_not_found(self, auth_client):
        resp = auth_client.delete("/api/budgets/999")
        assert resp.status_code == 404


class TestBudgetStatus:
    """Tests for budget status with spending calculations."""

    def test_status_no_spending(self, auth_client):
        make_budget(auth_client, category="Food", limit_amount=10000)
        resp = auth_client.get("/api/budgets/status?year=2026&month=1")
        assert resp.status_code == 200
        statuses = resp.json()
        assert len(statuses) == 1
        s = statuses[0]
        assert float(s["spent"]) == 0
        assert float(s["remaining"]) == 10000
        assert s["percentage"] == 0
        assert s["exceeded"] is False

    def test_status_with_spending(self, auth_client):
        make_budget(auth_client, category="Food", limit_amount=10000)
        make_transaction(auth_client, amount=3000, category="Food", date="2026-01-10T10:00:00")
        make_transaction(auth_client, amount=2000, category="Food", date="2026-01-20T10:00:00")

        resp = auth_client.get("/api/budgets/status?year=2026&month=1")
        statuses = resp.json()
        assert len(statuses) == 1
        s = statuses[0]
        assert float(s["spent"]) == 5000
        assert float(s["remaining"]) == 5000
        assert s["percentage"] == 50.0
        assert s["exceeded"] is False

    def test_status_exceeded(self, auth_client):
        make_budget(auth_client, category="Food", limit_amount=5000)
        make_transaction(auth_client, amount=6000, category="Food", date="2026-01-15T10:00:00")

        resp = auth_client.get("/api/budgets/status?year=2026&month=1")
        statuses = resp.json()
        s = statuses[0]
        assert float(s["spent"]) == 6000
        assert float(s["remaining"]) == -1000
        assert s["percentage"] == 120.0
        assert s["exceeded"] is True

    def test_status_ignores_other_categories(self, auth_client):
        make_budget(auth_client, category="Food", limit_amount=10000)
        make_transaction(auth_client, amount=5000, category="Food", date="2026-01-15T10:00:00")
        make_transaction(auth_client, amount=3000, category="Transport", date="2026-01-15T10:00:00")

        resp = auth_client.get("/api/budgets/status?year=2026&month=1")
        statuses = resp.json()
        assert float(statuses[0]["spent"]) == 5000  # only Food

    def test_status_ignores_other_months(self, auth_client):
        make_budget(auth_client, category="Food", limit_amount=10000)
        make_transaction(auth_client, amount=5000, category="Food", date="2026-01-15T10:00:00")
        make_transaction(auth_client, amount=3000, category="Food", date="2026-02-15T10:00:00")

        resp = auth_client.get("/api/budgets/status?year=2026&month=1")
        statuses = resp.json()
        assert float(statuses[0]["spent"]) == 5000  # only January

    def test_status_multiple_budgets(self, auth_client):
        make_budget(auth_client, category="Food", limit_amount=10000)
        make_budget(auth_client, category="Transport", limit_amount=5000)
        make_transaction(auth_client, amount=3000, category="Food", date="2026-01-15T10:00:00")
        make_transaction(auth_client, amount=2000, category="Transport", date="2026-01-15T10:00:00")

        resp = auth_client.get("/api/budgets/status?year=2026&month=1")
        statuses = resp.json()
        assert len(statuses) == 2

    def test_status_empty_budgets(self, auth_client):
        resp = auth_client.get("/api/budgets/status?year=2026&month=1")
        assert resp.status_code == 200
        assert resp.json() == []
