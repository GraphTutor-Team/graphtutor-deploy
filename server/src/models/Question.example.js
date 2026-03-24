/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/models/Question.example.js
 * 模块功能：试题模型，定义题干、选项、正确答案、所属知识点、难度等字段。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/models/Question.js（示例版；如你已有同名文件，请手动合并字段/索引）
import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  knowledgeNodeId: { type: String, index: true },
  difficulty: { type: Number, index: true },  // 1~5
  content: String,
  options: [String],
  answerIndex: Number,
  tags: [String],
  source: { type: String, default: 'bank' },  // bank | template | ai
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

QuestionSchema.index({ knowledgeNodeId: 1, difficulty: 1 });

export default mongoose.model('Question', QuestionSchema);
