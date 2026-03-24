/**
 * GraphTutor V3.0 - 笔记收藏模型
 * 
 * 功能：记录用户对公开笔记的收藏
 */

import mongoose from 'mongoose';

const NoteFavoriteSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 笔记ID
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引，确保每个用户对每个笔记只能收藏一次
NoteFavoriteSchema.index({ userId: 1, noteId: 1 }, { unique: true });

const NoteFavorite = mongoose.model('NoteFavorite', NoteFavoriteSchema);

export default NoteFavorite;

