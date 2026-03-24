/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/routes/graph.js
 * 模块功能：知识图谱 / 知识点相关路由，提供节点增删改查、导入导出及顺序调整等接口。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

import express from 'express';
import KnowledgeNode from '../models/KnowledgeNode.js';
import { sanitizeString } from '../middleware/validation.js';

const router = express.Router();

// 节点列表单次返回上限，避免节点过多时接口与前端卡顿
const NODES_PAGE_LIMIT = 2000;

router.get('/nodes', async (req, res) => {
  try {
    const limit = Math.min(
      NODES_PAGE_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || NODES_PAGE_LIMIT)
    );
    const items = await KnowledgeNode.find()
      .sort({ order: 1, key: 1 })
      .limit(limit)
      .lean();
    res.json(items);
  } catch (err) {
    console.error('GET /api/graph/nodes error:', err);
    res.status(500).json({ error: '获取节点列表失败' });
  }
});

router.post('/nodes', async (req, res) => {
  try {
    const { key: rawKey, name: rawName = '' } = req.body || {};
    
    // 验证并清理输入
    const key = sanitizeString(rawKey, { maxLength: 100, allowEmpty: false });
    if (!key) {
      return res.status(400).json({ error: 'key 不能为空' });
    }
    
    const name = sanitizeString(rawName, { maxLength: 200, allowEmpty: true }) || '';
    
    const max = await KnowledgeNode.findOne().sort({ order: -1 }).lean();
    const order = (max?.order ?? 0) + 1;
    
    const doc = await KnowledgeNode.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, name, order }, $set: { name } },
      { upsert: true, new: true }
    );
    
    res.json(doc);
  } catch (err) {
    console.error('POST /api/graph/nodes error:', err);
    res.status(500).json({ error: '创建节点失败' });
  }
});

router.delete('/nodes/:key', async (req, res) => {
  try {
    const key = sanitizeString(req.params.key, { maxLength: 100, allowEmpty: false });
    if (!key) {
      return res.status(400).json({ error: '无效的 key' });
    }
    
    const r = await KnowledgeNode.deleteOne({ key });
    res.json({ ok: true, deleted: r.deletedCount });
  } catch (err) {
    console.error('DELETE /api/graph/nodes/:key error:', err);
    res.status(500).json({ error: '删除节点失败' });
  }
});

router.post('/nodes/reorder', async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : [];
    if (!arr.length) {
      return res.json({ ok: true, updated: 0 });
    }
    
    // 验证并清理输入
    const ops = arr
      .slice(0, 1000) // 限制最大数量
      .map(x => {
        const key = sanitizeString(x.key, { maxLength: 100, allowEmpty: false });
        if (!key) return null;
        
        const order = typeof x.order === 'number' && Number.isFinite(x.order)
          ? Math.max(0, Math.min(10000, x.order))
          : 0;
        
        return {
          updateOne: {
            filter: { key },
            update: { $set: { order } }
          }
        };
      })
      .filter(Boolean);
    
    if (!ops.length) {
      return res.status(400).json({ error: '没有有效的重排序数据' });
    }
    
    const r = await KnowledgeNode.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, modified: r.modifiedCount || 0 });
  } catch (err) {
    console.error('POST /api/graph/nodes/reorder error:', err);
    res.status(500).json({ error: '重排序失败' });
  }
});

router.get('/export', async (req, res) => {
  const nodes = await KnowledgeNode.find().sort({ order:1 }).lean();
  res.setHeader('content-type', 'application/json;charset=utf-8');
  res.send(JSON.stringify({ nodes }, null, 2));
});

router.post('/import', async (req, res) => {
  try {
    const body = req.body || {};
    const nodes = Array.isArray(body.nodes) ? body.nodes : (Array.isArray(body) ? body : []);
    
    if (!nodes.length) {
      return res.status(400).json({ error: 'nodes array required' });
    }
    
    // 验证并清理输入
    const ops = nodes
      .slice(0, 1000) // 限制最大数量
      .map((n, i) => {
        const key = sanitizeString(n.key, { maxLength: 100, allowEmpty: false });
        if (!key) return null;
        
        const name = sanitizeString(n.name, { maxLength: 200, allowEmpty: true }) || '';
        const order = typeof n.order === 'number' && Number.isFinite(n.order)
          ? Math.max(0, Math.min(10000, n.order))
          : i;
        
        return {
          updateOne: {
            filter: { key },
            update: { $set: { name, order } },
            upsert: true
          }
        };
      })
      .filter(Boolean);
    
    if (!ops.length) {
      return res.status(400).json({ error: '没有有效的节点数据' });
    }
    
    await KnowledgeNode.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, upserted: ops.length });
  } catch (err) {
    console.error('POST /api/graph/import error:', err);
    res.status(500).json({ error: '导入失败' });
  }
});

export default router;
