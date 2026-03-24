/**
 * GraphTutor V3.0 - 学习打卡模型
 * 
 * 功能：记录用户每日的学习打卡情况
 */

import mongoose from 'mongoose';

const StudyCheckInSchema = new mongoose.Schema(
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

    // 打卡日期
    date: {
      type: Date,
      required: true,
      index: true,
    },

    // 学习时长（分钟）
    studyDuration: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 完成题数
    completedQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 正确题数
    correctQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 打卡心情：great（很好）、good（不错）、normal（一般）、bad（不好）
    mood: {
      type: String,
      enum: ['great', 'good', 'normal', 'bad'],
      default: 'normal',
    },

    // 学习内容摘要
    summary: {
      type: String,
      maxlength: 500,
      default: '',
    },

    // 打卡图片（URL）
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// 索引
StudyCheckInSchema.index({ userId: 1, planId: 1, date: 1 }, { unique: true });
StudyCheckInSchema.index({ userId: 1, date: -1 });
StudyCheckInSchema.index({ planId: 1, date: -1 });
StudyCheckInSchema.index({ userId: 1, createdAt: -1 }); // 用于查询最近的打卡记录

// 虚拟字段：正确率
StudyCheckInSchema.virtual('accuracy').get(function () {
  if (this.completedQuestions === 0) return 0;
  return Math.round((this.correctQuestions / this.completedQuestions) * 100);
});

// 虚拟字段：学习时长（小时）
StudyCheckInSchema.virtual('durationHours').get(function () {
  return (this.studyDuration / 60).toFixed(1);
});

// 确保虚拟字段在JSON输出中包含
StudyCheckInSchema.set('toJSON', { virtuals: true });
StudyCheckInSchema.set('toObject', { virtuals: true });

// 静态方法：获取用户在某日期范围内的打卡记录
StudyCheckInSchema.statics.getCheckInsByDateRange = async function (userId, startDate, endDate, planId = null) {
  const query = {
    userId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };
  if (planId) {
    query.planId = planId;
  }
  return await this.find(query).sort({ date: -1 }).lean();
};

// 静态方法：检查用户今天是否已打卡
StudyCheckInSchema.statics.hasCheckedInToday = async function (userId, planId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const query = {
    userId,
    planId,
    date: {
      $gte: today,
      $lt: tomorrow,
    },
  };

  const checkIn = await this.findOne(query);
  return !!checkIn;
};

// 静态方法：获取用户的打卡统计
StudyCheckInSchema.statics.getUserCheckInStats = async function (userId, startDate, endDate) {
  const checkIns = await this.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).lean();

  const totalDays = checkIns.length;
  const totalDuration = checkIns.reduce((sum, c) => sum + (c.studyDuration || 0), 0);
  const totalQuestions = checkIns.reduce((sum, c) => sum + (c.completedQuestions || 0), 0);
  const totalCorrect = checkIns.reduce((sum, c) => sum + (c.correctQuestions || 0), 0);

  // 计算连续打卡天数
  const sortedCheckIns = checkIns.sort((a, b) => new Date(b.date) - new Date(a.date));
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedCheckIns.length; i++) {
    const checkInDate = new Date(sortedCheckIns[i].date);
    checkInDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - checkInDate) / (1000 * 60 * 60 * 24));

    if (i === 0 && daysDiff === 0) {
      currentStreak = 1;
    } else if (i === 0 && daysDiff === 1) {
      currentStreak = 1;
    } else if (i > 0) {
      const prevDate = new Date(sortedCheckIns[i - 1].date);
      prevDate.setHours(0, 0, 0, 0);
      const daysBetween = Math.floor((prevDate - checkInDate) / (1000 * 60 * 60 * 24));
      if (daysBetween === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    totalDays,
    totalDuration,
    totalQuestions,
    totalCorrect,
    accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions * 100).toFixed(2) : 0,
    currentStreak,
    averageDuration: totalDays > 0 ? Math.round(totalDuration / totalDays) : 0,
  };
};

const StudyCheckIn = mongoose.model('StudyCheckIn', StudyCheckInSchema);

export default StudyCheckIn;

