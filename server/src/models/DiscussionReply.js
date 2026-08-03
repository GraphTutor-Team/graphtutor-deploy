/**
 * GraphTutor V3.0 - 讨论回复模型
 * 
 * 功能：存储讨论的回复
 */

import mongoose from 'mongoose';

const DiscussionReplySchema = new mongoose.Schema(
  {
    // 讨论ID
    discussionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      required: true,
      index: true,
    },

    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 回复内容（支持Markdown）
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    // 父回复ID（用于嵌套回复）
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionReply',
      default: null,
      index: true,
    },

    // 点赞数
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 点赞用户 ID 列表（去重）
    likedBy: {
      type: [String],
      default: [],
    },

    // 是否是最佳答案（用于题目讨论）
    isBestAnswer: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
DiscussionReplySchema.index({ discussionId: 1, createdAt: 1 });
DiscussionReplySchema.index({ userId: 1 });
DiscussionReplySchema.index({ parentReplyId: 1 });

const DiscussionReply = mongoose.model('DiscussionReply', DiscussionReplySchema);

export default DiscussionReply;

