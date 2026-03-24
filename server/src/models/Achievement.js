/**
 * GraphTutor V3.0 - 学习成就模型
 * 
 * 功能：存储用户的学习成就和徽章
 */

import mongoose from 'mongoose';

const AchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'first_answer',        // 首次答题
        'first_correct',       // 首次答对
        'newbie_path',         // 新手路径完成（首次练习+错题本+复习一次）
        'streak_3',           // 连续3天学习
        'streak_7',           // 连续7天学习
        'streak_30',          // 连续30天学习
        'questions_100',      // 累计答题100道
        'questions_500',      // 累计答题500道
        'questions_1000',     // 累计答题1000道
        'accuracy_80',        // 正确率达到80%
        'accuracy_90',        // 正确率达到90%
        'knowledge_master_10', // 掌握10个知识点
        'knowledge_master_50', // 掌握50个知识点
        'goal_completed',     // 完成学习目标
        'perfect_exam',       // 考试满分
        'speed_demon',        // 快速答题
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    icon: {
      type: String,
      default: '🏆',
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// 索引
AchievementSchema.index({ userId: 1, type: 1 }, { unique: true });
AchievementSchema.index({ userId: 1, unlockedAt: -1 });

AchievementSchema.pre('save', function (next) {
  this._wasNew = this.isNew;
  next();
});
// 解锁成就时增加积分（与成就商城打通）
AchievementSchema.post('save', async function () {
  if (this._wasNew && this.userId) {
    try {
      const User = (await import('./User.js')).default;
      await User.findByIdAndUpdate(this.userId, { $inc: { points: 10 } });
    } catch (e) {
      console.warn('Achievement grant points failed:', e?.message);
    }
  }
});

export default mongoose.model('Achievement', AchievementSchema);

