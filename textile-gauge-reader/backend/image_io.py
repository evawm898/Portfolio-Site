"""
Upload validation and decoding helpers.

This is application/I-O plumbing, not image analysis: it deals with
bytes, content types, and turning an upload into a numpy array that the
`analysis` package can consume. It never writes uploaded images to disk.
"""
from __future__ import annotations

import numpy as np
import cv2

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_IMAGE_DIMENSION = 8000  # guard against decompression-bomb-style huge images


class ImageValidationError(ValueError):
    """Raised when an uploaded file fails validation. Message is user-facing."""


def validate_upload(content_type: str | None, size_bytes: int) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ImageValidationError(
            "Unsupported file type. Please upload a JPG, PNG, or WEBP image."
        )
    if size_bytes <= 0:
        raise ImageValidationError("Uploaded file is empty.")
    if size_bytes > MAX_UPLOAD_BYTES:
        raise ImageValidationError(
            f"File is too large ({size_bytes / (1024 * 1024):.1f} MB). "
            f"Maximum allowed is {MAX_UPLOAD_BYTES / (1024 * 1024):.0f} MB."
        )


def decode_image(data: bytes) -> np.ndarray:
    """Decode raw image bytes to a BGR numpy array without ever touching disk."""
    buffer = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ImageValidationError(
            "Could not decode this file as an image. It may be corrupted or "
            "an unsupported format."
        )
    h, w = image.shape[:2]
    if h > MAX_IMAGE_DIMENSION or w > MAX_IMAGE_DIMENSION:
        raise ImageValidationError(
            f"Image dimensions are too large ({w}x{h}px). "
            f"Maximum is {MAX_IMAGE_DIMENSION}px per side."
        )
    if h < 10 or w < 10:
        raise ImageValidationError("Image is too small to analyze.")
    return image
