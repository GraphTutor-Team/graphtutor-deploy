/**
 * GraphTutor V3.0 - 收藏模型
 * 
 * 功能：存储用户收藏的题目
 */

import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 题目ID
    questionId: {
      type: String,
      required: true,
      index: true,
    },

    // 收藏夹ID
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FavoriteFolder',
      required: true,
      index: true,
    },

    // 备注
    notes: {
      type: String,
      maxlength: 1000,
      default: '',
    },

    // 标签（用户自定义）
    tags: {
      type: [String],
      default: [],
    },

    // 收藏时间
    favoritedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
FavoriteSchema.index({ userId: 1, questionId: 1, folderId: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1, folderId: 1 });
FavoriteSchema.index({ userId: 1, favoritedAt: -1 });

// 静态方法：获取用户的收藏统计
FavoriteSchema.statics.getUserStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byFolder: {
          $push: {
            folderId: '$folderId',
          },
        },
      },
    },
  ]);

  const total = stats[0]?.total || 0;

  // 按收藏夹统计
  const byFolder = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$folderId',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    total,
    byFolder: byFolder.map(item => ({
      folderId: item._id,
      count: item.count,
    })),
  };
};

const Favorite = mongoose.model('Favorite', FavoriteSchema);

export default Favorite;

