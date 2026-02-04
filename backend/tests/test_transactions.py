"""Tests for transaction endpoints."""


class TestTransactions:
    """Tests for transaction endpoints."""

    def test_create_transaction(self, client):
        """Test creating a new transaction."""
        response = client.post(
            "/api/transactions",
            json={
                "amount": 150.50,
                "description": "Grocery Store",
                "category": "Food",
                "date": "2024-01-15T10:30:00",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == "150.50"
        assert data["description"] == "Grocery Store"
        assert data["category"] == "Food"
        assert "id" in data

    def test_get_transactions_empty(self, client):
        """Test getting empty transaction list."""
        response = client.get("/api/transactions")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_get_transactions(self, client):
        """Test getting transaction list."""
        # Create transactions
        for i in range(3):
            client.post(
                "/api/transactions",
                json={
                    "amount": 100 + i,
                    "description": f"Store {i}",
                    "date": f"2024-01-{15+i}T10:00:00",
                },
            )

        response = client.get("/api/transactions")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total"] == 3

    def test_get_transaction_by_id(self, client):
        """Test getting a single transaction."""
        # Create transaction
        create_response = client.post(
            "/api/transactions",
            json={
                "amount": 200,
                "description": "Test Store",
                "date": "2024-01-15T10:00:00",
            },
        )
        transaction_id = create_response.json()["id"]

        # Get transaction
        response = client.get(f"/api/transactions/{transaction_id}")
        assert response.status_code == 200
        assert response.json()["description"] == "Test Store"

    def test_get_transaction_not_found(self, client):
        """Test getting non-existent transaction."""
        response = client.get("/api/transactions/999")
        assert response.status_code == 404

    def test_update_transaction(self, client):
        """Test updating a transaction."""
        # Create transaction
        create_response = client.post(
            "/api/transactions",
            json={
                "amount": 100,
                "description": "Original",
                "date": "2024-01-15T10:00:00",
            },
        )
        transaction_id = create_response.json()["id"]

        # Update transaction
        response = client.put(
            f"/api/transactions/{transaction_id}",
            json={"description": "Updated"},
        )
        assert response.status_code == 200
        assert response.json()["description"] == "Updated"
        assert float(response.json()["amount"]) == 100  # Unchanged

    def test_delete_transaction(self, client):
        """Test deleting a transaction."""
        # Create transaction
        create_response = client.post(
            "/api/transactions",
            json={
                "amount": 100,
                "description": "To Delete",
                "date": "2024-01-15T10:00:00",
            },
        )
        transaction_id = create_response.json()["id"]

        # Delete transaction
        response = client.delete(f"/api/transactions/{transaction_id}")
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/api/transactions/{transaction_id}")
        assert get_response.status_code == 404


class TestSearch:
    """Tests for search functionality (Phase 4.2)."""

    def test_search_by_description(self, client):
        """Test searching transactions by description."""
        # Create test transactions
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Starbucks Coffee",
            "date": "2024-01-15T10:00:00",
        })
        client.post("/api/transactions", json={
            "amount": 200,
            "description": "McDonald's",
            "date": "2024-01-16T10:00:00",
        })

        # Search for "coffee"
        response = client.get("/api/transactions?search=coffee")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert "Starbucks" in data["items"][0]["description"]

    def test_search_case_insensitive(self, client):
        """Test that search is case-insensitive."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Grocery Store",
            "date": "2024-01-15T10:00:00",
        })

        response = client.get("/api/transactions?search=GROCERY")
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_search_cyrillic(self, client):
        """Test searching with Cyrillic characters."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Пятёрочка",
            "date": "2024-01-15T10:00:00",
        })

        response = client.get("/api/transactions?search=Пятёрочка")
        assert response.status_code == 200
        assert response.json()["total"] == 1


