/**
 * GraphTutor V3.0 - 复习计划模型
 * 
 * 功能：管理用户的错题复习计划
 */

import mongoose from 'mongoose';

const ReviewPlanSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 计划名称
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },

    // 计划描述
    description: {
      type: String,
      maxlength: 500,
    },

    // 计划类型
    type: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'daily',
    },

    // 计划状态
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },

    // 复习策略
    strategy: {
      type: String,
      enum: ['all', 'unmastered', 'due', 'random', 'by_category'],
      default: 'due',
    },

    // 每天复习题目数量
    dailyCount: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },

    // 复习时间（HH:mm格式）
    reviewTime: {
      type: String,
      default: '09:00',
    },

    // 复习提醒
    reminder: {
      enabled: {
        type: Boolean,
        default: true,
      },
      time: {
        type: String, // HH:mm格式
        default: '08:00',
      },
      days: {
        type: [Number], // 0-6 表示周日到周六
        default: [1, 2, 3, 4, 5], // 默认工作日
      },
    },

    // 筛选条件
    filters: {
      // 学科代码（数组）
      subjectCodes: {
        type: [String],
        default: [],
      },
      // 分类（数组）
      categories: {
        type: [String],
        default: [],
      },
      // 标签（数组）
      tags: {
        type: [String],
        default: [],
      },
      // 掌握状态
      masteryStatus: {
        type: [String],
        default: [],
      },
      // 难度范围
      difficultyRange: {
        min: { type: Number, min: 1, max: 5 },
        max: { type: Number, min: 1, max: 5 },
      },
    },

    // 开始日期
    startDate: {
      type: Date,
      default: Date.now,
    },

    // 结束日期
    endDate: {
      type: Date,
    },

    // 统计信息
    stats: {
      // 总复习次数
      totalReviews: {
        type: Number,
        default: 0,
      },
      // 完成的复习次数
      completedReviews: {
        type: Number,
        default: 0,
      },
      // 掌握的题目数
      masteredCount: {
        type: Number,
        default: 0,
      },
    },

    // 最后执行时间
    lastExecutedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
ReviewPlanSchema.index({ userId: 1, status: 1 });
ReviewPlanSchema.index({ userId: 1, type: 1 });

// 实例方法：获取今日复习题目
ReviewPlanSchema.methods.getTodayQuestions = async function () {
  const WrongQuestion = mongoose.model('WrongQuestion');
  
  const query = {
    userId: this.userId,
  };

  // 根据策略筛选
  if (this.strategy === 'due') {
    query.nextReviewAt = { $lte: new Date() };
  } else if (this.strategy === 'unmastered') {
    query.masteryStatus = 'unmastered';
  } else if (this.strategy === 'by_category' && this.filters.categories.length > 0) {
    query.category = { $in: this.filters.categories };
  }

  // 应用筛选条件
  if (this.filters.subjectCodes.length > 0) {
    query.subjectCode = { $in: this.filters.subjectCodes };
  }
  if (this.filters.tags.length > 0) {
    query.tags = { $in: this.filters.tags };
  }
  if (this.filters.masteryStatus.length > 0) {
    query.masteryStatus = { $in: this.filters.masteryStatus };
  }

  const questions = await WrongQuestion.find(query)
    .sort({ nextReviewAt: 1, mastery: 1 })
    .limit(this.dailyCount)
    .lean();

  return questions;
};

// 实例方法：更新统计
ReviewPlanSchema.methods.updateStats = async function () {
  const WrongQuestion = mongoose.model('WrongQuestion');
  
  const query = { userId: this.userId };
  
  // 应用筛选条件
  if (this.filters.subjectCodes.length > 0) {
    query.subjectCode = { $in: this.filters.subjectCodes };
  }
  if (this.filters.categories.length > 0) {
    query.category = { $in: this.filters.categories };
  }
  if (this.filters.tags.length > 0) {
    query.tags = { $in: this.filters.tags };
  }

  const stats = await WrongQuestion.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        mastered: { $sum: { $cond: [{ $eq: ['$isMastered', true] }, 1, 0] } },
      },
    },
  ]);

  if (stats.length > 0) {
    this.stats.masteredCount = stats[0].mastered || 0;
  }

  return this.save();
};

const ReviewPlan = mongoose.model('ReviewPlan', ReviewPlanSchema);

export default ReviewPlan;

