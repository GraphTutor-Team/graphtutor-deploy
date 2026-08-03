/**
 * GraphTutor V3.0 - 讨论区模型
 * 
 * 功能：存储讨论帖子
 */

import mongoose from 'mongoose';

const DiscussionSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 讨论类型：question（题目讨论）、knowledge（知识点讨论）、general（一般讨论）
    type: {
      type: String,
      enum: ['question', 'knowledge', 'general'],
      required: true,
      index: true,
    },

    // 关联的题目ID（type为question时）
    questionId: {
      type: String,
      index: true,
      sparse: true,
    },

    // 关联的知识点ID（type为knowledge时）
    knowledgeNodeId: {
      type: String,
      index: true,
      sparse: true,
    },

    // 标题
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },

    // 内容（支持Markdown）
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },

    // 标签
    tags: {
      type: [String],
      default: [],
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

    // 回复数
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 浏览次数
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 是否置顶
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 是否已解决（用于题目讨论）
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 悬赏积分（仅提问时可设置，采纳答案后转给回答者）
    bountyPoints: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    // 最后回复时间
    lastReplyAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
DiscussionSchema.index({ userId: 1, type: 1 });
DiscussionSchema.index({ type: 1, createdAt: -1 });
DiscussionSchema.index({ type: 1, isPinned: -1, createdAt: -1 });
DiscussionSchema.index({ questionId: 1 });
DiscussionSchema.index({ knowledgeNodeId: 1 });
DiscussionSchema.index({ tags: 1 });

// 文本搜索索引
DiscussionSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text',
});

const Discussion = mongoose.model('Discussion', DiscussionSchema);

export default Discussion;

