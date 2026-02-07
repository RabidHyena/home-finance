import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import ParsedTransaction, ParsedTransactions, BatchUploadResult, BatchUploadResponse
from app.services.ocr_service import OCRService, get_ocr_service

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("", response_model=ParsedTransactions)
async def upload_and_parse(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a bank screenshot and parse ALL transaction data."""
    settings = get_settings()

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_upload_size // 1024 // 1024}MB",
        )

    # Save file
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = Path(file.filename or "image.jpg").suffix.lower()
    if file_ext not in allowed_extensions:
        file_ext = ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = upload_dir / unique_filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Pass DB and user_id to OCR service for learned categories
    ocr_service.db = db
    ocr_service.user_id = current_user.id

    # Parse with AI
    try:
        result = ocr_service.parse_image_bytes_multiple(content, file.filename or "image.jpg")
        return ParsedTransactions(**result)
    except Exception as e:
        # Clean up file on error
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to parse image. Please try again.",
        )


@router.post("/parse-only", response_model=ParsedTransaction)
async def parse_without_save(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse a bank screenshot without saving it."""
    settings = get_settings()

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_upload_size // 1024 // 1024}MB",
        )

    # Pass DB and user_id for learned categories
    ocr_service.db = db
    ocr_service.user_id = current_user.id

    # Parse with AI
    try:
        result = ocr_service.parse_image_bytes(content, file.filename or "image.jpg")
        return result
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse image. Please try again.",
        )


@router.post("/batch", response_model=BatchUploadResponse)
async def upload_and_parse_batch(
    files: List[UploadFile] = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and parse multiple bank screenshots."""
    settings = get_settings()

    # Limit batch size
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")

    results = []
    successful = 0
    failed = 0

    ocr_service.db = db  # Inject DB for learning
    ocr_service.user_id = current_user.id

    for file in files:
        try:
            # Validate type
            allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
            if file.content_type not in allowed_types:
                raise ValueError(f"Invalid file type: {file.content_type}")

            # Read and validate size
            content = await file.read()
            if len(content) > settings.max_upload_size:
                raise ValueError(f"File too large: {len(content)} bytes")

            # Save file
            upload_dir = Path(settings.upload_dir)
            upload_dir.mkdir(parents=True, exist_ok=True)
            allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
            file_ext = Path(file.filename or "image.jpg").suffix.lower()
            if file_ext not in allowed_extensions:
                file_ext = ".jpg"
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            file_path = upload_dir / unique_filename

            with open(file_path, "wb") as f:
                f.write(content)

            # Parse with AI
            parsed = ocr_service.parse_image_bytes_multiple(
                content,
                file.filename or "image.jpg"
            )

            results.append(BatchUploadResult(
                filename=file.filename or "unknown",
                status="success",
                data=ParsedTransactions(**parsed)
            ))
            successful += 1

        except Exception as e:
            # Clean up saved file on error
            if 'file_path' in dir() and file_path.exists():
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
        failed=failed
    )
