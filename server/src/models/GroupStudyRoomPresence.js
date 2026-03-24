/**
 * GraphTutor V3.0 - 小组自习室在线状态
 *
 * 记录成员进入/离开自习室及「今日学习目标」等状态，lastSeenAt 用于判断是否在线（如 5 分钟内有心跳视为在线）
 */

import mongoose from 'mongoose';

const GroupStudyRoomPresenceSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    todayGoal: {
      type: String,
      maxlength: 200,
      default: '',
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

GroupStudyRoomPresenceSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export default mongoose.model('GroupStudyRoomPresence', GroupStudyRoomPresenceSchema);
