import { Router } from 'express';
import { z } from 'zod';
import MaintenanceTask from '../models/MaintenanceTask.js';
import Machine from '../models/Machine.js';
import AuditEvent from '../models/AuditEvent.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const taskBody = z.object({ machineId: z.string().trim().min(2).max(40), title: z.string().trim().min(2).max(180), description: z.string().trim().max(1500).optional(), priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).default('Normal'), status: z.enum(['Open', 'In Progress', 'Completed', 'Cancelled']).default('Open'), assignedTo: z.string().trim().max(120).optional(), dueAt: z.coerce.date().optional().nullable(), notes: z.string().trim().max(3000).optional() });
router.get('/', validate(z.object({ query: z.object({ status: z.enum(['Open', 'In Progress', 'Completed', 'Cancelled']).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }) })), asyncHandler(async (req, res) => {
  const { status, limit } = req.validated.query;
  res.json({ data: await MaintenanceTask.find(status ? { status } : {}).populate('machine', 'machineId name type location').sort({ dueAt: 1, createdAt: -1 }).limit(limit).lean() });
}));
router.post('/', validate(z.object({ body: taskBody })), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const machine = await Machine.findOne({ machineId: body.machineId.toUpperCase() });
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: 'Machine not found.' } });
  const task = await MaintenanceTask.create({ ...body, machine: machine._id, taskId: `MT-${Date.now().toString(36).toUpperCase()}` });
  res.status(201).json({ data: task });
}));
router.patch('/:id/status', validate(z.object({ body: z.object({ status: z.enum(['Open', 'In Progress', 'Completed', 'Cancelled']) }) })), asyncHandler(async (req, res) => {
  const task = await MaintenanceTask.findById(req.params.id);
  if (!task) return res.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Maintenance task not found.' } });
  task.status = req.validated.body.status;
  task.completedAt = task.status === 'Completed' ? new Date() : null;
  await task.save();
  await AuditEvent.create({ action: `maintenance.${task.status.toLowerCase().replace(/\s+/g, '-')}`, entityType: 'maintenance', entityId: String(task._id), summary: `Maintenance task ${task.taskId || task._id} marked ${task.status.toLowerCase()}.`, metadata: { status: task.status, priority: task.priority, assignedTo: task.assignedTo } });
  res.json({ data: task });
}));
export default router;
