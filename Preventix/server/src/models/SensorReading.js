import mongoose from 'mongoose';

const sensorReadingSchema = new mongoose.Schema({
  machine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
  recordedAt: { type: Date, required: true, default: Date.now, index: true },
  airTemperature: { type: Number, min: -50, max: 250, required: true },
  processTemperature: { type: Number, min: -50, max: 350, required: true },
  rotationalSpeed: { type: Number, min: 0, max: 100000, required: true },
  torque: { type: Number, min: 0, max: 10000, required: true },
  toolWear: { type: Number, min: 0, max: 100000, required: true },
  vibration: { type: Number, min: 0, max: 1000, default: null },
  source: { type: String, enum: ['simulated', 'sensor', 'manual'], default: 'simulated' },
  seedKey: { type: String, trim: true, maxlength: 80, default: null },
}, { timestamps: true, versionKey: false });

sensorReadingSchema.index({ machine: 1, recordedAt: -1 });
export default mongoose.models.SensorReading || mongoose.model('SensorReading', sensorReadingSchema);
