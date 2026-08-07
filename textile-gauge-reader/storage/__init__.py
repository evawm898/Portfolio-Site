"""
Persistence for the ground-truth "correction" system.

Like the `analysis` package, this is deliberately decoupled from the web
layer: it only knows about a SQLite file on disk and plain Python
values, with no FastAPI/HTTP imports. `backend/corrections_api.py`
is the only caller.
"""
from .corrections_store import (
    CorrectionRecord,
    export_csv,
    export_json,
    init_db,
    list_corrections,
    save_correction,
    save_image,
)

__all__ = [
    "CorrectionRecord",
    "init_db",
    "save_correction",
    "list_corrections",
    "export_csv",
    "export_json",
    "save_image",
]
