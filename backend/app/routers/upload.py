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
from app.services.ocr_service import OCRService

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Magic byte signatures for allowed image types
_IMAGE_SIGNATURES = [
    (b"\xff\xd8\xff", "jpeg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
    (b"RIFF", "webp"),  # WebP starts with RIFF....WEBP
]

_ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

_EXCEL_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
_EXCEL_EXTENSIONS = {".xlsx", ".xls"}

_ALLOWED_CONTENT_TYPES = _ALLOWED_IMAGE_CONTENT_TYPES | _EXCEL_CONTENT_TYPES
_ALLOWED_EXTENSIONS = _ALLOWED_IMAGE_EXTENSIONS | _EXCEL_EXTENSIONS


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


def _detect_file_type(content: bytes, content_type: str | None, filename: str | None) -> str:
    """Detect whether file is 'image' or 'excel'. Raises HTTPException if invalid."""
    ext = Path(filename).suffix.lower() if filename else ""

    # Check Excel by extension or content type
    if ext in _EXCEL_EXTENSIONS or content_type in _EXCEL_CONTENT_TYPES:
        # Verify magic bytes: xlsx is a ZIP (PK), xls is OLE2
        if content[:2] == b"PK" or content[:4] == b"\xd0\xcf\x11\xe0":
            return "excel"
        raise HTTPException(status_code=400, detail="File has Excel extension but invalid content")

    # Check image
    if _detect_image_type(content) is not None:
        return "image"

    raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: images (JPG, PNG, GIF, WebP) and Excel (.xlsx, .xls)")


async def _read_and_validate(file: UploadFile) -> tuple[bytes, str]:
    """Validate, read bytes, check size and type. Returns (content, file_type)."""
    content = await file.read()

    settings = get_settings()
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_upload_size // 1024 // 1024}MB",
        )

    file_type = _detect_file_type(content, file.content_type, file.filename)
    logger.info(
        "Validated upload: filename=%s, content_type=%s, size=%d, detected=%s",
        file.filename, file.content_type, len(content), file_type,
    )
    return content, file_type


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


def _parse_file(content: bytes, filename: str, file_type: str, db, user_id: int) -> dict:
    """Route parsing to the appropriate service based on file type."""
    if file_type == "excel":
        from app.services.excel_service import ExcelParsingService
        service = ExcelParsingService(db=db, user_id=user_id)
        return service.parse_excel_bytes(content, filename or "file.xlsx")
    else:
        ocr_service = OCRService(db=db, user_id=user_id)
        return ocr_service.parse_image_bytes_multiple(content, filename or "image.jpg")


@router.post("", response_model=ParsedTransactions)
async def upload_and_parse(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a bank screenshot or Excel statement and parse transaction data."""
    content, file_type = await _read_and_validate(file)
    filename = file.filename or ("file.xlsx" if file_type == "excel" else "image.jpg")
    file_path = _save_file(content, filename)

    try:
        result = _parse_file(content, filename, file_type, db, current_user.id)
        return ParsedTransactions(**result)
    except Exception:
        logger.exception("Failed to parse uploaded file")
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to parse file. Please try again.")


@router.post("/parse-only", response_model=ParsedTransaction)
async def parse_without_save(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse a bank screenshot without saving it (image only)."""
    content = await file.read()

    settings = get_settings()
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_upload_size // 1024 // 1024}MB",
        )

    if _detect_image_type(content) is None:
        raise HTTPException(status_code=400, detail="File content is not a valid image")

    ocr_service = OCRService(db=db, user_id=current_user.id)

    try:
        return ocr_service.parse_image_bytes(content, file.filename or "image.jpg")
    except Exception:
        logger.exception("Failed to parse image (parse-only)")
        raise HTTPException(status_code=500, detail="Failed to parse image. Please try again.")


@router.post("/batch", response_model=BatchUploadResponse)
async def upload_and_parse_batch(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and parse multiple bank screenshots and/or Excel statements."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")

    results = []
    successful = 0
    failed = 0

    for file in files:
        file_path = None
        try:
            content, file_type = await _read_and_validate(file)
            filename = file.filename or ("file.xlsx" if file_type == "excel" else "image.jpg")
            file_path = _save_file(content, filename)

            parsed = _parse_file(content, filename, file_type, db, current_user.id)
            results.append(BatchUploadResult(
                filename=file.filename or "unknown",
                status="success",
                data=ParsedTransactions(**parsed),
            ))
            successful += 1
        except Exception:
            logger.exception("Failed to parse file in batch: %s", file.filename)
            if file_path and file_path.exists():
                file_path.unlink(missing_ok=True)
            results.append(BatchUploadResult(
                filename=file.filename or "unknown",
                status="error",
                error="Failed to parse file",
            ))
            failed += 1

    return BatchUploadResponse(
        results=results,
        total_files=len(files),
        successful=successful,
        failed=failed,
    )
