# Preventix Phase 5 — reproducible ML training and evaluation

This folder adds an **offline benchmark pipeline** for the public UCI AI4I 2020 Predictive Maintenance dataset. It does not connect the model to the dashboard or the live sensor simulator yet; API inference integration is Phase 6.

## Requirements

- Python 3.10+ (3.11 recommended)
- Internet access on the first training run, so the script can download the public dataset if the CSV is not already present

## Windows PowerShell setup

From the project root (`indusmind`):

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ml\requirements.txt
python ml\scripts\train_model.py
```

If PowerShell blocks activation, either enable activation for your current user according to your organization's policy or run the environment's Python directly: `\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt` and `\.venv\Scripts\python.exe ml\scripts\train_model.py`.

The script downloads the UCI archive into `ml/data/ai4i2020.csv` when missing, checks the target, removes duplicates, uses a fixed stratified 80/20 split (random seed 42), and trains a scikit-learn pipeline. It intentionally drops `UDI`, `Product ID`, and the component failure labels (`TWF`, `HDF`, `PWF`, `OSF`, `RNF`) to avoid using failure-mode labels as input leakage for the `Machine failure` target.

Outputs (ignored by Git):

- `ml/artifacts/failure_model.joblib` — fitted preprocessing + classifier pipeline and feature list
- `ml/artifacts/evaluation.json` — split details, ROC-AUC, average precision, precision/recall, confusion matrix, classification report, and limitations

## Optional smoke prediction

After training:

```powershell
python ml\scripts\predict_sample.py --input ml\sample_input.json
```

The input JSON must contain the exact feature names expected by the model. The included values are only a software smoke-test example and are not real machine readings.

## Interpretation and limitations

- AI4I is a public synthetic benchmark dataset, not the user's factory data.
- Failure examples are rare. Review failure-class recall, precision, average precision, and the confusion matrix; accuracy alone can be misleading.
- The random holdout is not a time-, machine-, or plant-separated validation.
- The 0.5 threshold is a baseline and has not been optimized against maintenance costs.
- Do not use this model to make real safety-critical maintenance decisions. Validate with representative plant data, calibration, drift monitoring, human review, and domain experts first.
- The model artifact is Python/scikit-learn-specific and is not consumed by Express. Phase 6 will expose controlled inference through a separate FastAPI service.
