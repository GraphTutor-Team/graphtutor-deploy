/**
 * GraphTutor V3.0 - 小组题库（组内共享错题/好题）
 *
 * 成员可将自己的错题或收藏的好题加入小组，形成组内精选题库供所有人练习
 */

import mongoose from 'mongoose';

const GroupSharedQuestionSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
      index: true,
    },
    addedBy: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['wrong', 'good'],
      default: 'good',
    },
    note: {
      type: String,
      maxlength: 300,
      default: '',
    },
  },
  { timestamps: true }
);

GroupSharedQuestionSchema.index({ groupId: 1, questionId: 1 }, { unique: true });
GroupSharedQuestionSchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.model('GroupSharedQuestion', GroupSharedQuestionSchema);
