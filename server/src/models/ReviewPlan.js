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
  const filters = this.filters || {};
  const subjectCodes = filters.subjectCodes || [];
  const categories = filters.categories || [];
  const tags = filters.tags || [];
  const masteryStatus = filters.masteryStatus || [];

  const query = {
    userId: this.userId,
  };

  // 根据策略筛选
  if (this.strategy === 'due') {
    query.$or = [
      { nextReviewAt: { $lte: new Date() } },
      { nextReviewAt: null },
      { nextReviewAt: { $exists: false } },
    ];
  } else if (this.strategy === 'unmastered') {
    query.masteryStatus = 'unmastered';
  } else if (this.strategy === 'by_category' && categories.length > 0) {
    query.category = { $in: categories };
  }

  // 应用筛选条件
  if (subjectCodes.length > 0) {
    query.subjectCode = { $in: subjectCodes };
  }
  if (tags.length > 0) {
    query.tags = { $in: tags };
  }
  if (masteryStatus.length > 0) {
    query.masteryStatus = { $in: masteryStatus };
  }

  const limit = this.dailyCount || 10;
  let questions = await WrongQuestion.find(query)
    .sort({ nextReviewAt: 1, mastery: 1 })
    .limit(this.strategy === 'random' ? limit * 3 : limit)
    .lean();

  if (this.strategy === 'random' && questions.length > limit) {
    questions = questions.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  return questions;
};

// 实例方法：更新统计
ReviewPlanSchema.methods.updateStats = async function () {
  const WrongQuestion = mongoose.model('WrongQuestion');
  const filters = this.filters || {};
  const subjectCodes = filters.subjectCodes || [];
  const categories = filters.categories || [];
  const tags = filters.tags || [];

  const query = { userId: this.userId };

  // 应用筛选条件
  if (subjectCodes.length > 0) {
    query.subjectCode = { $in: subjectCodes };
  }
  if (categories.length > 0) {
    query.category = { $in: categories };
  }
  if (tags.length > 0) {
    query.tags = { $in: tags };
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

