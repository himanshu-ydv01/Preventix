import { Router } from 'express';
import { z } from 'zod';
import Machine from '../models/Machine.js';
import Alert from '../models/Alert.js';
import MaintenanceTask from '../models/MaintenanceTask.js';
import AuditEvent from '../models/AuditEvent.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Idempotent maintenance checks: don't create another unresolved alert for the same machine/rule.
router.post('/run', validate(z.object({ body: z.object({ includeOverdue: z.boolean().default(true), includeUpcoming: z.boolean().default(false) }).default({}) })), asyncHandler(async (req, res) => {
  const { includeOverdue, includeUpcoming } = req.validated.body;
  const now = new Date();
  const machines = await Machine.find({ isActive: true }).select('_id machineId name status nextMaintenanceAt').lean();
  let created = 0; let skipped = 0;
  for (const machine of machines) {
    const due = machine.nextMaintenanceAt ? new Date(machine.nextMaintenanceAt) : null;
    const overdue = due && due < now;
    const upcoming = due && due >= now && due <= new Date(now.getTime() + 7 * 86400000);
    const statusConcern = ['Warning', 'Critical', 'Offline'].includes(machine.status);
    const rules = [];
    if (includeOverdue && overdue) rules.push({ key: 'maintenance-overdue', severity: 'Warning', title: `Maintenance overdue: ${machine.name}`, description: `${machine.machineId} passed its scheduled maintenance date.`, recommendedAction: 'Review the machine and schedule maintenance with a qualified technician.' });
    if (includeUpcoming && upcoming) rules.push({ key: 'maintenance-upcoming', severity: 'Info', title: `Maintenance due soon: ${machine.name}`, description: `${machine.machineId} is due for maintenance within seven days.`, recommendedAction: 'Confirm the maintenance plan and technician availability.' });
    if (statusConcern) rules.push({ key: `machine-${machine.status.toLowerCase()}`, severity: machine.status === 'Critical' ? 'Critical' : 'Warning', title: `Machine status: ${machine.name} (${machine.status})`, description: `${machine.machineId} is marked ${machine.status}.`, recommendedAction: 'Review recent readings and follow the site maintenance procedure.' });
    for (const rule of rules) {
      const exists = await Alert.exists({ machine: machine._id, status: { $in: ['Active', 'Acknowledged'] }, source: 'schedule', 'automationKey': rule.key });
      if (exists) { skipped++; continue; }
      const alert = await Alert.create({ machine: machine._id, severity: rule.severity, title: rule.title, description: rule.description, recommendedAction: rule.recommendedAction, source: 'schedule', alertId: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`, automationKey: rule.key });
      await AuditEvent.create({ action: 'automation.alert-created', entityType: 'alert', entityId: String(alert._id), summary: `Automation created ${rule.severity.toLowerCase()} alert for ${machine.machineId}.`, metadata: { machineId: machine.machineId, rule: rule.key } });
      created++;
    }
  }
  await AuditEvent.create({ action: 'automation.run', entityType: 'automation', summary: `Maintenance automation completed: ${created} alerts created, ${skipped} duplicate rules skipped.`, metadata: { created, skipped, machineCount: machines.length } });
  res.json({ data: { machinesChecked: machines.length, alertsCreated: created, duplicatesSkipped: skipped, ranAt: now.toISOString() } });
}));

router.get('/audit', validate(z.object({ query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), entityType: z.enum(['alert', 'maintenance', 'machine', 'automation']).optional() }) })), asyncHandler(async (req, res) => {
  const { limit, entityType } = req.validated.query;
  const filter = entityType ? { entityType } : {};
  res.json({ data: await AuditEvent.find(filter).sort({ occurredAt: -1 }).limit(limit).lean() });
}));

router.get('/analytics', asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 86400000);
  const [machineCounts, alertCounts, taskCounts, predictionCounts, recentReadings] = await Promise.all([
    Machine.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Alert.aggregate([{ $match: { occurredAt: { $gte: since } } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    MaintenanceTask.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    (await import('../models/Prediction.js')).default.aggregate([{ $match: { predictedAt: { $gte: since } } }, { $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
    (await import('../models/SensorReading.js')).default.find({ recordedAt: { $gte: since } }).sort({ recordedAt: -1 }).limit(500).select('recordedAt airTemperature processTemperature rotationalSpeed torque toolWear source machine').lean(),
  ]);
  res.json({ data: { periodDays: 30, generatedAt: new Date().toISOString(), machinesByStatus: machineCounts, alertsBySeverity: alertCounts, tasksByStatus: taskCounts, predictionsByRisk: predictionCounts, recentReadings } });
}));
export default router;
