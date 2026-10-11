import mongoose from 'mongoose';

const maintenanceTaskSchema = new mongoose.Schema({
  taskId: { type: String, trim: true, uppercase: true, unique: true, sparse: true, index: true },
  machine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 1500, default: '' },
  priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal', index: true },
  status: { type: String, enum: ['Open', 'In Progress', 'Completed', 'Cancelled'], default: 'Open', index: true },
  assignedTo: { type: String, trim: true, maxlength: 120, default: '' },
  dueAt: { type: Date, default: null, index: true },
  completedAt: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 3000, default: '' },
}, { timestamps: true, versionKey: false });

maintenanceTaskSchema.index({ machine: 1, status: 1, dueAt: 1 });
export default mongoose.models.MaintenanceTask || mongoose.model('MaintenanceTask', maintenanceTaskSchema);
