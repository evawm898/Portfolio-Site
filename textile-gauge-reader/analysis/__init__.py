"""
Analysis package for the Automatic Textile Gauge Reader.

This package contains only image-analysis logic (OpenCV / NumPy / SciPy).
It has no knowledge of HTTP, FastAPI, file uploads, or the frontend —
it operates purely on in-memory arrays and plain Python values so it can
be tested, reused, or swapped out independently of the web layer.
"""
from .gauge_analysis import (
    ALGORITHM_VERSION,
    analyze_gauge,
    analyze_multi_roi,
    AxisConsensusResult,
    AxisResult,
    GaugeAnalysisResult,
    MultiRoiAnalysisResult,
    OutlierInfo,
    propose_measurement_rois,
    ProposedRoi,
    RoiMeasurement,
    RoiProposalResult,
)

__all__ = [
    "analyze_gauge",
    "GaugeAnalysisResult",
    "AxisResult",
    "ALGORITHM_VERSION",
    "propose_measurement_rois",
    "ProposedRoi",
    "RoiProposalResult",
    "analyze_multi_roi",
    "MultiRoiAnalysisResult",
    "RoiMeasurement",
    "AxisConsensusResult",
    "OutlierInfo",
]
