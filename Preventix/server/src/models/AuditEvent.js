import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true, maxlength: 100, index: true },
  entityType: { type: String, required: true, enum: ['alert', 'maintenance', 'machine', 'automation'], index: true },
  entityId: { type: String, trim: true, maxlength: 100, default: '' },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  actor: { type: String, trim: true, maxlength: 120, default: 'system' },
  occurredAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, versionKey: false });

auditEventSchema.index({ entityType: 1, occurredAt: -1 });
export default mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);
