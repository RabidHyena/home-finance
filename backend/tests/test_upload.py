"""Tests for upload endpoints: file validation, magic bytes, size limits."""

import io
import json
import struct
from unittest.mock import patch, MagicMock

import pytest

from app.routers.upload import _detect_image_type


class TestMagicByteDetection:
    """Tests for _detect_image_type function."""

    def test_jpeg(self):
        data = b"\xff\xd8\xff\xe0" + b"\x00" * 100
        assert _detect_image_type(data) == "jpeg"

    def test_png(self):
        data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        assert _detect_image_type(data) == "png"

    def test_gif87a(self):
        data = b"GIF87a" + b"\x00" * 100
        assert _detect_image_type(data) == "gif"

    def test_gif89a(self):
        data = b"GIF89a" + b"\x00" * 100
        assert _detect_image_type(data) == "gif"

    def test_webp(self):
        data = b"RIFF" + struct.pack("<I", 100) + b"WEBP" + b"\x00" * 100
        assert _detect_image_type(data) == "webp"

    def test_webp_without_webp_marker(self):
        data = b"RIFF" + struct.pack("<I", 100) + b"AVI " + b"\x00" * 100
        assert _detect_image_type(data) is None

    def test_unknown_format(self):
        data = b"\x00\x01\x02\x03" * 100
        assert _detect_image_type(data) is None

    def test_empty_data(self):
        assert _detect_image_type(b"") is None

    def test_too_short_data(self):
        assert _detect_image_type(b"\xff\xd8") is None


class TestUploadValidation:
    """Tests for upload endpoint validation."""

    def _make_jpeg_bytes(self, size: int = 100) -> bytes:
        """Create minimal JPEG-like bytes."""
        return b"\xff\xd8\xff\xe0" + b"\x00" * size

    def _make_png_bytes(self, size: int = 100) -> bytes:
        """Create minimal PNG-like bytes."""
        return b"\x89PNG\r\n\x1a\n" + b"\x00" * size

    def test_rejects_unauthenticated(self, client):
        resp = client.post("/api/upload", files={"file": ("test.jpg", b"data", "image/jpeg")})
        assert resp.status_code == 401

    def test_rejects_invalid_content_type(self, auth_client):
        resp = auth_client.post(
            "/api/upload",
            files={"file": ("test.txt", b"hello", "text/plain")},
        )
        assert resp.status_code == 400
        assert "Invalid file type" in resp.json()["detail"]

    def test_rejects_invalid_magic_bytes(self, auth_client):
        resp = auth_client.post(
            "/api/upload",
            files={"file": ("test.jpg", b"\x00\x01\x02\x03" * 100, "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "not a valid image" in resp.json()["detail"]

    @patch("app.routers.upload.get_settings")
    def test_rejects_oversized_file(self, mock_settings, auth_client):
        mock_settings.return_value = MagicMock(
            max_upload_size=100,
            upload_dir="/tmp/test_uploads",
        )
        data = self._make_jpeg_bytes(200)
        resp = auth_client.post(
            "/api/upload",
            files={"file": ("test.jpg", data, "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "too large" in resp.json()["detail"]

    def test_batch_rejects_too_many_files(self, auth_client):
        files = [("files", (f"test{i}.jpg", self._make_jpeg_bytes(), "image/jpeg")) for i in range(11)]
        resp = auth_client.post("/api/upload/batch", files=files)
        assert resp.status_code == 400
        assert "Maximum 10" in resp.json()["detail"]
