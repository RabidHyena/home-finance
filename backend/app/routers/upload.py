import logging
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import ParsedTransaction, ParsedTransactions, BatchUploadResult, BatchUploadResponse
from app.services.ocr_service import OCRService, get_ocr_service

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Magic byte signatures for allowed image types
_IMAGE_SIGNATURES = [
    (b"\xff\xd8\xff", "jpeg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
    (b"RIFF", "webp"),  # WebP starts with RIFF....WEBP
]

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def _detect_image_type(data: bytes) -> str | None:
    """Detect image type from magic bytes. Returns type name or None."""
    for sig, img_type in _IMAGE_SIGNATURES:
        if data[:len(sig)] == sig:
            if img_type == "webp":
                if len(data) >= 12 and data[8:12] == b"WEBP":
                    return "webp"
                continue
            return img_type
    return None


async def _read_and_validate(file: UploadFile) -> bytes:
    """Validate content type, read bytes, check size and magic bytes."""
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(_ALLOWED_CONTENT_TYPES)}",
        )

    content = await file.read()

    settings = get_settings()
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_upload_size // 1024 // 1024}MB",
        )

    if _detect_image_type(content) is None:
        raise HTTPException(status_code=400, detail="File content is not a valid image")

    return content


def _save_file(content: bytes, filename: str) -> Path:
    """Save uploaded content to disk, return the file path."""
    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(filename).suffix.lower()
    if file_ext not in _ALLOWED_EXTENSIONS:
        file_ext = ".jpg"

    file_path = upload_dir / f"{uuid.uuid4()}{file_ext}"
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path


@router.post("", response_model=ParsedTransactions)
async def upload_and_parse(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a bank screenshot and parse ALL transaction data."""
    content = await _read_and_validate(file)
    file_path = _save_file(content, file.filename or "image.jpg")

    ocr_service.db = db
    ocr_service.user_id = current_user.id

    try:
        result = ocr_service.parse_image_bytes_multiple(content, file.filename or "image.jpg")
        return ParsedTransactions(**result)
    except Exception:
        logger.exception("Failed to parse uploaded image")
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to parse image. Please try again.")


@router.post("/parse-only", response_model=ParsedTransaction)
async def parse_without_save(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse a bank screenshot without saving it."""
    content = await _read_and_validate(file)

    ocr_service.db = db
    ocr_service.user_id = current_user.id

    try:
        return ocr_service.parse_image_bytes(content, file.filename or "image.jpg")
    except Exception:
        logger.exception("Failed to parse image (parse-only)")
        raise HTTPException(status_code=500, detail="Failed to parse image. Please try again.")


@router.post("/batch", response_model=BatchUploadResponse)
async def upload_and_parse_batch(
    files: List[UploadFile] = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and parse multiple bank screenshots."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")

    ocr_service.db = db
    ocr_service.user_id = current_user.id

    results = []
    successful = 0
    failed = 0

    for file in files:
        file_path = None
        try:
            content = await _read_and_validate(file)
            file_path = _save_file(content, file.filename or "image.jpg")

            parsed = ocr_service.parse_image_bytes_multiple(content, file.filename or "image.jpg")
            results.append(BatchUploadResult(
                filename=file.filename or "unknown",
                status="success",
                data=ParsedTransactions(**parsed),
            ))
            successful += 1
        except Exception:
            logger.exception("Failed to parse image in batch: %s", file.filename)
            if file_path and file_path.exists():
                file_path.unlink(missing_ok=True)
            results.append(BatchUploadResult(
                filename=file.filename or "unknown",
                status="error",
                error="Failed to parse image",
            ))
            failed += 1

    return BatchUploadResponse(
        results=results,
        total_files=len(files),
        successful=successful,
        failed=failed,
    )
