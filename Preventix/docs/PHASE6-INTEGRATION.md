# Phase 6 — ML API + Backend Integration

Phase 6 adds a Python FastAPI inference service, an Express forwarding endpoint, and a React prediction panel on the Live Sensor Monitor. It builds on the existing Phase 4 simulator/Socket.IO and Phase 5 training pipeline.

## What it does

1. `ml-service/main.py` loads `ml/artifacts/failure_model.joblib` and exposes `/health` and `/predict`.
2. `POST /api/ml/infer` in Express finds a machine's latest saved sensor reading, converts the stored Celsius temperatures to Kelvin for the AI4I benchmark feature format, sends features to FastAPI, and stores the prediction in MongoDB using the existing `Prediction` model.
3. `client/src/components/PredictionTester.jsx` lets a user select a machine and request a prediction from its latest reading.
4. The panel is mounted on the existing Live Sensor Monitor page. Phase 4 sensor simulation and Socket.IO remain in place.

## First-time setup (Windows PowerShell)

Run these from the project root (`indusmind`). Use a terminal per service.

### 1. Train the model if the artifact is missing

```powershell
python -m pip install -r mlequirements.txt
python ml\scripts	rain_model.py
```

Confirm `mlrtifactsailure_model.joblib` exists. Do not commit model artifacts if your repository policy excludes generated files; the service requires the artifact at runtime.

### 2. Install the inference service dependencies

```powershell
python -m pip install -r ml-serviceequirements.txt
```

### 3. Start FastAPI (Terminal 1)

```powershell
python -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/health`. The health response should show `model_exists: true`. The model is loaded on the first prediction request.

### 4. Start Express + React (Terminal 2)

Ensure `server/.env` has a valid `MONGODB_URI` and `ML_SERVICE_URL=http://127.0.0.1:8000` (the route also defaults to that URL).

```powershell
npm install
npm run dev
```

The app uses the existing Vite proxy and Express API. Open the URL printed by Vite, normally `http://localhost:5173`.

### 5. Test the full flow

1. Ensure MongoDB is reachable and example machines exist (`npm run seed` if your database is empty).
2. Open **Live Sensor Monitor** and start the simulator.
3. Wait for at least one sensor reading per active machine.
4. In **ML failure prediction**, choose a machine and click **Predict from latest reading**.
5. Confirm a risk level, failure probability, model version, and saved timestamp appear. The prediction is persisted in MongoDB and is available from the existing `GET /api/predictions` route.

## API

- `GET http://127.0.0.1:8000/health` — inference service status.
- `POST http://127.0.0.1:8000/predict` — internal ML service endpoint, expects `machineId` and a `features` object with the exact AI4I feature names.
- `POST /api/ml/infer` — Express endpoint, expects `{ "machineId": "CNC-001" }`; it fetches the latest reading and persists the result.
- `GET /api/predictions?limit=30` — existing prediction history endpoint.

## Important limitations

- The model is trained on public UCI AI4I benchmark data, not plant-specific historical outcomes.
- The simulator values are synthetic. Celsius-to-Kelvin conversion is applied because the AI4I model uses Kelvin features.
- Machine type mapping is approximate: type strings that clearly indicate L/low map to `L`, H/high map to `H`, otherwise `M`.
- Risk labels are UI bands derived from the model probability; they are not calibrated maintenance thresholds.
- This is a learning/demo integration only. Do not use predictions to make real-world safety-critical decisions.
