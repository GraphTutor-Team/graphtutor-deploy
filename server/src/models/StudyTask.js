/**
 * GraphTutor V3.0 - 学习任务模型
 * 
 * 功能：存储学习计划中的具体任务
 */

import mongoose from 'mongoose';

const StudyTaskSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 计划ID
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
      required: true,
      index: true,
    },

    // 任务日期
    date: {
      type: Date,
      required: true,
      index: true,
    },

    // 任务类型：practice（练习）、review（复习）、exam（考试）
    type: {
      type: String,
      enum: ['practice', 'review', 'exam'],
      default: 'practice',
    },

    // 目标题数
    targetCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 已完成题数
    completedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 目标学科
    subjectCodes: {
      type: [String],
      default: [],
    },

    // 目标知识点
    knowledgeNodeIds: {
      type: [String],
      default: [],
    },

    // 任务状态：pending（待完成）、in_progress（进行中）、completed（已完成）、skipped（已跳过）
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending',
      index: true,
    },

    // 完成时间
    completedAt: {
      type: Date,
    },

    // 备注
    notes: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// 索引
StudyTaskSchema.index({ userId: 1, planId: 1, date: 1 }, { unique: true });
StudyTaskSchema.index({ userId: 1, date: 1 });
StudyTaskSchema.index({ planId: 1, status: 1 });
StudyTaskSchema.index({ userId: 1, status: 1, date: 1 }); // 用于查询待完成任务
StudyTaskSchema.index({ date: 1, status: 1 }); // 用于日历查询

// 虚拟字段：任务完成百分比
StudyTaskSchema.virtual('progress').get(function () {
  if (this.targetCount === 0) return 0;
  return Math.round((this.completedCount / this.targetCount) * 100);
});

// 虚拟字段：是否已完成
StudyTaskSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed' || this.completedCount >= this.targetCount;
});

// 虚拟字段：是否过期（日期已过但未完成）
StudyTaskSchema.virtual('isOverdue').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(this.date);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today && this.status !== 'completed';
});

// 确保虚拟字段在JSON输出中包含
StudyTaskSchema.set('toJSON', { virtuals: true });
StudyTaskSchema.set('toObject', { virtuals: true });

// 实例方法：标记为完成
StudyTaskSchema.methods.markAsCompleted = async function () {
  this.status = 'completed';
  this.completedCount = this.targetCount;
  this.completedAt = new Date();
  await this.save();
  return this;
};

// 实例方法：跳过任务
StudyTaskSchema.methods.skip = async function () {
  this.status = 'skipped';
  await this.save();
  return this;
};

const StudyTask = mongoose.model('StudyTask', StudyTaskSchema);

export default StudyTask;

