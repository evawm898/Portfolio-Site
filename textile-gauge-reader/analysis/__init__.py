"""
Analysis package for the AI Textile Gauge Reader.

This package contains only image-analysis logic (OpenCV / NumPy / SciPy).
It has no knowledge of HTTP, FastAPI, file uploads, or the frontend —
it operates purely on in-memory arrays and plain Python values so it can
be tested, reused, or swapped out independently of the web layer.
"""
from .gauge_analysis import analyze_gauge, GaugeAnalysisResult, AxisResult

__all__ = ["analyze_gauge", "GaugeAnalysisResult", "AxisResult"]
