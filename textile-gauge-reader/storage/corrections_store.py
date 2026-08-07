"""
SQLite-backed storage for manually-verified ground-truth "correction"
records: pairing one /analyze prediction with a human-provided actual
gauge measurement, to build a labeled dataset for evaluating (and later,
deliberately, tuning) the detection algorithm.

Nothing in this module changes analysis behavior automatically — it only
records what happened and what the true answer was.

Storage note: this uses a plain SQLite file on local disk. That's
durable for local development, but on a host with an ephemeral
filesystem (e.g. Render's free tier, which wipes local disk on every
redeploy) it will NOT survive a redeploy. Use export_csv()/export_json()
periodically to pull the dataset out before that happens; a persistent
disk or external database is the real fix if/when this needs to
outlive redeploys.

Uploaded images are NOT stored unless the caller explicitly passes
image bytes to save_image() — by default only enough metadata to
identify a sample (filename, size, content hash) is kept.
"""
from __future__ import annotations

import csv
import io
import json
import sqlite3
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "corrections.db"
IMAGES_DIR = DATA_DIR / "images"

# Column order also defines CSV export column order.
_COLUMNS: List[str] = [
    "id",
    "created_at",
    "image_filename",
    "image_size_bytes",
    "image_sha256",
    "roi_x",
    "roi_y",
    "roi_width_px",
    "roi_height_px",
    "roi_width_mm",
    "roi_height_mm",
    "pixels_per_mm",
    "orientation",
    "predicted_wale_spacing_px",
    "predicted_course_spacing_px",
    "predicted_wale_spacing_mm",
    "predicted_course_spacing_mm",
    "predicted_wales_per_inch",
    "predicted_courses_per_inch",
    "predicted_wale_confidence",
    "predicted_course_confidence",
    "detected_wale_positions_json",
    "detected_course_positions_json",
    "actual_wale_count",
    "actual_course_count",
    "actual_wales_per_inch",
    "actual_courses_per_inch",
    "wale_percent_error",
    "course_percent_error",
    "calibration_correct",
    "orientation_correct",
    "algorithm_version",
    "image_saved",
    "image_path",
]


@dataclass
class CorrectionRecord:
    """One labeled sample: a prediction plus a human-verified actual value."""

    id: str
    created_at: str
    image_filename: Optional[str]
    image_size_bytes: Optional[int]
    image_sha256: Optional[str]
    roi_x: float
    roi_y: float
    roi_width_px: float
    roi_height_px: float
    roi_width_mm: float
    roi_height_mm: float
    pixels_per_mm: float
    orientation: str
    predicted_wale_spacing_px: Optional[float]
    predicted_course_spacing_px: Optional[float]
    predicted_wale_spacing_mm: Optional[float]
    predicted_course_spacing_mm: Optional[float]
    predicted_wales_per_inch: Optional[float]
    predicted_courses_per_inch: Optional[float]
    predicted_wale_confidence: float
    predicted_course_confidence: float
    detected_wale_positions_json: str
    detected_course_positions_json: str
    actual_wale_count: Optional[int]
    actual_course_count: Optional[int]
    actual_wales_per_inch: Optional[float]
    actual_courses_per_inch: Optional[float]
    wale_percent_error: Optional[float]
    course_percent_error: Optional[float]
    calibration_correct: bool
    orientation_correct: bool
    algorithm_version: str
    image_saved: bool = False
    image_path: Optional[str] = None

    @staticmethod
    def new_id() -> str:
        return str(uuid.uuid4())

    @staticmethod
    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        d = asdict(self)
        # Expand the JSON-encoded position lists back into real arrays for
        # human/JSON consumers; the DB stores them as TEXT for simplicity.
        d["detected_wale_positions"] = json.loads(self.detected_wale_positions_json or "[]")
        d["detected_course_positions"] = json.loads(self.detected_course_positions_json or "[]")
        return d


def _ensure_table(conn: sqlite3.Connection) -> None:
    columns_sql = ",\n            ".join(f"{col} TEXT" for col in _COLUMNS if col != "id")
    conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS corrections (
            id TEXT PRIMARY KEY,
            {columns_sql}
        )
        """
    )
    conn.commit()


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # Guaranteed idempotent and cheap (CREATE TABLE IF NOT EXISTS), so we run
    # it on every connection rather than relying solely on the app startup
    # hook having fired first — belt and suspenders against any ordering
    # issue between process startup and the first request.
    _ensure_table(conn)
    return conn


def init_db() -> None:
    """Create the corrections table if it doesn't exist yet. Safe to call repeatedly."""
    with _connect():
        pass  # _connect() already ensures the table exists


def save_correction(record: CorrectionRecord) -> None:
    row = asdict(record)
    placeholders = ", ".join(f":{c}" for c in _COLUMNS)
    columns = ", ".join(_COLUMNS)
    with _connect() as conn:
        conn.execute(
            f"INSERT INTO corrections ({columns}) VALUES ({placeholders})",
            row,
        )
        conn.commit()


def _row_to_record(row: sqlite3.Row) -> CorrectionRecord:
    kwargs = {c: row[c] for c in _COLUMNS}
    # SQLite gives everything back as TEXT/None per our simple schema;
    # coerce the numeric/boolean fields back to real Python types.
    for key in (
        "roi_x", "roi_y", "roi_width_px", "roi_height_px",
        "roi_width_mm", "roi_height_mm", "pixels_per_mm",
        "predicted_wale_spacing_px", "predicted_course_spacing_px",
        "predicted_wale_spacing_mm", "predicted_course_spacing_mm",
        "predicted_wales_per_inch", "predicted_courses_per_inch",
        "predicted_wale_confidence", "predicted_course_confidence",
        "actual_wales_per_inch", "actual_courses_per_inch",
        "wale_percent_error", "course_percent_error",
    ):
        if kwargs[key] is not None and kwargs[key] != "":
            kwargs[key] = float(kwargs[key])
        else:
            kwargs[key] = None
    for key in ("actual_wale_count", "actual_course_count", "image_size_bytes"):
        if kwargs[key] is not None and kwargs[key] != "":
            kwargs[key] = int(float(kwargs[key]))
        else:
            kwargs[key] = None
    for key in ("calibration_correct", "orientation_correct", "image_saved"):
        kwargs[key] = str(kwargs[key]).lower() in ("1", "true", "yes")
    return CorrectionRecord(**kwargs)


def list_corrections() -> List[CorrectionRecord]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM corrections ORDER BY created_at ASC").fetchall()
    return [_row_to_record(r) for r in rows]


def export_json() -> str:
    records = [r.to_dict() for r in list_corrections()]
    return json.dumps(records, indent=2)


def export_csv() -> str:
    records = list_corrections()
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=_COLUMNS)
    writer.writeheader()
    for r in records:
        row = asdict(r)
        writer.writerow({c: row[c] for c in _COLUMNS})
    return buffer.getvalue()


def save_image(sample_id: str, filename: str, data: bytes) -> str:
    """
    Persist an opted-in image to disk, returning its path relative to
    DATA_DIR. Only called when the user explicitly checked "Save image
    for algorithm development" — never by default.
    """
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(filename or "").suffix or ".bin"
    # Sanitize: sample_id is a uuid4 we generated, safe as a filename on its own.
    dest = IMAGES_DIR / f"{sample_id}{suffix}"
    dest.write_bytes(data)
    return str(dest.relative_to(DATA_DIR))
