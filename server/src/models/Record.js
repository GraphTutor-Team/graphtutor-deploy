/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/models/Record.js
 * 模块功能：作答记录模型，按用户 / 题目存储每次作答结果，用于统计分析。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/models/Record.js
// 练习记录模型：每次作答一条记录（会话 / 单题都可以）

import mongoose from 'mongoose';

const RecordSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    questionId: {
      type: String, // 改为 String，兼容业务ID和ObjectId字符串
      required: true,
      index: true,
    },
    knowledgeNodeId: {
      type: String, // 改为 String，兼容业务ID和ObjectId字符串
      ref: 'KnowledgeNode',
      index: true,
    },
    // 是否答对
    isCorrect: {
      type: Boolean,
      required: true,
      index: true,
    },
    // 用户选择的答案下标（null 表示未答题）
    answerIndex: {
      type: Number,
      required: false, // 允许未答题
      default: null,
    },
    // 正确答案（冗余）
    correctIndex: {
      type: Number,
      required: false, // 允许为空
      default: null,
    },
    // 所属会话（非会话模式可为空）
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizSession',
    },
    timeSpentMs: {
      type: Number,
    },
  },
  { timestamps: true }
);

RecordSchema.index({ userId: 1, createdAt: -1 });
RecordSchema.index({ userId: 1, knowledgeNodeId: 1 });

export default mongoose.model('Record', RecordSchema);
