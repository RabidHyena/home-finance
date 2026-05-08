"""Integration tests for audit logging."""

from unittest.mock import MagicMock

from app.models import AuditLog
from app.services.audit_service import log_audit
import tests.conftest as _conftest


def _get_audit_entries(action: str | None = None) -> list[AuditLog]:
    db = _conftest.TestingSessionLocal()
    try:
        q = db.query(AuditLog)
        if action:
            q = q.filter(AuditLog.action == action)
        return q.all()
    finally:
        db.close()


class TestAuditServiceUnit:
    def test_swallows_db_exception(self):
        bad_db = MagicMock()
        bad_db.add.side_effect = Exception("DB exploded")
        log_audit(bad_db, "test", user_id=1)  # must not raise

    def test_swallows_flush_exception(self):
        bad_db = MagicMock()
        bad_db.flush.side_effect = Exception("flush failed")
        log_audit(bad_db, "test", user_id=1)  # must not raise


class TestAuditOnAuth:
    def test_login_creates_audit_entry(self, client, test_user):
        client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "password123",
        })
        entries = _get_audit_entries("login")
        assert len(entries) == 1
        assert entries[0].user_id == test_user.id
        assert entries[0].resource_type == "user"

    def test_failed_login_creates_no_audit_entry(self, client, test_user):
        client.post("/api/auth/login", json={
            "login": "test@example.com",
            "password": "wrongpassword",
        })
        assert len(_get_audit_entries("login")) == 0

    def test_register_creates_audit_entry(self, client):
        client.post("/api/auth/register", json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "password123",
        })
        entries = _get_audit_entries("register")
        assert len(entries) == 1
        assert entries[0].resource_type == "user"
        assert entries[0].resource_id is not None


class TestAuditOnTransactions:
    def test_create_transaction_creates_audit_entry(self, auth_client, test_user):
        auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Coffee",
            "date": "2024-01-15T10:00:00",
        })
        entries = _get_audit_entries("create")
        assert len(entries) == 1
        assert entries[0].user_id == test_user.id
        assert entries[0].resource_type == "transaction"
        assert entries[0].resource_id is not None

    def test_update_transaction_creates_audit_entry(self, auth_client, test_user):
        r = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Coffee",
            "date": "2024-01-15T10:00:00",
        })
        tx_id = r.json()["id"]

        auth_client.put(f"/api/transactions/{tx_id}", json={"amount": 200})

        entries = _get_audit_entries("update")
        assert len(entries) == 1
        assert entries[0].resource_id == tx_id

    def test_delete_transaction_creates_audit_entry(self, auth_client, test_user):
        r = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Coffee",
            "date": "2024-01-15T10:00:00",
        })
        tx_id = r.json()["id"]

        auth_client.delete(f"/api/transactions/{tx_id}")

        entries = _get_audit_entries("delete")
        assert len(entries) == 1
        assert entries[0].resource_id == tx_id

    def test_multiple_operations_create_separate_entries(self, auth_client, test_user):
        r = auth_client.post("/api/transactions", json={
            "amount": 50,
            "description": "Lunch",
            "date": "2024-01-15T12:00:00",
        })
        tx_id = r.json()["id"]
        auth_client.put(f"/api/transactions/{tx_id}", json={"amount": 60})
        auth_client.delete(f"/api/transactions/{tx_id}")

        assert len(_get_audit_entries("create")) == 1
        assert len(_get_audit_entries("update")) == 1
        assert len(_get_audit_entries("delete")) == 1

    def test_unauthenticated_request_creates_no_audit_entry(self, client):
        client.post("/api/transactions", json={
            "amount": 100,
            "description": "Coffee",
            "date": "2024-01-15T10:00:00",
        })
        assert len(_get_audit_entries("create")) == 0