class TestDateFilters:
    """Tests for date range filtering (Phase 4.2)."""

    def test_filter_by_date_from(self, client):
        """Test filtering transactions from a specific date."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Old",
            "date": "2024-01-10T10:00:00",
        })
        client.post("/api/transactions", json={
            "amount": 200,
            "description": "Recent",
            "date": "2024-01-20T10:00:00",
        })

        response = client.get("/api/transactions?date_from=2024-01-15T00:00:00")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["description"] == "Recent"

    def test_filter_by_date_to(self, client):
        """Test filtering transactions up to a specific date."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Old",
            "date": "2024-01-10T10:00:00",
        })
        client.post("/api/transactions", json={
            "amount": 200,
            "description": "Recent",
            "date": "2024-01-20T10:00:00",
        })

        response = client.get("/api/transactions?date_to=2024-01-15T23:59:59")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["description"] == "Old"

    def test_filter_by_date_range(self, client):
        """Test filtering transactions within a date range."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Before",
            "date": "2024-01-05T10:00:00",
        })
        client.post("/api/transactions", json={
            "amount": 200,
            "description": "Within",
            "date": "2024-01-15T10:00:00",
        })
        client.post("/api/transactions", json={
            "amount": 300,
            "description": "After",
            "date": "2024-01-25T10:00:00",
        })

        response = client.get("/api/transactions?date_from=2024-01-10T00:00:00&date_to=2024-01-20T23:59:59")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["description"] == "Within"


class TestCurrency:
    """Tests for multi-currency support (Phase 4.2)."""

    def test_create_transaction_with_currency(self, client):
        """Test creating transaction with different currencies."""
        currencies = ["RUB", "USD", "EUR", "GBP"]

        for currency in currencies:
            response = client.post("/api/transactions", json={
                "amount": 100,
                "description": f"Test {currency}",
                "date": "2024-01-15T10:00:00",
                "currency": currency,
            })
            assert response.status_code == 201
            data = response.json()
            assert data["currency"] == currency

    def test_default_currency_is_rub(self, client):
        """Test that default currency is RUB."""
        response = client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2024-01-15T10:00:00",
        })
        assert response.status_code == 201
        assert response.json()["currency"] == "RUB"

    def test_invalid_currency_rejected(self, client):
        """Test that invalid currency codes are rejected."""
        response = client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2024-01-15T10:00:00",
            "currency": "INVALID",
        })
        assert response.status_code == 422  # Validation error

    def test_update_currency(self, client):
        """Test updating transaction currency."""
        # Create transaction with RUB
        create_response = client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2024-01-15T10:00:00",
            "currency": "RUB",
        })
        transaction_id = create_response.json()["id"]

        # Update to USD
        update_response = client.put(f"/api/transactions/{transaction_id}", json={
            "currency": "USD",
        })
        assert update_response.status_code == 200
        assert update_response.json()["currency"] == "USD"


class TestCSVExport:
    """Tests for CSV export functionality (Phase 4.2)."""

    def test_export_csv_basic(self, client):
        """Test basic CSV export."""
        # Create transactions
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test 1",
            "date": "2024-01-15T10:00:00",
            "currency": "RUB",
        })

        response = client.get("/api/transactions/export")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]

    def test_export_csv_with_filters(self, client):
        """Test CSV export respects filters."""
        # Create transactions
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Food Store",
            "category": "Food",
            "date": "2024-01-15T10:00:00",
            "currency": "RUB",
        })
        client.post("/api/transactions", json={
            "amount": 200,
            "description": "Transport",
            "category": "Transport",
            "date": "2024-01-16T10:00:00",
            "currency": "USD",
        })

        # Export only Food category
        response = client.get("/api/transactions/export?category=Food")
        assert response.status_code == 200
        content = response.text
        assert "Food Store" in content
        assert "Transport" not in content

    def test_export_csv_with_search(self, client):
        """Test CSV export with search filter."""
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Starbucks",
            "date": "2024-01-15T10:00:00",
        })
        client.post("/api/transactions", json={
            "amount": 200,
            "description": "McDonald's",
            "date": "2024-01-16T10:00:00",
        })

        response = client.get("/api/transactions/export?search=starbucks")
        assert response.status_code == 200
        content = response.text
        assert "Starbucks" in content
        assert "McDonald" not in content

    def test_export_csv_utf8_bom(self, client):
        """Test that CSV export includes UTF-8 BOM for Excel compatibility."""
        response = client.get("/api/transactions/export")
        assert response.status_code == 200
        # UTF-8 BOM is \ufeff
        assert response.text.startswith('\ufeff')


class TestHealth:
    """Tests for health endpoint."""

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "version" in data
