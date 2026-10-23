import mongoose from 'mongoose';

const ContentPurchaseSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, enum: ['bank', 'note'], required: true },
    targetId: { type: String, required: true },
    points: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

ContentPurchaseSchema.index({ userId: 1, kind: 1, targetId: 1 }, { unique: true });

export default mongoose.model('ContentPurchase', ContentPurchaseSchema);
