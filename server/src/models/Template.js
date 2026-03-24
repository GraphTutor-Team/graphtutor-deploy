/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/models/Template.js
 * 模块功能：模板模型，用于存储题目模板或生成规则等可复用结构。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/models/Template.js
import mongoose from 'mongoose';

const TemplateSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },      // 模板业务ID
  knowledgeNodeId: { type: String, index: true },
  difficulty: { type: Number, index: true },            // 1~5
  pattern: { type: String, required: true },            // 题干模板：如 "JS 中{kw}声明常量的关键字是？"
  optionsTpl: { type: [String], required: true },       // ["let","const","var","static"]
  answerIndex: { type: Number, required: true },
  paramsPool: { type: Object, default: {} }             // 如 { "kw": ["以下","下列","通常的"] }
}, { timestamps: true });

TemplateSchema.index({ knowledgeNodeId: 1, difficulty: 1 });

export default mongoose.model('Template', TemplateSchema);
