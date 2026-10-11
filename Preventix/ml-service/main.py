"""Preventix inference API for the offline AI4I benchmark model.

This service does not connect to physical equipment. Train the model from the
project's ml/ directory before requesting predictions.
"""
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "ml" / "artifacts" / "failure_model.joblib"
app = FastAPI(title="Preventix ML Service", version="1.0.0")
_bundle: dict[str, Any] | None = None
_load_error: str | None = None


class SensorFeatures(BaseModel):
    machineId: str = Field(min_length=2, max_length=40)
    features: dict[str, Any]


def get_bundle():
    global _bundle, _load_error
    if _bundle is not None:
        return _bundle
    if not MODEL_PATH.exists():
        _load_error = f"Trained model not found at {MODEL_PATH}. Run python ml/scripts/train_model.py from the project root."
        raise HTTPException(status_code=503, detail=_load_error)
    try:
        _bundle = joblib.load(MODEL_PATH)
        _load_error = None
        return _bundle
    except Exception as exc:
        _load_error = f"Could not load model artifact: {exc}"
        raise HTTPException(status_code=503, detail=_load_error) from exc


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "preventix-ml-service",
        "model_loaded": _bundle is not None,
        "model_exists": MODEL_PATH.exists(),
        "model_path": str(MODEL_PATH),
        "load_error": _load_error,
        "warning": "Benchmark model only; not validated for operational maintenance decisions.",
    }


@app.post("/predict")
def predict(payload: SensorFeatures):
    bundle = get_bundle()
    features = bundle.get("features", [])
    missing = [name for name in features if name not in payload.features]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing model feature(s): {', '.join(missing)}")
    try:
        row = pd.DataFrame([{name: payload.features[name] for name in features}])
        probability = float(bundle["model"].predict_proba(row)[0, 1])
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not score supplied features: {exc}") from exc
    return {
        "machineId": payload.machineId.upper(),
        "modelName": "Preventix AI4I Random Forest",
        "modelVersion": bundle.get("model_version", "unknown"),
        "predictedFailure": probability >= 0.5,
        "failureProbability": round(probability, 6),
        "threshold": 0.5,
        "source": "model",
        "inputFeatures": {name: payload.features[name] for name in features},
        "warning": "Demonstration benchmark only; not validated for operational maintenance decisions.",
    }
