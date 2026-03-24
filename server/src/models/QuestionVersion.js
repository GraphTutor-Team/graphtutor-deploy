/**
 * GraphTutor V3.0 - 题目版本历史模型
 * 
 * 功能：记录题目的修改历史，支持版本回滚
 */

import mongoose from 'mongoose';

const QuestionVersionSchema = new mongoose.Schema(
  {
    // 关联的题目ID
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },

    // 版本号（递增）
    version: {
      type: Number,
      required: true,
    },

    // 题目内容快照（完整题目数据）
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // 修改人ID
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 修改原因
    changeReason: {
      type: String,
      default: '',
      trim: true,
    },

    // 是否为当前版本
    isCurrent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
QuestionVersionSchema.index({ questionId: 1, version: -1 }); // 按题目和版本查询
QuestionVersionSchema.index({ questionId: 1, isCurrent: 1 }); // 查询当前版本

// 复合唯一索引：同一题目的同一版本只能有一条记录
QuestionVersionSchema.index({ questionId: 1, version: 1 }, { unique: true });

const QuestionVersion = mongoose.model('QuestionVersion', QuestionVersionSchema);

export default QuestionVersion;

