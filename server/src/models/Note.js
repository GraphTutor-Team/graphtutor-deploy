/**
 * GraphTutor V3.0 - 笔记模型
 * 
 * 功能：存储用户的学习笔记
 */

import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 笔记类型：question（题目笔记）、knowledge（知识点笔记）、general（通用个人笔记）
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
      sparse: true, // 允许为空
    },

    // 关联的知识点ID（type为knowledge时）
    knowledgeNodeId: {
      type: String,
      index: true,
      sparse: true, // 允许为空
    },

    // 笔记标题
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },

    // 笔记内容（支持Markdown）
    content: {
      type: String,
      required: true,
      maxlength: 50000, // 50KB
    },

    // AI 生成摘要（列表/首页展示，Phase 1.4）
    summary: {
      type: String,
      maxlength: 500,
      default: '',
    },

    // 图片URLs（数组）
    images: {
      type: [String],
      default: [],
    },

    // 附件（数组，包含文件名、URL、大小等信息）
    attachments: {
      type: [{
        filename: String,
        originalName: String,
        url: String,
        size: Number,
        mimetype: String,
      }],
      default: [],
    },

    // 使用的模板ID（可选）
    templateId: {
      type: String,
      default: null,
    },

    // 标签
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // 是否公开（其他用户可见）
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 分享链接（唯一标识）
    shareToken: {
      type: String,
      // unique: true, // 通过下面的索引定义实现唯一性
      sparse: true,
    },

    // 分享过期时间
    shareExpiresAt: {
      type: Date,
    },

    // 浏览次数（公开笔记）
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 点赞数（公开笔记）
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 收藏数（公开笔记）
    favoriteCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 最后编辑时间
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
NoteSchema.index({ userId: 1, type: 1 });
NoteSchema.index({ userId: 1, questionId: 1 });
NoteSchema.index({ userId: 1, knowledgeNodeId: 1 });
NoteSchema.index({ userId: 1, tags: 1 });
NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ isPublic: 1, createdAt: -1 });
NoteSchema.index({ shareToken: 1 });

// 文本搜索索引（用于全文搜索）
NoteSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text',
});

// 实例方法：生成分享链接
NoteSchema.methods.generateShareToken = function () {
  const crypto = require('crypto');
  this.shareToken = crypto.randomBytes(16).toString('hex');
  // 默认30天过期
  this.shareExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return this.shareToken;
};

// 实例方法：检查分享链接是否有效
NoteSchema.methods.isShareValid = function () {
  if (!this.shareToken || !this.shareExpiresAt) {
    return false;
  }
  return new Date() < this.shareExpiresAt;
};

// 静态方法：搜索笔记
NoteSchema.statics.searchNotes = async function (userId, query, options = {}) {
  const {
    type,
    questionId,
    knowledgeNodeId,
    tags,
    isPublic,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const searchQuery = { userId };

  if (type) {
    searchQuery.type = type;
  }
  if (questionId) {
    searchQuery.questionId = questionId;
  }
  if (knowledgeNodeId) {
    searchQuery.knowledgeNodeId = knowledgeNodeId;
  }
  if (tags && tags.length > 0) {
    searchQuery.tags = { $in: tags };
  }
  if (isPublic !== undefined) {
    searchQuery.isPublic = isPublic;
  }

  // 文本搜索
  if (query && query.trim()) {
    searchQuery.$text = { $search: query.trim() };
  }

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // 如果有文本搜索，使用文本搜索排序
  if (query && query.trim()) {
    sort.score = { $meta: 'textScore' };
  }

  const [notes, total] = await Promise.all([
    this.find(searchQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(searchQuery),
  ]);

  return {
    items: notes,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// 静态方法：获取公开笔记
NoteSchema.statics.getPublicNotes = async function (options = {}) {
  const {
    searchKeyword,
    tags,
    type,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const query = { isPublic: true };

  if (type) {
    query.type = type;
  }
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }
  if (searchKeyword && searchKeyword.trim()) {
    query.$text = { $search: searchKeyword.trim() };
  }

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  if (searchKeyword && searchKeyword.trim()) {
    sort.score = { $meta: 'textScore' };
  }

  const [notes, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    items: notes,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const Note = mongoose.model('Note', NoteSchema);

export default Note;

