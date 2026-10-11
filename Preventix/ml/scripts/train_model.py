"""Download, validate, train, and evaluate a reproducible AI4I failure model.

This is an offline research pipeline. It does not connect to factory equipment
or make operational maintenance decisions.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "data" / "ai4i2020.csv"
DEFAULT_OUTPUT = ROOT / "artifacts"
DATASET_URL = "https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip"
TARGET = "Machine failure"
LEAKAGE_COLUMNS = ["TWF", "HDF", "PWF", "OSF", "RNF"]
DROP_COLUMNS = ["UDI", "Product ID", *LEAKAGE_COLUMNS]


def download_dataset(destination: Path) -> Path:
    """Download the public UCI archive and extract its CSV into destination."""
    destination.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(DATASET_URL, headers={"User-Agent": "Preventix-ML-Training/1.0"})
    with TemporaryDirectory() as temp_dir:
        archive_path = Path(temp_dir) / "ai4i.zip"
        with urllib.request.urlopen(request, timeout=45) as response, archive_path.open("wb") as out:
            out.write(response.read())
        with zipfile.ZipFile(archive_path) as archive:
            csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
            if not csv_names:
                raise RuntimeError("UCI archive did not contain a CSV file.")
            preferred = next((name for name in csv_names if "ai4i" in name.lower()), csv_names[0])
            with archive.open(preferred) as src, destination.open("wb") as out:
                out.write(src.read())
    return destination


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        download_dataset(path)
    df = pd.read_csv(path)
    if TARGET not in df.columns:
        raise ValueError(f"Expected target column {TARGET!r}. Found: {list(df.columns)}")
    if df.empty:
        raise ValueError("Dataset is empty.")
    df = df.drop_duplicates().copy()
    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")
    df = df.dropna(subset=[TARGET])
    df[TARGET] = df[TARGET].astype(int)
    values = set(df[TARGET].unique())
    if not values.issubset({0, 1}) or len(values) != 2:
        raise ValueError(f"Expected binary target values 0 and 1, got {sorted(values)}")
    return df


def build_pipeline(X: pd.DataFrame) -> Pipeline:
    categorical = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numeric = [column for column in X.columns if column not in categorical]
    numeric_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    preprocess = ColumnTransformer([
        ("numeric", numeric_pipe, numeric),
        ("categorical", categorical_pipe, categorical),
    ], remainder="drop")
    classifier = RandomForestClassifier(
        n_estimators=300,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    return Pipeline([("preprocess", preprocess), ("classifier", classifier)])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA, help="Path to the AI4I CSV; downloads it if absent")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Directory for model and evaluation artifacts")
    args = parser.parse_args()

    try:
        df = load_dataset(args.data)
        feature_columns = [c for c in df.columns if c != TARGET and c not in DROP_COLUMNS]
        X = df[feature_columns].copy()
        y = df[TARGET].copy()
        if y.nunique() < 2:
            raise ValueError("Training requires both failure and non-failure examples.")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )
        model = build_pipeline(X_train)
        model.fit(X_train, y_train)
        probabilities = model.predict_proba(X_test)[:, 1]
        predictions = (probabilities >= 0.5).astype(int)

        metrics = {
            "dataset": "UCI AI4I 2020 Predictive Maintenance Dataset",
            "dataset_path": str(args.data),
            "dataset_rows_after_deduplication": int(len(df)),
            "failure_rate": float(y.mean()),
            "features": feature_columns,
            "dropped_columns": [c for c in DROP_COLUMNS if c in df.columns],
            "random_seed": 42,
            "test_fraction": 0.20,
            "threshold": 0.5,
            "accuracy": float(accuracy_score(y_test, predictions)),
            "precision_failure_class": float(precision_score(y_test, predictions, zero_division=0)),
            "recall_failure_class": float(recall_score(y_test, predictions, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_test, probabilities)),
            "average_precision": float(average_precision_score(y_test, probabilities)),
            "confusion_matrix_labels_0_1": confusion_matrix(y_test, predictions, labels=[0, 1]).tolist(),
            "classification_report": classification_report(y_test, predictions, labels=[0, 1], target_names=["no_failure", "failure"], zero_division=0, output_dict=True),
            "trained_at_utc": datetime.now(timezone.utc).isoformat(),
            "model_type": "scikit-learn RandomForestClassifier pipeline",
            "model_version": "preventix-ai4i-rf-1.0.0",
            "limitations": [
                "Public benchmark data, not measurements from the user's machines.",
                "The test split is a random holdout, not a time-based or plant-based validation.",
                "Failure events are rare; accuracy alone is not an adequate measure.",
                "Threshold 0.5 is a baseline, not a cost-calibrated operational threshold.",
            ],
        }
        args.output.mkdir(parents=True, exist_ok=True)
        model_path = args.output / "failure_model.joblib"
        metrics_path = args.output / "evaluation.json"
        joblib.dump({"model": model, "features": feature_columns, "model_version": metrics["model_version"]}, model_path)
        metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

        print("Training complete.")
        print(f"Rows: {len(df)} | Failures: {int(y.sum())} ({y.mean():.2%})")
        print(f"ROC-AUC: {metrics['roc_auc']:.4f}")
        print(f"Average precision: {metrics['average_precision']:.4f}")
        print(f"Failure precision: {metrics['precision_failure_class']:.4f}")
        print(f"Failure recall: {metrics['recall_failure_class']:.4f}")
        print(f"Model: {model_path}")
        print(f"Metrics: {metrics_path}")
        print("Reminder: benchmark results are not validated for operational use.")
        return 0
    except Exception as exc:  # concise CLI error with actionable context
        print(f"Training failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
