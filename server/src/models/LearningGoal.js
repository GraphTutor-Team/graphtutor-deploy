/**
 * GraphTutor V3.0 - 学习目标模型
 * 
 * 功能：存储用户的学习目标和计划
 */

import mongoose from 'mongoose';

const LearningGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      default: 'custom',
    },
    targetType: {
      type: String,
      enum: ['questions', 'accuracy', 'knowledge_nodes', 'time'],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 0,
    },
    currentValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    subjectCode: {
      type: String,
      ref: 'Subject',
    },
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    reminder: {
      enabled: {
        type: Boolean,
        default: false,
      },
      time: {
        type: String, // HH:mm 格式
      },
      days: {
        type: [Number], // 0-6 表示周日到周六
        default: [],
      },
    },
  },
  { timestamps: true }
);

// 索引
LearningGoalSchema.index({ userId: 1, status: 1 });
LearningGoalSchema.index({ userId: 1, endDate: 1 });

// 计算进度百分比
LearningGoalSchema.virtual('progress').get(function () {
  if (this.targetValue === 0) return 0;
  return Math.min(100, Math.round((this.currentValue / this.targetValue) * 100));
});

// 检查是否已完成
LearningGoalSchema.methods.isCompleted = function () {
  return this.currentValue >= this.targetValue;
};

// 检查是否已过期
LearningGoalSchema.methods.isExpired = function () {
  return new Date() > this.endDate && this.status === 'active';
};

export default mongoose.model('LearningGoal', LearningGoalSchema);

