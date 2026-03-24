/**
 * GraphTutor V3.0 - 师徒关系模型
 * 用于悬赏/师徒功能：师傅-徒弟关系、申请与接受
 */

import mongoose from 'mongoose';

const MentorRelationSchema = new mongoose.Schema(
  {
    masterId: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    apprenticeId: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected'],
      default: 'pending',
      index: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

MentorRelationSchema.index({ masterId: 1, apprenticeId: 1 }, { unique: true });
MentorRelationSchema.index({ apprenticeId: 1, status: 1 });

export default mongoose.model('MentorRelation', MentorRelationSchema);
