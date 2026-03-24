/**
 * GraphTutor V3.0 - 群组作业（轻量级 LMS）
 * 老师/群主布置：指定题库 + 题数 + 截止时间
 */

import mongoose from 'mongoose';

const GroupAssignmentSchema = new mongoose.Schema(
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
      max: 200,
    },
    title: {
      type: String,
      default: '作业',
      maxlength: 200,
    },
    dueAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

GroupAssignmentSchema.index({ groupId: 1, createdAt: -1 });
GroupAssignmentSchema.index({ groupId: 1, status: 1 });

export default mongoose.model('GroupAssignment', GroupAssignmentSchema);
