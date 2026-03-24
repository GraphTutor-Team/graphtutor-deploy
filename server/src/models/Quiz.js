/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/models/Quiz.js
 * 模块功能：测验配置模型，用于定义一个测验包含哪些题目、知识点和规则。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

import mongoose from 'mongoose';

const QuizSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  status: { type: String, default: 'ongoing', index: true }, // ongoing | finished
  items: { type: Array, default: [] }, // [{questionId, chosenIndex, correctIndex, isCorrect}]
  meta: { type: Object, default: {} },
}, { timestamps: true });

QuizSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
