import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  machine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true, index: true },
  modelName: { type: String, required: true, trim: true, maxlength: 120 },
  modelVersion: { type: String, trim: true, maxlength: 80, default: 'unknown' },
  predictedFailure: { type: Boolean, required: true },
  failureProbability: { type: Number, min: 0, max: 1, default: null },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical', 'Unknown'], required: true, default: 'Unknown' },
  inputFeatures: { type: mongoose.Schema.Types.Mixed, required: true },
  contributingFactors: [{ feature: { type: String, maxlength: 100 }, impact: { type: Number }, direction: { type: String, enum: ['increases-risk', 'decreases-risk', 'unknown'], default: 'unknown' } }],
  recommendedActions: [{ type: String, trim: true, maxlength: 500 }],
  source: { type: String, enum: ['model', 'rule', 'demo'], default: 'demo' },
  predictedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, versionKey: false });

predictionSchema.index({ machine: 1, predictedAt: -1 });
export default mongoose.models.Prediction || mongoose.model('Prediction', predictionSchema);
