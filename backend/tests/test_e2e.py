"""End-to-end API tests for full integration scenarios."""

import io


def make_transaction(client, **overrides):
    """Helper to create a transaction and return the response data."""
    data = {
        "amount": 100.00,
        "description": "Test purchase",
        "category": "Food",
        "date": "2026-01-15T10:00:00",
        **overrides,
    }
    resp = client.post("/api/transactions", json=data)
    assert resp.status_code == 201
    return resp.json()


class TestCRUDLifecycle:
    """Full create -> read -> update -> delete lifecycle."""

    def test_full_lifecycle(self, client):
        # Create
        created = make_transaction(client, amount=250.50, description="Supermarket")
        tid = created["id"]
        assert float(created["amount"]) == 250.50
        assert created["description"] == "Supermarket"
        assert created["category"] == "Food"

        # Read
        resp = client.get(f"/api/transactions/{tid}")
        assert resp.status_code == 200
        assert resp.json()["description"] == "Supermarket"

        # Update
        resp = client.put(
            f"/api/transactions/{tid}",
            json={"description": "Updated Supermarket", "amount": 300},
        )
        assert resp.status_code == 200
        updated = resp.json()
        assert updated["description"] == "Updated Supermarket"
        assert float(updated["amount"]) == 300
        assert updated["category"] == "Food"  # unchanged

        # Verify update persisted
        resp = client.get(f"/api/transactions/{tid}")
        assert resp.json()["description"] == "Updated Supermarket"

        # Delete
        resp = client.delete(f"/api/transactions/{tid}")
        assert resp.status_code == 204

        # Verify deleted
        resp = client.get(f"/api/transactions/{tid}")
        assert resp.status_code == 404

    def test_create_minimal_fields(self, client):
        """Transaction with only required fields (no category)."""
        resp = client.post(
            "/api/transactions",
            json={
                "amount": 50,
                "description": "Cash payment",
                "date": "2026-01-10T12:00:00",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["category"] == "Other"  # defaults to Other
        assert data["image_path"] is None

    def test_create_with_all_fields(self, client):
        resp = client.post(
            "/api/transactions",
            json={
                "amount": 999.99,
                "description": "Full data transaction",
                "category": "Shopping",
                "date": "2026-02-01T08:30:00",
                "image_path": "/uploads/test.jpg",
                "raw_text": "Some OCR text",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["image_path"] == "/uploads/test.jpg"
        assert data["raw_text"] == "Some OCR text"


class TestPagination:
    """Test pagination parameters."""

    def test_pagination_basic(self, client):
        for i in range(15):
            make_transaction(
                client,
                description=f"Item {i}",
                date=f"2026-01-{i+1:02d}T10:00:00",
            )

        # Page 1 with 5 per page
        resp = client.get("/api/transactions?page=1&per_page=5")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 5
        assert data["total"] == 15
        assert data["page"] == 1
        assert data["per_page"] == 5

        # Page 2
        resp = client.get("/api/transactions?page=2&per_page=5")
        data = resp.json()
        assert len(data["items"]) == 5
        assert data["page"] == 2

        # Page 3 (last)
        resp = client.get("/api/transactions?page=3&per_page=5")
        data = resp.json()
        assert len(data["items"]) == 5
        assert data["page"] == 3

        # Page 4 (beyond data)
        resp = client.get("/api/transactions?page=4&per_page=5")
        data = resp.json()
        assert len(data["items"]) == 0
        assert data["total"] == 15

    def test_default_pagination(self, client):
        for i in range(3):
            make_transaction(client, description=f"Item {i}")

        resp = client.get("/api/transactions")
        data = resp.json()
        assert data["page"] == 1
        assert data["per_page"] == 20
        assert len(data["items"]) == 3

    def test_transactions_ordered_by_date_desc(self, client):
        make_transaction(client, description="Old", date="2026-01-01T10:00:00")
        make_transaction(client, description="New", date="2026-01-15T10:00:00")
        make_transaction(client, description="Mid", date="2026-01-10T10:00:00")

        resp = client.get("/api/transactions")
        items = resp.json()["items"]
        assert items[0]["description"] == "New"
        assert items[1]["description"] == "Mid"
        assert items[2]["description"] == "Old"


class TestCategoryFiltering:
    """Test filtering transactions by category."""

    def test_filter_by_category(self, client):
        make_transaction(client, category="Food", description="Grocery")
        make_transaction(client, category="Food", description="Restaurant")
        make_transaction(client, category="Transport", description="Taxi")
        make_transaction(client, category="Shopping", description="Clothes")

        # Filter Food
        resp = client.get("/api/transactions?category=Food")
        data = resp.json()
        assert data["total"] == 2
        descriptions = {item["description"] for item in data["items"]}
        assert descriptions == {"Grocery", "Restaurant"}

        # Filter Transport
        resp = client.get("/api/transactions?category=Transport")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["description"] == "Taxi"

    def test_filter_nonexistent_category(self, client):
        make_transaction(client, category="Food")

        resp = client.get("/api/transactions?category=NonExistent")
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_no_filter_returns_all(self, client):
        make_transaction(client, category="Food")
        make_transaction(client, category="Transport")

        resp = client.get("/api/transactions")
        assert resp.json()["total"] == 2


class TestMonthlyReports:
    """Test monthly report aggregation."""

    def test_reports_aggregation(self, client):
        # January transactions
        make_transaction(client, amount=100, category="Food", date="2026-01-05T10:00:00")
        make_transaction(client, amount=200, category="Transport", date="2026-01-15T10:00:00")
        make_transaction(client, amount=50, category="Food", date="2026-01-20T10:00:00")

        # February transactions
        make_transaction(client, amount=300, category="Shopping", date="2026-02-10T10:00:00")

        resp = client.get("/api/transactions/reports/monthly")
        assert resp.status_code == 200
        reports = resp.json()
        assert len(reports) == 2

        # Reports ordered by date desc, so February first
        feb = reports[0]
        assert feb["year"] == 2026
        assert feb["month"] == 2
        assert float(feb["total_amount"]) == 300.0
        assert feb["transaction_count"] == 1

        jan = reports[1]
        assert jan["year"] == 2026
        assert jan["month"] == 1
        assert float(jan["total_amount"]) == 350.0
        assert jan["transaction_count"] == 3
        assert float(jan["by_category"]["Food"]) == 150.0
        assert float(jan["by_category"]["Transport"]) == 200.0

    def test_reports_filter_by_year(self, client):
        make_transaction(client, date="2025-12-01T10:00:00")
        make_transaction(client, date="2026-01-01T10:00:00")

        resp = client.get("/api/transactions/reports/monthly?year=2026")
        reports = resp.json()
        assert len(reports) == 1
        assert reports[0]["year"] == 2026

    def test_reports_empty(self, client):
        resp = client.get("/api/transactions/reports/monthly")
        assert resp.status_code == 200
        assert resp.json() == []


class TestUploadValidation:
    """Test upload endpoint validation."""

    def test_upload_invalid_file_type(self, client):
        file = io.BytesIO(b"not an image")
        resp = client.post(
            "/api/upload",
            files={"file": ("test.txt", file, "text/plain")},
        )
        assert resp.status_code == 400
        assert "Invalid file type" in resp.json()["detail"]

    def test_upload_invalid_file_type_pdf(self, client):
        file = io.BytesIO(b"%PDF-1.4 fake pdf content")
        resp = client.post(
            "/api/upload",
            files={"file": ("doc.pdf", file, "application/pdf")},
        )
        assert resp.status_code == 400


class TestInputValidation:
    """Test request validation."""

    def test_negative_amount_rejected(self, client):
        resp = client.post(
            "/api/transactions",
            json={
                "amount": -100,
                "description": "Negative",
                "date": "2026-01-15T10:00:00",
            },
        )
        assert resp.status_code == 422

    def test_missing_required_fields(self, client):
        # Missing amount
        resp = client.post(
            "/api/transactions",
            json={"description": "No amount", "date": "2026-01-15T10:00:00"},
        )
        assert resp.status_code == 422

        # Missing description
        resp = client.post(
            "/api/transactions",
            json={"amount": 100, "date": "2026-01-15T10:00:00"},
        )
        assert resp.status_code == 422

        # Missing date
        resp = client.post(
            "/api/transactions",
            json={"amount": 100, "description": "No date"},
        )
        assert resp.status_code == 422

    def test_description_too_long(self, client):
        resp = client.post(
            "/api/transactions",
            json={
                "amount": 100,
                "description": "x" * 501,
                "date": "2026-01-15T10:00:00",
            },
        )
        assert resp.status_code == 422

    def test_zero_amount_allowed(self, client):
        resp = client.post(
            "/api/transactions",
            json={
                "amount": 0,
                "description": "Free item",
                "date": "2026-01-15T10:00:00",
            },
        )
        assert resp.status_code == 201

    def test_invalid_date_format(self, client):
        resp = client.post(
            "/api/transactions",
            json={
                "amount": 100,
                "description": "Bad date",
                "date": "not-a-date",
            },
        )
        assert resp.status_code == 422


class TestEdgeCases:
    """Edge cases and error handling."""

    def test_update_nonexistent(self, client):
        resp = client.put(
            "/api/transactions/99999",
            json={"description": "Ghost"},
        )
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/transactions/99999")
        assert resp.status_code == 404

    def test_get_nonexistent(self, client):
        resp = client.get("/api/transactions/99999")
        assert resp.status_code == 404

    def test_partial_update(self, client):
        """Updating one field should not affect others."""
        created = make_transaction(
            client,
            amount=500,
            description="Original",
            category="Food",
        )
        tid = created["id"]

        resp = client.put(
            f"/api/transactions/{tid}",
            json={"category": "Transport"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["category"] == "Transport"
        assert float(data["amount"]) == 500
        assert data["description"] == "Original"

    def test_multiple_deletes_same_id(self, client):
        created = make_transaction(client)
        tid = created["id"]

        resp = client.delete(f"/api/transactions/{tid}")
        assert resp.status_code == 204

        resp = client.delete(f"/api/transactions/{tid}")
        assert resp.status_code == 404

    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert "docs" in data
