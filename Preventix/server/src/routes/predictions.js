import { Router } from 'express';
import { z } from 'zod';
import Prediction from '../models/Prediction.js';
import Machine from '../models/Machine.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.get('/', validate(z.object({ query: z.object({ machineId: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }) })), asyncHandler(async (req, res) => {
  const { machineId, limit } = req.validated.query;
  let filter = {};
  if (machineId) {
    const machine = await Machine.findOne({ machineId: machineId.toUpperCase() });
    if (!machine) return res.json({ data: [] });
    filter.machine = machine._id;
  }
  res.json({ data: await Prediction.find(filter).populate('machine', 'machineId name').sort({ predictedAt: -1 }).limit(limit).lean() });
}));
// This endpoint records an output produced by a trusted prediction workflow; it does not run an ML model.
router.post('/', validate(z.object({ body: z.object({ machineId: z.string().trim().min(2).max(40), modelName: z.string().trim().min(2).max(120), modelVersion: z.string().max(80).optional(), predictedFailure: z.boolean(), failureProbability: z.number().min(0).max(1).optional().nullable(), riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical', 'Unknown']), inputFeatures: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])), contributingFactors: z.array(z.object({ feature: z.string().max(100), impact: z.number().optional(), direction: z.enum(['increases-risk', 'decreases-risk', 'unknown']).default('unknown') })).max(30).optional(), recommendedActions: z.array(z.string().trim().max(500)).max(20).optional(), source: z.enum(['model', 'rule', 'demo']).default('demo') }) })), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const machine = await Machine.findOne({ machineId: body.machineId.toUpperCase() });
  if (!machine) return res.status(404).json({ error: { code: 'MACHINE_NOT_FOUND', message: 'Machine not found.' } });
  const prediction = await Prediction.create({ ...body, machine: machine._id });
  res.status(201).json({ data: prediction });
}));
export default router;
