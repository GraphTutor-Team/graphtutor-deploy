/**
 * GraphTutor V3.0 - AI运行日志模型
 * 
 * 功能：记录AI功能的使用情况，用于统计和审计
 */

import mongoose from 'mongoose';

const AIRunLogSchema = new mongoose.Schema(
  {
    // 用户ID（调用AI功能的用户）
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // AI功能类型
    type: {
      type: String,
      required: true,
      enum: ['generate', 'analyze', 'classify', 'optimize'],
      index: true,
    },

    // 输入参数
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // 输出结果
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // API调用成本（美元）
    cost: {
      type: Number,
      default: 0,
    },

    // 耗时（毫秒）
    duration: {
      type: Number,
      default: 0,
    },

    // 状态
    status: {
      type: String,
      enum: ['success', 'error', 'timeout'],
      default: 'success',
      index: true,
    },

    // 错误信息（如果失败）
    error: {
      type: String,
      default: '',
    },

    // 关联的题目ID（如果是题目相关操作）
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      sparse: true,
      index: true,
    },

    // 关联的题库ID（如果是题库相关操作）
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank',
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
AIRunLogSchema.index({ userId: 1, createdAt: -1 }); // 按用户和时间查询
AIRunLogSchema.index({ type: 1, status: 1, createdAt: -1 }); // 按类型和状态查询
AIRunLogSchema.index({ createdAt: -1 }); // 按时间查询（用于统计）

const AIRunLog = mongoose.model('AIRunLog', AIRunLogSchema);

export default AIRunLog;

