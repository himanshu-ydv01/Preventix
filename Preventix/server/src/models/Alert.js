import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  alertId: { type: String, trim: true, uppercase: true, unique: true, sparse: true, index: true },
  machine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', default: null, index: true },
  severity: { type: String, enum: ['Info', 'Warning', 'Critical'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 1500, default: '' },
  recommendedAction: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['Active', 'Acknowledged', 'Resolved'], default: 'Active', index: true },
  source: { type: String, enum: ['rule', 'model', 'schedule', 'manual', 'demo'], default: 'demo' },
  automationKey: { type: String, trim: true, maxlength: 100, default: '', index: true },
  occurredAt: { type: Date, default: Date.now, index: true },
  acknowledgedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

alertSchema.index({ machine: 1, status: 1, occurredAt: -1 });
export default mongoose.models.Alert || mongoose.model('Alert', alertSchema);
