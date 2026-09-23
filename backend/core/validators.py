import os
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from django.core.exceptions import ValidationError

MAX_UPLOAD_SIZE = 2 * 1024 * 1024  # 2MB limit
ALLOWED_IMAGE_FORMATS = {'PNG': '.png', 'JPEG': '.jpg', 'WEBP': '.webp'}
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}

def validate_image_file(file):
    """
    Validates uploaded image files:
    - Enforces max upload size of 2MB
    - Enforces permitted file extensions (.png, .jpg, .jpeg, .webp)
    - Rejects executable, SVG, HTML, or malformed content
    - Validates image integrity using Pillow verify() and load()
    """
    if not file:
        return

    # 1. Size validation
    if file.size > MAX_UPLOAD_SIZE:
        raise ValidationError("Image file size exceeds the 2MB limit.")

    # 2. Extension validation
    ext = os.path.splitext(file.name)[1].lower() if file.name else ''
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError("Unsupported file extension. Allowed formats: PNG, JPEG, JPG, WEBP.")

    # 3. Content and format inspection with Pillow
    try:
        file.seek(0)
        file_bytes = file.read()
        file.seek(0)

        # Quick check for non-image script/markup injections (e.g. SVG/HTML/PHP)
        header_sample = file_bytes[:512].lower()
        dangerous_signatures = [b"<svg", b"<?xml", b"<html", b"<script", b"<?php", b"<!doctype"]
        if any(sig in header_sample for sig in dangerous_signatures):
            raise ValidationError("Invalid image content. Executable and markup files are not allowed.")

        image_stream = BytesIO(file_bytes)
        img = Image.open(image_stream)

        # Pillow verify() performs basic file structure verification
        img.verify()

        # Reopen image after verify() as recommended by Pillow docs
        image_stream.seek(0)
        img = Image.open(image_stream)
        img.load()  # Forces raster data decoding to catch corrupted/truncated images

        # Check format
        fmt = (img.format or '').upper()
        if fmt not in ALLOWED_IMAGE_FORMATS:
            raise ValidationError("Invalid image format. Supported formats: PNG, JPEG, WEBP.")

    except (UnidentifiedImageError, OSError, SyntaxError, ValidationError) as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError("Uploaded file is not a valid image.")
    finally:
        file.seek(0)
