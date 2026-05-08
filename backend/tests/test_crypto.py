"""Tests for PII field encryption."""


class TestEncryptedFields:
    def test_raw_text_is_stored_encrypted_in_db(self, auth_client, test_user):
        """raw_text in DB should not be plaintext after creating a transaction."""
        from tests.conftest import TestingSessionLocal
        import sqlalchemy as sa

        auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15T10:00:00",
            "raw_text": "secret bank receipt text",
        })

        db = TestingSessionLocal()
        try:
            # Read raw value directly bypassing TypeDecorator
            result = db.execute(sa.text("SELECT raw_text FROM transactions LIMIT 1")).fetchone()
            raw_value = result[0]
            assert raw_value is not None
            assert raw_value != "secret bank receipt text"
            assert len(raw_value) > len("secret bank receipt text")
        finally:
            db.close()

    def test_raw_text_is_decrypted_when_read_via_api(self, auth_client):
        """API response should return plaintext raw_text."""
        create_resp = auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15T10:00:00",
            "raw_text": "secret bank receipt text",
        })
        tx_id = create_resp.json()["id"]

        get_resp = auth_client.get(f"/api/transactions/{tx_id}")
        assert get_resp.json()["raw_text"] == "secret bank receipt text"

    def test_image_path_is_not_user_settable(self, auth_client):
        """image_path is server-set only; user-supplied values must be ignored."""
        from tests.conftest import TestingSessionLocal
        import sqlalchemy as sa

        auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test",
            "date": "2026-01-15T10:00:00",
            "image_path": "/app/uploads/test-image.jpg",  # should be stripped by API
        })

        db = TestingSessionLocal()
        try:
            result = db.execute(sa.text("SELECT image_path FROM transactions LIMIT 1")).fetchone()
            raw_value = result[0]
            assert raw_value is None  # user-supplied image_path not accepted
        finally:
            db.close()

    def test_null_pii_fields_remain_null(self, auth_client):
        """NULL fields should stay NULL, not encrypted empty string."""
        from tests.conftest import TestingSessionLocal
        import sqlalchemy as sa

        auth_client.post("/api/transactions", json={
            "amount": 100,
            "description": "Test no PII",
            "date": "2026-01-15T10:00:00",
        })

        db = TestingSessionLocal()
        try:
            result = db.execute(sa.text(
                "SELECT raw_text, image_path FROM transactions WHERE description = 'Test no PII' LIMIT 1"
            )).fetchone()
            assert result[0] is None
            assert result[1] is None
        finally:
            db.close()
