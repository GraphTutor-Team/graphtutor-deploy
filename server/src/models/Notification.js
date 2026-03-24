/**
 * GraphTutor V3.0 - 通知模型
 * 
 * 功能：存储用户通知消息
 */

import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 通知类型
    type: {
      type: String,
      enum: [
        'achievement',      // 成就解锁
        'reply',            // 回复
        'like',             // 点赞
        'reminder',         // 学习提醒
        'goal',             // 目标达成
        'system',           // 系统通知
        'discussion',       // 讨论相关
      ],
      required: true,
    },

    // 通知标题
    title: {
      type: String,
      required: true,
    },

    // 通知内容
    content: {
      type: String,
      required: true,
    },

    // 关联数据（可选）
    relatedId: {
      type: String,
      default: null,
    },

    // 关联类型（可选）
    relatedType: {
      type: String,
      enum: ['question', 'discussion', 'achievement', 'goal', null],
      default: null,
    },

    // 跳转链接（可选）
    link: {
      type: String,
      default: null,
    },

    // 是否已读
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 是否已删除
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 图标（可选）
    icon: {
      type: String,
      default: null,
    },

    // 优先级（1-5，5最高）
    priority: {
      type: Number,
      default: 3,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isDeleted: 1 });
NotificationSchema.index({ userId: 1, type: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;

