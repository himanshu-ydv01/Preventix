import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { getSimulatorStatus, startSimulator, stopSimulator } from '../services/simulator.js';

const router = Router();
router.get('/status', (req, res) => res.json({ data: getSimulatorStatus() }));
router.post('/start', validate(z.object({ body: z.object({ intervalMs: z.number().int().min(2000).max(60000).optional() }).default({}) })), asyncHandler(async (req, res) => {
  const status = startSimulator(req.validated.body);
  res.status(200).json({ data: status, message: status.running ? 'Sensor simulation is running.' : 'Sensor simulation is stopped.' });
}));
router.post('/stop', (req, res) => res.json({ data: stopSimulator('manual'), message: 'Sensor simulation stopped.' }));
export default router;
