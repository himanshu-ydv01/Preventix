# Phase 7 — Digital Twin

## Included
- Dedicated `/digital-twin` React page with a responsive machine schematic and sensor callouts.
- Machine selector backed by the existing machine API.
- Recent stored sensor history and live updates from the existing Socket.IO `sensor:reading` event.
- Temperature and vibration history chart.
- Refresh action that calls the existing `/api/ml/infer` workflow and displays the persisted model prediction.
- What-if controls for process temperature, air temperature, rotational speed, torque, and tool wear. The scenario is sent to `POST /api/ml/simulate`, which calls the existing FastAPI model and deliberately does not save a sensor reading or Prediction record.
- Clear demo/benchmark disclaimers. The ML model is not validated for operational maintenance or safety decisions.

## Run
Use the same setup as Phase 6:
1. Start MongoDB and ensure `server/.env` contains the existing valid configuration.
2. Start the ML service from the repository root: `python -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000`.
3. Start the app: `npm run dev`.
4. Open `http://localhost:5173/digital-twin` and select a machine with stored readings. Start the existing simulator from Live Sensor Monitor if readings are not available.

## Notes
- The machine rendering is an interactive 2D schematic, not a CAD-accurate or physically simulated 3D twin.
- Scenario outputs are direct scores from the same benchmark model, based on adjusted values only; no scenario is persisted.
- Build and runtime checks should be performed in the user's configured environment. This archive's dependencies were not installed in the isolated build workspace, so a production build could not be confirmed here.
