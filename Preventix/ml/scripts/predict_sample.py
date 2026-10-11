"""Run a one-row offline smoke prediction with a trained model artifact."""
import argparse
import json
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = ROOT / "artifacts" / "failure_model.joblib"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--input", type=Path, required=True, help="JSON object containing the exact feature names used in training")
    args = parser.parse_args()
    if not args.model.exists():
        parser.error(f"Model not found: {args.model}. Run train_model.py first.")
    bundle = joblib.load(args.model)
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    missing = [feature for feature in bundle["features"] if feature not in payload]
    if missing:
        parser.error(f"Missing feature(s): {', '.join(missing)}")
    row = pd.DataFrame([{feature: payload[feature] for feature in bundle["features"]}])
    probability = float(bundle["model"].predict_proba(row)[0, 1])
    print(json.dumps({
        "model_version": bundle["model_version"],
        "predicted_failure": probability >= 0.5,
        "failure_probability": round(probability, 6),
        "threshold": 0.5,
        "source": "offline_benchmark_model",
        "warning": "Demonstration only; not validated for operational maintenance decisions.",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
