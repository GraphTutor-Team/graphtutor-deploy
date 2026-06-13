/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/models/QuizSession.js
 * 模块功能：测验会话模型，记录一次测验的起止时间、题目列表、当前进度等信息。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/models/QuizSession.js
// 会话测验模型：一次测验的题目快照 + 答题记录

import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Question',
    },
    // 用户选择的选项下标（选择题）
    answerIndex: {
      type: Number,
    },
    // 用户答案（编程题/简答题/填空题等）
    userAnswer: {
      type: mongoose.Schema.Types.Mixed,
    },
    // 是否正确（冗余，方便统计）
    isCorrect: {
      type: Boolean,
      required: true,
    },
    // 花费时间（毫秒，可选）
    timeSpentMs: {
      type: Number,
    },
  },
  { _id: false, timestamps: true }
);

const QuizSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 题目快照：保存会话创建时的题目内容
    questions: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        content: String,
        options: [String],
        correctIndex: Number,
        type: { type: String, default: 'single' },
        answer: mongoose.Schema.Types.Mixed,
        codingMeta: {
          language: String,
          referenceCode: String,
          starterCode: String,
          slug: String,
          externalSource: String,
          hint: String,
        },
        difficulty: Number,
        knowledgeNodeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'KnowledgeNode',
        },
      },
    ],

    // 回答记录（同一题可能多次作答，我们取最后一次）
    answers: [AnswerSchema],

    // 会话状态
    status: {
      type: String,
      enum: ['ongoing', 'finished', 'cancelled'],
      default: 'ongoing',
      index: true,
    },

    // 创建时的目标题量
    targetSize: {
      type: Number,
      default: 10,
    },

    // 统计字段（finish 时写入）
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },

    // 结束时间
    finishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// 索引：按用户 + 创建时间倒序
QuizSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('QuizSession', QuizSessionSchema);
