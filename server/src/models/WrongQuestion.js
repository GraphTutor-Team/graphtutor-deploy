/**
 * GraphTutor V3.0 - 错题本模型
 * 
 * 功能：存储用户的错题，支持分类、标签、掌握度追踪
 */

import mongoose from 'mongoose';

const WrongQuestionSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 题目ID
    questionId: {
      type: String,
      required: true,
      index: true,
    },

    // 学科代码
    subjectCode: {
      type: String,
      index: true,
    },

    // 知识点ID
    knowledgeNodeId: {
      type: String,
      index: true,
    },

    // 分类（用户自定义）
    category: {
      type: String,
      default: '未分类',
      index: true,
    },

    // 标签（数组）
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // 掌握度（0-100）
    mastery: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    // 掌握状态
    masteryStatus: {
      type: String,
      enum: ['unmastered', 'learning', 'mastered'],
      default: 'unmastered',
      index: true,
    },

    // 错误次数
    errorCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    // 复习次数
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 首次错误时间
    firstErrorAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // 最后错误时间
    lastErrorAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // 最后复习时间
    lastReviewAt: {
      type: Date,
    },

    // 下次复习时间（基于遗忘曲线）
    nextReviewAt: {
      type: Date,
      index: true,
    },

    // 复习计划（基于SuperMemo算法）
    reviewPlan: {
      // 简易因子（1.3-2.5，默认2.5）
      easinessFactor: {
        type: Number,
        default: 2.5,
        min: 1.3,
        max: 2.5,
      },
      // 当前间隔（天数）
      interval: {
        type: Number,
        default: 1,
        min: 1,
      },
      // 重复次数
      repetitions: {
        type: Number,
        default: 0,
        min: 0,
      },
      // 下次复习日期
      nextReviewDate: {
        type: Date,
        index: true,
      },
    },

    // 是否已掌握（用户标记）
    isMastered: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 掌握时间
    masteredAt: {
      type: Date,
    },

    // 备注
    notes: {
      type: String,
      maxlength: 1000,
    },

    // 关联的答题记录ID（最新的错误记录）
    lastRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
    },
  },
  {
    timestamps: true,
  }
);

// 索引
WrongQuestionSchema.index({ userId: 1, questionId: 1 }, { unique: true });
WrongQuestionSchema.index({ userId: 1, category: 1 });
WrongQuestionSchema.index({ userId: 1, masteryStatus: 1 });
WrongQuestionSchema.index({ userId: 1, nextReviewAt: 1 });
WrongQuestionSchema.index({ userId: 1, tags: 1 });

// 实例方法：更新掌握度
WrongQuestionSchema.methods.updateMastery = function (isCorrect) {
  if (isCorrect) {
    // 答对了，掌握度增加
    this.mastery = Math.min(100, this.mastery + 20);
    this.reviewCount += 1;
    this.lastReviewAt = new Date();
    
    // 如果掌握度达到80以上，标记为已掌握
    if (this.mastery >= 80 && !this.isMastered) {
      this.masteryStatus = 'mastered';
      this.isMastered = true;
      this.masteredAt = new Date();
    } else if (this.mastery >= 50) {
      this.masteryStatus = 'learning';
    }
  } else {
    // 答错了，掌握度降低
    this.mastery = Math.max(0, this.mastery - 10);
    this.errorCount += 1;
    this.lastErrorAt = new Date();
    this.masteryStatus = 'unmastered';
    this.isMastered = false;
  }

  // 计算下次复习时间（基于掌握度和遗忘曲线）
  this.calculateNextReview();
  
  return this.save();
};

// 实例方法：计算下次复习时间（使用SuperMemo算法）
WrongQuestionSchema.methods.calculateNextReview = function (quality = null) {
  // 如果没有提供quality，根据掌握度估算
  if (quality === null) {
    if (this.mastery >= 80) {
      quality = 5; // 完全掌握
    } else if (this.mastery >= 50) {
      quality = 4; // 基本掌握
    } else {
      quality = 2; // 未掌握
    }
  }

  // 确保quality在0-5范围内
  quality = Math.max(0, Math.min(5, quality));

  // 初始化复习计划
  if (!this.reviewPlan) {
    this.reviewPlan = {
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 0,
    };
  }

  const { easinessFactor = 2.5, interval = 1, repetitions = 0 } = this.reviewPlan;

  // SuperMemo 2算法
  // 更新简易因子
  let newEF = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, Math.min(2.5, newEF)); // 限制在1.3-2.5之间

  // 计算新间隔
  let newInterval;
  let newRepetitions = repetitions;

  if (quality < 3) {
    // 回答错误，重置
    newInterval = 1;
    newRepetitions = 0;
  } else {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }
    newRepetitions += 1;
  }

  // 更新复习计划
  this.reviewPlan = {
    easinessFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
  };

  // 同时更新nextReviewAt（向后兼容）
  this.nextReviewAt = this.reviewPlan.nextReviewDate;

  return this.reviewPlan;
};

// 静态方法：获取用户的错题统计
WrongQuestionSchema.statics.getUserStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        mastered: { $sum: { $cond: [{ $eq: ['$isMastered', true] }, 1, 0] } },
        unmastered: { $sum: { $cond: [{ $eq: ['$masteryStatus', 'unmastered'] }, 1, 0] } },
        learning: { $sum: { $cond: [{ $eq: ['$masteryStatus', 'learning'] }, 1, 0] } },
        avgMastery: { $avg: '$mastery' },
        totalErrors: { $sum: '$errorCount' },
        totalReviews: { $sum: '$reviewCount' },
      },
    },
  ]);

  return stats[0] || {
    total: 0,
    mastered: 0,
    unmastered: 0,
    learning: 0,
    avgMastery: 0,
    totalErrors: 0,
    totalReviews: 0,
  };
};

const WrongQuestion = mongoose.model('WrongQuestion', WrongQuestionSchema);

export default WrongQuestion;

