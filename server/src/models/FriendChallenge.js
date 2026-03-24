/**
 * GraphTutor V3.0 - 好友挑战数据模型
 * 
 * 功能：存储好友之间的学习挑战数据
 */

import mongoose from 'mongoose';

const friendChallengeSchema = new mongoose.Schema(
  {
    // 挑战发起者
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 挑战参与者（好友）
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 挑战类型
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      default: 'daily',
    },
    // 挑战标题
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // 挑战描述
    description: {
      type: String,
      trim: true,
    },
    // 挑战目标（题目数量）
    target: {
      type: Number,
      required: true,
      min: 1,
    },
    // 开始时间
    startDate: {
      type: Date,
      default: Date.now,
    },
    // 结束时间
    endDate: {
      type: Date,
      required: true,
    },
    // 挑战状态
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    // 发起者进度
    creatorProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 参与者进度
    participantProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 奖励描述
    reward: {
      type: String,
      trim: true,
    },
    // 难度
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    // 获胜者（null表示平局或未完成）
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // 完成时间
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引：用于查询用户的所有挑战
friendChallengeSchema.index({ creatorId: 1, status: 1 });
friendChallengeSchema.index({ participantId: 1, status: 1 });
friendChallengeSchema.index({ status: 1, endDate: 1 });

// 静态方法：获取用户的挑战列表
friendChallengeSchema.statics.getUserChallenges = function (userId, options = {}) {
  const { status, type } = options;
  const query = {
    $or: [
      { creatorId: userId },
      { participantId: userId },
    ],
  };
  if (status) query.status = status;
  if (type) query.type = type;
  return this.find(query)
    .populate('creatorId', 'name email avatar')
    .populate('participantId', 'name email avatar')
    .populate('winner', 'name email')
    .sort({ createdAt: -1 });
};

// 静态方法：获取两个用户之间的挑战
friendChallengeSchema.statics.getChallengesBetweenUsers = function (userId1, userId2) {
  return this.find({
    $or: [
      { creatorId: userId1, participantId: userId2 },
      { creatorId: userId2, participantId: userId1 },
    ],
  })
    .populate('creatorId', 'name email avatar')
    .populate('participantId', 'name email avatar')
    .populate('winner', 'name email')
    .sort({ createdAt: -1 });
};

// 实例方法：更新进度
friendChallengeSchema.methods.updateProgress = function (userId, progress) {
  if (this.creatorId.toString() === userId.toString()) {
    this.creatorProgress = Math.min(progress, this.target);
  } else if (this.participantId.toString() === userId.toString()) {
    this.participantProgress = Math.min(progress, this.target);
  }
  
  // 检查是否完成
  if (this.creatorProgress >= this.target && this.participantProgress >= this.target) {
    this.status = 'completed';
    this.completedAt = new Date();
    // 判断获胜者
    if (this.creatorProgress > this.participantProgress) {
      this.winner = this.creatorId;
    } else if (this.participantProgress > this.creatorProgress) {
      this.winner = this.participantId;
    }
    // 如果进度相同，winner保持为null（平局）
  } else if (new Date() > this.endDate && this.status === 'active') {
    // 超时未完成
    this.status = 'failed';
  }
  
  return this.save();
};

const FriendChallenge = mongoose.model('FriendChallenge', friendChallengeSchema);

export default FriendChallenge;

