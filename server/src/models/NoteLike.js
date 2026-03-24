/**
 * GraphTutor V3.0 - 笔记点赞模型
 * 
 * 功能：记录用户对公开笔记的点赞
 */

import mongoose from 'mongoose';

const NoteLikeSchema = new mongoose.Schema(
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

// 复合索引，确保每个用户对每个笔记只能点赞一次
NoteLikeSchema.index({ userId: 1, noteId: 1 }, { unique: true });

const NoteLike = mongoose.model('NoteLike', NoteLikeSchema);

export default NoteLike;

