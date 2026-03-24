/**
 * GraphTutor V3.0 - 学习计划模型
 * 
 * 功能：存储用户的学习计划
 */

import mongoose from 'mongoose';

const StudyPlanSchema = new mongoose.Schema(
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
      maxlength: 200,
      trim: true,
    },

    // 计划描述
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },

    // 计划类型：daily（每日）、weekly（每周）、custom（自定义）
    type: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'daily',
    },

    // 开始日期
    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    // 结束日期
    endDate: {
      type: Date,
      required: true,
      index: true,
    },

    // 每日目标题数
    dailyTarget: {
      type: Number,
      default: 10,
      min: 1,
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

    // 计划状态：active（进行中）、completed（已完成）、paused（已暂停）、cancelled（已取消）
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
      index: true,
    },

    // 提醒设置
    reminders: {
      enabled: {
        type: Boolean,
        default: false,
      },
      times: [{
        hour: { type: Number, min: 0, max: 23 },
        minute: { type: Number, min: 0, max: 59 },
      }],
    },

    // 统计信息
    stats: {
      totalDays: { type: Number, default: 0 },
      completedDays: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      completedQuestions: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 }, // 连续打卡天数
      longestStreak: { type: Number, default: 0 }, // 最长连续打卡天数
    },

    // 自适应学习引擎：生成来源与目标描述
    source: {
      type: String,
      enum: ['manual', 'adaptive'],
      default: 'manual',
    },
    goalText: {
      type: String,
      maxlength: 300,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// 索引
StudyPlanSchema.index({ userId: 1, status: 1 });
StudyPlanSchema.index({ userId: 1, startDate: 1, endDate: 1 });
StudyPlanSchema.index({ userId: 1, createdAt: -1 });
StudyPlanSchema.index({ status: 1, endDate: 1 }); // 用于查找过期的计划

// 虚拟字段：计划进度百分比
StudyPlanSchema.virtual('progress').get(function () {
  if (this.stats.totalDays === 0) return 0;
  return Math.round((this.stats.completedDays / this.stats.totalDays) * 100);
});

// 虚拟字段：是否已过期
StudyPlanSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

// 虚拟字段：剩余天数
StudyPlanSchema.virtual('remainingDays').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(this.endDate);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
});

// 确保虚拟字段在JSON输出中包含
StudyPlanSchema.set('toJSON', { virtuals: true });
StudyPlanSchema.set('toObject', { virtuals: true });

// 实例方法：更新统计信息
StudyPlanSchema.methods.updateStats = async function () {
  const StudyCheckIn = mongoose.model('StudyCheckIn');
  const StudyTask = mongoose.model('StudyTask');

  // 计算总天数
  const totalDays = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;

  // 计算已完成天数（有打卡记录的天数）
  const completedDays = await StudyCheckIn.countDocuments({
    userId: this.userId,
    planId: this._id,
  });

  // 计算总题目数和已完成题目数
  const tasks = await StudyTask.find({ planId: this._id }).lean();
  const totalQuestions = tasks.reduce((sum, task) => sum + (task.targetCount || 0), 0);
  const completedQuestions = tasks.reduce((sum, task) => sum + (task.completedCount || 0), 0);

  // 计算连续打卡天数
  const checkIns = await StudyCheckIn.find({
    userId: this.userId,
    planId: this._id,
  })
    .sort({ date: -1 })
    .lean();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < checkIns.length; i++) {
    const checkInDate = new Date(checkIns[i].date);
    checkInDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - checkInDate) / (1000 * 60 * 60 * 24));

    if (i === 0 && daysDiff === 0) {
      // 今天已打卡
      currentStreak = 1;
      tempStreak = 1;
    } else if (i === 0 && daysDiff === 1) {
      // 昨天打卡，今天未打卡
      currentStreak = 0;
      tempStreak = 1;
    } else if (i > 0) {
      const prevDate = new Date(checkIns[i - 1].date);
      prevDate.setHours(0, 0, 0, 0);
      const prevDaysDiff = Math.floor((today - prevDate) / (1000 * 60 * 60 * 24));
      const daysBetween = Math.floor((prevDate - checkInDate) / (1000 * 60 * 60 * 24));

      if (daysBetween === 1) {
        // 连续打卡
        tempStreak++;
        if (i === 1 && prevDaysDiff === 0) {
          currentStreak = tempStreak;
        }
      } else {
        // 中断
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  this.stats = {
    totalDays,
    completedDays,
    totalQuestions,
    completedQuestions,
    currentStreak,
    longestStreak,
  };

  await this.save();
  return this.stats;
};

const StudyPlan = mongoose.model('StudyPlan', StudyPlanSchema);

export default StudyPlan;

