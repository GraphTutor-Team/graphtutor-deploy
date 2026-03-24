/**
 * GraphTutor V3.0 - 学习动态评论数据模型
 * 
 * 功能：存储学习动态的评论
 */

import mongoose from 'mongoose';

const learningPostCommentSchema = new mongoose.Schema(
  {
    // 所属动态
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPost',
      required: true,
      index: true,
    },
    // 评论者
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 父评论ID（用于回复）
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPostComment',
      default: null,
    },
    // 评论内容
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
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
    // 点赞数
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 回复数
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
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
learningPostCommentSchema.index({ postId: 1, createdAt: 1 });
learningPostCommentSchema.index({ authorId: 1, createdAt: -1 });
learningPostCommentSchema.index({ parentId: 1, createdAt: 1 });

// 实例方法：点赞评论
learningPostCommentSchema.methods.like = async function (userId) {
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

const LearningPostComment = mongoose.model('LearningPostComment', learningPostCommentSchema);

export default LearningPostComment;

