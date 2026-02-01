import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import get_settings
from app.schemas import ParsedTransaction
from app.services.ocr_service import OCRService, get_ocr_service

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("", response_model=ParsedTransaction)
async def upload_and_parse(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
):
    """Upload a bank screenshot and parse transaction data."""
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

    file_ext = Path(file.filename or "image.jpg").suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = upload_dir / unique_filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Parse with AI
    try:
        result = ocr_service.parse_image_bytes(content, file.filename or "image.jpg")
        return result
    except Exception as e:
        # Clean up file on error
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse image: {str(e)}",
        )


@router.post("/parse-only", response_model=ParsedTransaction)
async def parse_without_save(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
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

    # Parse with AI
    try:
        result = ocr_service.parse_image_bytes(content, file.filename or "image.jpg")
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse image: {str(e)}",
        )
