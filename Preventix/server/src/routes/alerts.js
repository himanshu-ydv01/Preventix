import { Router } from 'express';
import { z } from 'zod';
import Alert from '../models/Alert.js';
import Machine from '../models/Machine.js';
import AuditEvent from '../models/AuditEvent.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.get('/', validate(z.object({ query: z.object({ status: z.enum(['Active', 'Acknowledged', 'Resolved']).optional(), severity: z.enum(['Info', 'Warning', 'Critical']).optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }) })), asyncHandler(async (req, res) => {
  const { status, severity, limit } = req.validated.query;
  const filter = { ...(status ? { status } : {}), ...(severity ? { severity } : {}) };
  res.json({ data: await Alert.find(filter).populate('machine', 'machineId name type').sort({ occurredAt: -1 }).limit(limit).lean() });
}));
router.post('/', validate(z.object({ body: z.object({ machineId: z.string().trim().min(2).max(40).optional(), severity: z.enum(['Info', 'Warning', 'Critical']), title: z.string().trim().min(2).max(180), description: z.string().trim().max(1500).optional(), recommendedAction: z.string().trim().max(1000).optional(), source: z.enum(['rule', 'model', 'schedule', 'manual', 'demo']).default('manual') }) })), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  let machine = null;
  if (body.machineId) {
    machine = await Machine.findOne({ machineId: body.machineId.toUpperCase() });
    if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: 'Machine not found.' } });
  }
  const alert = await Alert.create({ ...body, machine: machine?._id ?? null, alertId: `ALT-${Date.now().toString(36).toUpperCase()}` });
  res.status(201).json({ data: alert });
}));
router.patch('/:id/status', validate(z.object({ body: z.object({ status: z.enum(['Acknowledged', 'Resolved']) }) })), asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) return res.status(404).json({ error: { code: 'ALERT_NOT_FOUND', message: 'Alert not found.' } });
  alert.status = req.validated.body.status;
  if (alert.status === 'Acknowledged') alert.acknowledgedAt = new Date();
  if (alert.status === 'Resolved') alert.resolvedAt = new Date();
  await alert.save();
  await AuditEvent.create({ action: `alert.${alert.status.toLowerCase()}`, entityType: 'alert', entityId: String(alert._id), summary: `Alert ${alert.alertId || alert._id} marked ${alert.status.toLowerCase()}.`, metadata: { status: alert.status, severity: alert.severity } });
  res.json({ data: alert });
}));
export default router;
