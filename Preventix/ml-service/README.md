# Preventix ML inference service

This FastAPI service loads the trained benchmark model from `../ml/artifacts/failure_model.joblib` and exposes `/health` and `/predict`.

From the project root, train the model first if the artifact is missing:

```powershell
python -m pip install -r mlequirements.txt
python ml\scripts	rain_model.py
```

Then start the service from the project root:

```powershell
python -m pip install -r ml-serviceequirements.txt
python -m uvicorn ml-service.main:app --host 127.0.0.1 --port 8000
```

If the hyphenated package path causes an import issue on your Python setup, run from the project root with:

```powershell
python -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000
```

Check `http://127.0.0.1:8000/health`. The model is loaded on the first prediction request. This is a demonstration model trained on public AI4I data, not validated for real-world operational decisions.
