"""Photo / avatar storage.

Only the operator's own images are handled here. The project deliberately does
**not** implement facial recognition: images are reduced to a cryptographic hash
(exact duplicate detection) and an average perceptual hash (visually identical
avatar detection).
"""

from __future__ import annotations

import hashlib
import io
import re
import uuid
from pathlib import Path

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


class PhotoError(ValueError):
    """Raised when an uploaded file is rejected."""


def sanitize_filename(filename: str) -> str:
    name = SAFE_NAME.sub("_", Path(filename or "photo").name).strip("._")
    return name[:120] or "photo"


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def average_hash(payload: bytes, size: int = 8) -> str | None:
    """Compute a 64-bit average hash. Returns ``None`` when Pillow is absent."""
    try:
        from PIL import Image  # imported lazily: the feature is optional
    except ImportError:  # pragma: no cover - depends on the environment
        return None
    try:
        with Image.open(io.BytesIO(payload)) as image:
            grayscale = image.convert("L").resize((size, size), Image.Resampling.LANCZOS)
            pixels = list(grayscale.getdata())
    except Exception:  # pragma: no cover - malformed image
        return None
    if not pixels:
        return None
    mean = sum(pixels) / len(pixels)
    bits = "".join("1" if pixel >= mean else "0" for pixel in pixels)
    return f"{int(bits, 2):0{size * size // 4}x}"


def store_photo(
    payload: bytes,
    filename: str,
    content_type: str | None,
    directory: str,
    max_bytes: int,
) -> dict[str, object]:
    """Persist an uploaded image on the evidence volume and hash it."""
    if not payload:
        raise PhotoError("empty file")
    if len(payload) > max_bytes:
        raise PhotoError(f"file too large (max {max_bytes // (1024 * 1024)} MiB)")
    normalized_type = (content_type or "").split(";")[0].strip().lower()
    if normalized_type not in ALLOWED_CONTENT_TYPES:
        raise PhotoError(
            "unsupported image type; allowed: " + ", ".join(sorted(ALLOWED_CONTENT_TYPES))
        )

    target_dir = Path(directory)
    target_dir.mkdir(parents=True, exist_ok=True)
    digest = sha256_bytes(payload)
    stored_name = f"{digest[:16]}-{uuid.uuid4().hex[:8]}{ALLOWED_CONTENT_TYPES[normalized_type]}"
    target_path = target_dir / stored_name
    target_path.write_bytes(payload)

    return {
        "filename": sanitize_filename(filename),
        "storage_path": str(target_path),
        "sha256": digest,
        "perceptual_hash": average_hash(payload),
        "content_type": normalized_type,
        "size_bytes": len(payload),
    }
