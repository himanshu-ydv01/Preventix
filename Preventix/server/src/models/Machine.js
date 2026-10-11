import mongoose from 'mongoose';

const sensorConfigSchema = new mongoose.Schema({
  temperature: { type: Boolean, default: true },
  processTemperature: { type: Boolean, default: true },
  rotationalSpeed: { type: Boolean, default: true },
  torque: { type: Boolean, default: true },
  toolWear: { type: Boolean, default: true },
  vibration: { type: Boolean, default: true },
}, { _id: false });

const machineSchema = new mongoose.Schema({
  machineId: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  location: { type: String, required: true, trim: true, maxlength: 160 },
  installationDate: { type: Date, default: null },
  status: { type: String, enum: ['Healthy', 'Warning', 'Critical', 'Offline'], default: 'Healthy', index: true },
  healthScore: { type: Number, min: 0, max: 100, default: null },
  isActive: { type: Boolean, default: true, index: true },
  maintenanceIntervalDays: { type: Number, min: 1, max: 3650, default: 90 },
  nextMaintenanceAt: { type: Date, default: null },
  sensorConfig: { type: sensorConfigSchema, default: () => ({}) },
  dataMode: { type: String, enum: ['simulated', 'live', 'unknown'], default: 'simulated' },
}, { timestamps: true, versionKey: false });

machineSchema.index({ name: 'text', machineId: 'text', type: 'text' });
export default mongoose.models.Machine || mongoose.model('Machine', machineSchema);
