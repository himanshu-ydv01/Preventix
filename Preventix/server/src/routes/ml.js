import { Router } from 'express';
import { z } from 'zod';
import Machine from '../models/Machine.js';
import SensorReading from '../models/SensorReading.js';
import Prediction from '../models/Prediction.js';
import Alert from '../models/Alert.js';
import AuditEvent from '../models/AuditEvent.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/health', asyncHandler(async (req, res) => {
  const serviceUrl = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  try {
    const response = await fetch(`${serviceUrl}/health`, { signal: AbortSignal.timeout(2500) });
    const payload = await response.json().catch(() => ({}));
    res.status(response.ok ? 200 : 503).json({ data: { online: response.ok, message: payload.status || (response.ok ? 'Available' : `Service returned ${response.status}`) } });
  } catch {
    res.status(503).json({ data: { online: false, message: 'ML service is not reachable.' } });
  }
}));
const inputSchema = z.object({ body: z.object({ machineId: z.string().trim().min(2).max(40) }) });

function modelType(machineType = '') {
  const value = String(machineType).toLowerCase();
  if (/\b(low|type l|light)\b/.test(value) || value === 'l') return 'L';
  if (/\b(high|type h|heavy)\b/.test(value) || value === 'h') return 'H';
  return 'M';
}
function riskLevel(probability) {
  if (probability >= 0.75) return 'Critical';
  if (probability >= 0.5) return 'High';
  if (probability >= 0.25) return 'Medium';
  return 'Low';
}

const scenarioSchema = z.object({ body: z.object({
  machineId: z.string().trim().min(2).max(40),
  features: z.object({
    airTemperature: z.number().min(-50).max(250),
    processTemperature: z.number().min(-50).max(350),
    rotationalSpeed: z.number().min(0).max(100000),
    torque: z.number().min(0).max(10000),
    toolWear: z.number().min(0).max(100000),
  }),
}) });

// Scores an isolated what-if payload using the same ML service without saving readings or predictions.
router.post('/simulate', validate(scenarioSchema), asyncHandler(async (req, res) => {
  const { machineId, features: input } = req.validated.body;
  const normalizedId = machineId.toUpperCase();
  const machine = await Machine.findOne({ machineId: normalizedId });
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: `Machine ${normalizedId} was not found.` } });
  const features = {
    'Type': modelType(machine.type),
    'Air temperature [K]': Number(input.airTemperature) + 273.15,
    'Process temperature [K]': Number(input.processTemperature) + 273.15,
    'Rotational speed [rpm]': Number(input.rotationalSpeed),
    'Torque [Nm]': Number(input.torque),
    'Tool wear [min]': Number(input.toolWear),
  };
  const serviceUrl = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  let response;
  try {
    response = await fetch(`${serviceUrl}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ machineId: normalizedId, features }), signal: AbortSignal.timeout(10000) });
  } catch (error) {
    return res.status(503).json({ error: { code: 'ML_SERVICE_UNAVAILABLE', message: `ML service is unavailable at ${serviceUrl}.`, details: error.message } });
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(response.status).json({ error: { code: 'ML_INFERENCE_FAILED', message: result.detail || 'The ML service could not score this scenario.' } });
  const probability = Number(result.failureProbability);
  res.json({ data: { machineId: normalizedId, modelName: result.modelName, modelVersion: result.modelVersion, predictedFailure: Boolean(result.predictedFailure), failureProbability: probability, riskLevel: riskLevel(probability), source: 'model-simulation', warning: result.warning || 'Benchmark model only. Scenario was not saved.' } });
}));

router.post('/infer', validate(inputSchema), asyncHandler(async (req, res) => {
  const machineId = req.validated.body.machineId.toUpperCase();
  const machine = await Machine.findOne({ machineId });
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: `Machine ${machineId} was not found.` } });
  const reading = await SensorReading.findOne({ machine: machine._id }).sort({ recordedAt: -1 }).lean();
  if (!reading) return res.status(409).json({ error: { code: 'NO_SENSOR_READING', message: 'This machine has no sensor readings yet. Start the simulator first.' } });

  // Preventix sensor temperatures are stored/displayed as Celsius. AI4I model expects Kelvin.
  const features = {
    'Type': modelType(machine.type),
    'Air temperature [K]': Number(reading.airTemperature) + 273.15,
    'Process temperature [K]': Number(reading.processTemperature) + 273.15,
    'Rotational speed [rpm]': Number(reading.rotationalSpeed),
    'Torque [Nm]': Number(reading.torque),
    'Tool wear [min]': Number(reading.toolWear),
  };
  const serviceUrl = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  let response;
  try {
    response = await fetch(`${serviceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId, features }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    return res.status(503).json({ error: { code: 'ML_SERVICE_UNAVAILABLE', message: `ML service is unavailable at ${serviceUrl}. Start it and ensure the trained model exists.`, details: error.message } });
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status === 503 ? 503 : response.status).json({ error: { code: 'ML_INFERENCE_FAILED', message: result.detail || 'The ML service could not generate a prediction.' } });
  }
  const probability = Number(result.failureProbability);
  const risk = riskLevel(probability);
  const saved = await Prediction.create({
    machine: machine._id,
    modelName: result.modelName || 'Preventix AI4I Random Forest',
    modelVersion: result.modelVersion || 'unknown',
    predictedFailure: Boolean(result.predictedFailure),
    failureProbability: probability,
    riskLevel: risk,
    inputFeatures: features,
    contributingFactors: [],
    recommendedActions: risk === 'Critical' || risk === 'High'
      ? ['Review the latest sensor readings and schedule a qualified inspection. This benchmark prediction is not an operational diagnosis.']
      : ['Continue monitoring and follow the plant maintenance procedure. This benchmark prediction is not an operational diagnosis.'],
    source: 'model',
    predictedAt: new Date(),
  });
  if (risk === 'High' || risk === 'Critical') {
    const title = `Predicted ${risk.toLowerCase()} failure risk: ${machine.name}`;
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await Alert.findOne({ machine: machine._id, title, status: { $in: ['Active', 'Acknowledged'] }, occurredAt: { $gte: cutoff } });
    if (!existing) {
      const generatedAlert = await Alert.create({ machine: machine._id, severity: risk === 'Critical' ? 'Critical' : 'Warning', title, description: `The benchmark model estimated ${(probability * 100).toFixed(1)}% failure probability. Human review is required.`, recommendedAction: 'Inspect the latest readings and follow the approved plant maintenance procedure. Do not use this benchmark output as a safety decision.', source: 'model', alertId: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}` });
      await AuditEvent.create({ action: 'model-risk-alert.created', entityType: 'alert', entityId: String(generatedAlert._id), summary: `Model risk alert created for ${machine.machineId}.`, metadata: { riskLevel: risk, failureProbability: probability } });
    }
  }
  res.status(201).json({ data: { ...saved.toObject(), machine: { machineId: machine.machineId, name: machine.name }, warning: result.warning || 'Benchmark prediction only.' } });
}));

export default router;
