import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import Machine from '../src/models/Machine.js';
import SensorReading from '../src/models/SensorReading.js';
import Alert from '../src/models/Alert.js';
import MaintenanceTask from '../src/models/MaintenanceTask.js';

const seedMachines = [
  { machineId: 'CNC-001', name: 'CNC Milling Center', type: 'CNC Machine', location: 'Production · Line A', status: 'Healthy', healthScore: 98, dataMode: 'simulated', maintenanceIntervalDays: 90, nextMaintenanceAt: new Date('2026-10-24T00:00:00Z') },
  { machineId: 'PRS-004', name: 'Hydraulic Press 04', type: 'Hydraulic Press', location: 'Assembly · Line B', status: 'Warning', healthScore: 71, dataMode: 'simulated', maintenanceIntervalDays: 60, nextMaintenanceAt: new Date('2026-10-13T00:00:00Z') },
  { machineId: 'MTR-012', name: 'Conveyor Motor 12', type: 'Electric Motor', location: 'Packaging · Line C', status: 'Critical', healthScore: 38, dataMode: 'simulated', maintenanceIntervalDays: 45, nextMaintenanceAt: new Date('2026-10-10T00:00:00Z') },
  { machineId: 'ROB-003', name: 'Assembly Robot 03', type: 'Robotic Arm', location: 'Assembly · Line A', status: 'Healthy', healthScore: 94, dataMode: 'simulated', maintenanceIntervalDays: 90, nextMaintenanceAt: new Date('2026-11-02T00:00:00Z') },
  { machineId: 'PMP-008', name: 'Cooling Pump 08', type: 'Centrifugal Pump', location: 'Utilities · Plant 1', status: 'Healthy', healthScore: 91, dataMode: 'simulated', maintenanceIntervalDays: 60, nextMaintenanceAt: new Date('2026-10-29T00:00:00Z') },
];

try {
  await connectDatabase();
  await Promise.all([Alert.deleteMany({ alertId: { $regex: '^SEED-ALT-' } }), MaintenanceTask.deleteMany({ taskId: { $regex: '^SEED-MT-' } }), SensorReading.deleteMany({ seedKey: 'preventix-seed-v1' })]);
  const machines = [];
  for (const seed of seedMachines) {
    const machine = await Machine.findOneAndUpdate({ machineId: seed.machineId }, { $set: seed }, { upsert: true, new: true, runValidators: true });
    machines.push(machine);
  }
  const byId = new Map(machines.map(machine => [machine.machineId, machine]));
  const readingSpecs = [
    ['CNC-001', 42.8, 58.1, 1480, 34.2, 12, 1.2], ['PRS-004', 68.4, 78.2, 1120, 58.7, 48, 3.8], ['MTR-012', 84.1, 96.5, 920, 76.2, 81, 6.4], ['ROB-003', 39.2, 54.8, 1720, 29.5, 8, 0.9], ['PMP-008', 46.6, 62.3, 1450, 32.1, 21, 1.5],
  ];
  await SensorReading.insertMany(readingSpecs.map(([id, airTemperature, processTemperature, rotationalSpeed, torque, toolWear, vibration], i) => ({ machine: byId.get(id)._id, airTemperature, processTemperature, rotationalSpeed, torque, toolWear, vibration, source: 'simulated', seedKey: 'preventix-seed-v1', recordedAt: new Date(Date.now() - i * 12_000) })));
  const alertSpecs = [
    ['MTR-012', 'Critical', 'Motor temperature above threshold', 'Inspect cooling and bearing assembly'],
    ['PRS-004', 'Warning', 'Elevated torque deviation detected', 'Review pressure and load calibration'],
    ['PMP-008', 'Info', 'Scheduled maintenance approaching', 'Confirm technician assignment'],
  ];
  await Alert.insertMany(alertSpecs.map(([id, severity, title, recommendedAction], i) => ({ alertId: `SEED-ALT-${i + 1}`, machine: byId.get(id)._id, severity, title, recommendedAction, source: 'demo', status: 'Active', occurredAt: new Date(Date.now() - (i + 1) * 60_000) })));
  const taskSpecs = [
    ['MTR-012', 'Bearing inspection', 'Urgent', ''], ['PRS-004', 'Hydraulic fluid check', 'High', 'A. Sharma'], ['CNC-001', 'Routine calibration', 'Normal', 'R. Kumar'],
  ];
  await MaintenanceTask.insertMany(taskSpecs.map(([id, title, priority, assignedTo], i) => ({ taskId: `SEED-MT-${i + 1}`, machine: byId.get(id)._id, title, priority, assignedTo, status: 'Open', dueAt: new Date(Date.now() + (i - 1) * 86_400_000) })));
  console.log(`Seeded ${machines.length} machines plus simulated readings, demo alerts, and maintenance tasks.`);
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
