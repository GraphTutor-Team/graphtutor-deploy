/**
 * GraphTutor V3.0 - 收藏夹模型
 * 
 * 功能：管理用户的题目收藏夹
 */

import mongoose from 'mongoose';

const FavoriteFolderSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 收藏夹名称
    name: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },

    // 收藏夹描述
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },

    // 收藏夹颜色（用于UI显示）
    color: {
      type: String,
      default: '#3B82F6',
      validate: {
        validator: (v) => /^#[0-9A-Fa-f]{6}$/.test(v),
        message: '颜色必须是十六进制格式',
      },
    },

    // 图标（emoji）
    icon: {
      type: String,
      default: '⭐',
    },

    // 排序顺序
    order: {
      type: Number,
      default: 0,
    },

    // 是否默认收藏夹
    isDefault: {
      type: Boolean,
      default: false,
    },

    // 题目数量（缓存）
    questionCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 是否公开（其他用户可见）
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
FavoriteFolderSchema.index({ userId: 1, name: 1 }, { unique: true });
FavoriteFolderSchema.index({ userId: 1, order: 1 });

// 静态方法：获取或创建默认收藏夹
FavoriteFolderSchema.statics.getOrCreateDefault = async function (userId) {
  let defaultFolder = await this.findOne({ userId, isDefault: true });
  
  if (!defaultFolder) {
    defaultFolder = await this.create({
      userId,
      name: '默认收藏夹',
      description: '系统默认收藏夹',
      isDefault: true,
      order: 0,
    });
  }
  
  return defaultFolder;
};

const FavoriteFolder = mongoose.model('FavoriteFolder', FavoriteFolderSchema);

export default FavoriteFolder;

