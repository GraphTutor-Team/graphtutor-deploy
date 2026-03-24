/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/models/GraphNode.js
 * 模块功能：图节点模型，用于更底层的图结构存储（如可视化节点）。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

import mongoose from 'mongoose';

const GraphNodeSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    // unique: true, // 通过下面的索引定义实现唯一性
  },
  name: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GraphNode', default: null },
  order: { type: Number, default: 0 },
  meta: { type: Object, default: {} }
}, { timestamps: true });

GraphNodeSchema.index({ key: 1 }, { unique: true });
GraphNodeSchema.index({ parentId: 1, order: 1 });
GraphNodeSchema.index({ name: 'text' });

export default mongoose.model('GraphNode', GraphNodeSchema);
