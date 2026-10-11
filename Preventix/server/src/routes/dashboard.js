import { Router } from 'express';
import Machine from '../models/Machine.js';
import Alert from '../models/Alert.js';
import MaintenanceTask from '../models/MaintenanceTask.js';
import SensorReading from '../models/SensorReading.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.get('/summary', asyncHandler(async (req, res) => {
  const [totalMachines, healthy, warning, critical, offline, activeAlerts, openTasks, latestReadings] = await Promise.all([
    Machine.countDocuments({ isActive: true }),
    Machine.countDocuments({ isActive: true, status: 'Healthy' }),
    Machine.countDocuments({ isActive: true, status: 'Warning' }),
    Machine.countDocuments({ isActive: true, status: 'Critical' }),
    Machine.countDocuments({ isActive: true, status: 'Offline' }),
    Alert.countDocuments({ status: 'Active' }),
    MaintenanceTask.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
    SensorReading.aggregate([{ $sort: { recordedAt: -1 } }, { $group: { _id: '$machine', recordedAt: { $first: '$recordedAt' } } }, { $count: 'machinesWithReadings' }]),
  ]);
  const availability = totalMachines ? Math.round(((totalMachines - offline) / totalMachines) * 1000) / 10 : null;
  res.json({ data: { totalMachines, healthy, warning, critical, offline, activeAlerts, openTasks, availabilityPercent: availability, machinesWithReadings: latestReadings[0]?.machinesWithReadings ?? 0, dataMode: 'database' } });
}));
export default router;
