import { Router } from 'express';
import { z } from 'zod';
import Machine from '../models/Machine.js';
import SensorReading from '../models/SensorReading.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const statuses = ['Healthy', 'Warning', 'Critical', 'Offline'];
const machineBody = z.object({
  machineId: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().min(2).max(160),
  installationDate: z.coerce.date().optional().nullable(),
  status: z.enum(statuses).optional(),
  healthScore: z.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  maintenanceIntervalDays: z.number().int().min(1).max(3650).optional(),
  nextMaintenanceAt: z.coerce.date().optional().nullable(),
  sensorConfig: z.record(z.boolean()).optional(),
  dataMode: z.enum(['simulated', 'live', 'unknown']).optional(),
});
const updateBody = machineBody.omit({ machineId: true }).partial();
const querySchema = z.object({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(statuses).optional(), search: z.string().trim().max(100).optional(), active: z.enum(['true', 'false']).optional() }) });

async function findMachine(id) {
  return Machine.findOne({ $or: [{ machineId: String(id).toUpperCase() }, ...(String(id).match(/^[a-f\d]{24}$/i) ? [{ _id: id }] : [])] });
}

router.get('/', validate(querySchema), asyncHandler(async (req, res) => {
  const { page, limit, status, search, active } = req.validated.query;
  const filter = {};
  if (status) filter.status = status;
  if (active !== undefined) filter.isActive = active === 'true';
  if (search) filter.$or = ['name', 'machineId', 'type', 'location'].map(field => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }));
  const [items, total] = await Promise.all([Machine.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Machine.countDocuments(filter)]);
  res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.post('/', validate(z.object({ body: machineBody })), asyncHandler(async (req, res) => {
  const machine = await Machine.create(req.validated.body);
  res.status(201).json({ data: machine });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const machine = await findMachine(req.params.id);
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: 'Machine not found.' } });
  const latestReading = await SensorReading.findOne({ machine: machine._id }).sort({ recordedAt: -1 }).lean();
  res.json({ data: { machine, latestReading } });
}));

router.patch('/:id', validate(z.object({ body: updateBody })), asyncHandler(async (req, res) => {
  const machine = await findMachine(req.params.id);
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: 'Machine not found.' } });
  Object.assign(machine, req.validated.body);
  await machine.save();
  res.json({ data: machine });
}));

router.get('/:id/readings', validate(z.object({ query: z.object({ limit: z.coerce.number().int().min(1).max(500).default(100), from: z.coerce.date().optional(), to: z.coerce.date().optional() }) })), asyncHandler(async (req, res) => {
  const machine = await findMachine(req.params.id);
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: 'Machine not found.' } });
  const { limit, from, to } = req.validated.query;
  const filter = { machine: machine._id };
  if (from || to) filter.recordedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const items = await SensorReading.find(filter).sort({ recordedAt: -1 }).limit(limit).lean();
  res.json({ data: items });
}));

router.post('/:id/readings', validate(z.object({ body: z.object({ recordedAt: z.coerce.date().optional(), airTemperature: z.number().min(-50).max(250), processTemperature: z.number().min(-50).max(350), rotationalSpeed: z.number().min(0).max(100000), torque: z.number().min(0).max(10000), toolWear: z.number().min(0).max(100000), vibration: z.number().min(0).max(1000).optional(), source: z.enum(['simulated', 'sensor', 'manual']).default('manual') }) })), asyncHandler(async (req, res) => {
  const machine = await findMachine(req.params.id);
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: 'Machine not found.' } });
  const reading = await SensorReading.create({ ...req.validated.body, machine: machine._id });
  res.status(201).json({ data: reading });
}));

export default router;
