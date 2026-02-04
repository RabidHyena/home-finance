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


class TestHealth:
    """Tests for health endpoint."""

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "version" in data
