/**
 * GraphTutor V3.0 - 学习动态数据模型
 * 
 * 功能：存储用户发布的学习动态
 */

import mongoose from 'mongoose';

const learningPostSchema = new mongoose.Schema(
  {
    // 发布者
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 动态类型
    type: {
      type: String,
      enum: ['text', 'achievement', 'checkin', 'challenge', 'report', 'milestone'],
      default: 'text',
    },
    // 动态标题
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    // 动态内容
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    // 图片列表
    images: [
      {
        url: String,
        thumbnail: String,
        alt: String,
      },
    ],
    // 关联的学习数据（如成就ID、挑战ID等）
    relatedData: {
      achievementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement',
      },
      challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FriendChallenge',
      },
      checkInId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyCheckIn',
      },
      reportId: String, // 学习报告ID
      milestone: String, // 里程碑描述
    },
    // 点赞用户列表
    likes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // 点赞数（冗余字段，用于快速查询）
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 评论数（冗余字段）
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 分享数
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 可见性设置
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    // 标签列表
    tags: [String],
    // 是否置顶
    pinned: {
      type: Boolean,
      default: false,
    },
    // 是否删除
    deleted: {
      type: Boolean,
      default: false,
    },
    // 删除时间
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
learningPostSchema.index({ authorId: 1, createdAt: -1 });
learningPostSchema.index({ type: 1, createdAt: -1 });
learningPostSchema.index({ visibility: 1, createdAt: -1 });
learningPostSchema.index({ deleted: 1, createdAt: -1 });
learningPostSchema.index({ tags: 1 });
learningPostSchema.index({ likeCount: -1, createdAt: -1 }); // 热门动态

// 静态方法：获取用户动态列表
learningPostSchema.statics.getUserPosts = function (userId, options = {}) {
  const { page = 1, limit = 20, type, visibility } = options;
  const skip = (page - 1) * limit;

  const query = {
    authorId: userId,
    deleted: false,
  };

  if (type) query.type = type;
  if (visibility) query.visibility = visibility;

  return this.find(query)
    .populate('authorId', 'name email avatar')
    .populate('relatedData.achievementId', 'name icon description')
    .populate('relatedData.challengeId', 'title target status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 静态方法：获取好友动态列表
learningPostSchema.statics.getFriendsPosts = function (userId, options = {}) {
  const { page = 1, limit = 20, type } = options;
  const skip = (page - 1) * limit;

  // 这里需要从Friendship模型中获取好友列表
  // 暂时返回公开动态
  const query = {
    visibility: { $in: ['public', 'friends'] },
    deleted: false,
  };

  if (type) query.type = type;

  return this.find(query)
    .populate('authorId', 'name email avatar')
    .populate('relatedData.achievementId', 'name icon description')
    .populate('relatedData.challengeId', 'title target status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 实例方法：点赞动态
learningPostSchema.methods.like = async function (userId) {
  const existingLike = this.likes.find(
    (like) => like.userId.toString() === userId.toString()
  );

  if (existingLike) {
    // 取消点赞
    this.likes = this.likes.filter(
      (like) => like.userId.toString() !== userId.toString()
    );
    this.likeCount = Math.max(0, this.likeCount - 1);
  } else {
    // 添加点赞
    this.likes.push({ userId });
    this.likeCount += 1;
  }

  await this.save();
  return this;
};

// 实例方法：增加分享数
learningPostSchema.methods.incrementShare = async function () {
  this.shareCount += 1;
  await this.save();
  return this;
};

const LearningPost = mongoose.model('LearningPost', learningPostSchema);

export default LearningPost;

