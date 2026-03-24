/**
 * GraphTutor V3.0 - 群组共同练习会话
 * 老师发起后，成员使用同一套题目练习
 */

import mongoose from 'mongoose';

const GroupPracticeSessionSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank',
      required: true,
    },
    questionCount: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    questionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: 'Question',
    },
    title: {
      type: String,
      default: '共同练习',
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

GroupPracticeSessionSchema.index({ groupId: 1, status: 1, createdAt: -1 });

export default mongoose.model('GroupPracticeSession', GroupPracticeSessionSchema);
