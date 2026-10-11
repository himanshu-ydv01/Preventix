import Machine from '../models/Machine.js';
import SensorReading from '../models/SensorReading.js';

const MIN_INTERVAL_MS = 2000;
const MAX_INTERVAL_MS = 60000;
const MAX_MACHINES_PER_TICK = 50;
const MAX_READINGS_PER_SESSION = 1000;
const MAX_SESSION_MS = 30 * 60 * 1000;
let io = null;
let timer = null;
let startedAt = null;
let intervalMs = 5000;
let readingsCreated = 0;
let lastError = null;
let inTick = false;

export function attachSocketServer(socketServer) { io = socketServer; }

function status() {
  return {
    running: Boolean(timer),
    intervalMs,
    startedAt,
    readingsCreated,
    readingsRemaining: Math.max(0, MAX_READINGS_PER_SESSION - readingsCreated),
    maxReadingsPerSession: MAX_READINGS_PER_SESSION,
    maxSessionMinutes: MAX_SESSION_MS / 60000,
    lastError,
  };
}
function emitStatus() { io?.emit('simulator:status', status()); }
function bounded(value, min, max) { return Math.min(max, Math.max(min, value)); }
function jitter(value, percent, min = 0, max = 10000) {
  const spread = Math.max(Math.abs(value) * percent, 0.15);
  return Number(bounded(value + (Math.random() * 2 - 1) * spread, min, max).toFixed(2));
}

async function tick() {
  if (inTick || !timer) return;
  inTick = true;
  try {
    if (Date.now() - new Date(startedAt).getTime() >= MAX_SESSION_MS || readingsCreated >= MAX_READINGS_PER_SESSION) {
      stopSimulator('session-limit');
      return;
    }
    const machines = await Machine.find({ isActive: true }).sort({ machineId: 1 }).limit(MAX_MACHINES_PER_TICK).lean();
    if (!machines.length) {
      lastError = 'No active machines are available to simulate.';
      emitStatus();
      return;
    }
    for (const machine of machines) {
      if (!timer || readingsCreated >= MAX_READINGS_PER_SESSION) break;
      const previous = await SensorReading.findOne({ machine: machine._id }).sort({ recordedAt: -1 }).lean();
      const base = previous || { airTemperature: 40, processTemperature: 55, rotationalSpeed: 1450, torque: 32, toolWear: 10, vibration: 1.1 };
      const reading = await SensorReading.create({
        machine: machine._id,
        recordedAt: new Date(),
        airTemperature: jitter(base.airTemperature, 0.025, -20, 150),
        processTemperature: jitter(base.processTemperature, 0.03, -20, 250),
        rotationalSpeed: jitter(base.rotationalSpeed, 0.02, 0, 10000),
        torque: jitter(base.torque, 0.035, 0, 500),
        toolWear: Number(bounded(base.toolWear + Math.random() * 0.25, 0, 100000).toFixed(2)),
        vibration: jitter(base.vibration ?? 1, 0.08, 0, 100),
        source: 'simulated',
      });
      readingsCreated += 1;
      io?.emit('sensor:reading', { machineId: machine.machineId, machineName: machine.name, reading: reading.toObject() });
    }
    lastError = null;
    emitStatus();
    if (readingsCreated >= MAX_READINGS_PER_SESSION) stopSimulator('session-limit');
  } catch (error) {
    lastError = error.message || 'Simulation tick failed.';
    emitStatus();
  } finally {
    inTick = false;
  }
}

export function getSimulatorStatus() { return status(); }
export function startSimulator(options = {}) {
  if (timer) return status();
  const requested = Number(options.intervalMs ?? 5000);
  intervalMs = bounded(Number.isFinite(requested) ? Math.round(requested) : 5000, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
  startedAt = new Date().toISOString();
  readingsCreated = 0;
  lastError = null;
  timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  emitStatus();
  void tick();
  return status();
}
export function stopSimulator(reason = 'manual') {
  if (timer) clearInterval(timer);
  timer = null;
  emitStatus();
  return { ...status(), stoppedReason: reason };
}
