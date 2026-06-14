/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/routes/questions.js
 * 模块功能：题库路由模块，提供试题的增删改查、按条件查询和批量导入导出等接口。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/routes/questions.js
// 题库 + 出题 + 导入 JSON 题库

import express from 'express';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import { sanitizeSearchQuery, validatePagination, sanitizeString, validateInt } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function toInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

/**
 * GET /api/questions
 * 题目列表 + 分页 + 搜索
 */
router.get('/', sanitizeSearchQuery('q'), validatePagination(), async (req, res) => {
  try {
    const {
      q = '',
      node = '',
      difficulty = '',
      skip = '0',
      limit = '20',
      random = 'false', // 新增：是否随机抽取
      subjectCode = '', // 新增：学科代码
      bankId = '', // 新增：题库ID
      ids: idsParam = '', // 新增：按 id 列表获取（如群组共同练习）
    } = req.query;

    const cond = {};

    // 按 id 列表获取（用于群组共同练习等）
    if (idsParam && typeof idsParam === 'string') {
      const idList = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (idList.length > 0) {
        const limitIds = idList.slice(0, 200);
        const rawItems = await Question.find({ _id: { $in: limitIds } }).lean();
        const idOrder = new Map(limitIds.map((id, i) => [String(id), i]));
        const sorted = rawItems
          .slice()
          .sort((a, b) => (idOrder.get(String(a._id)) ?? 999) - (idOrder.get(String(b._id)) ?? 999));
        return res.json({ items: sorted, total: sorted.length, skip: 0, limit: sorted.length });
      }
    }
    
    // 清理并验证 node
    if (node) {
      const cleanedNode = sanitizeString(node, { maxLength: 100 });
      if (cleanedNode) {
        cond.knowledgeNodeId = cleanedNode;
      }
    }
    
    // 验证难度范围
    if (difficulty) {
      const diffNum = validateInt(difficulty, { min: 1, max: 5, defaultValue: null });
      if (diffNum !== null) {
        cond.difficulty = diffNum;
      }
    }
    
    // 学科筛选
    if (subjectCode) {
      cond.subjectCode = sanitizeString(subjectCode, { maxLength: 50 });
    }
    
    // 题库筛选
    if (bankId) {
      try {
        cond.bankId = new mongoose.Types.ObjectId(bankId);
      } catch {
        return res.status(400).json({ error: '无效的 bankId' });
      }
    }
    
    // 安全的正则查询（已通过中间件清理）
    if (q) {
      cond.content = { $regex: q, $options: 'i' };
    }

    const skipNum = toInt(skip, 0);
    // 限制最大200道题，默认50道
    const limitNum = Math.min(200, toInt(limit, 50));
    const isRandom = random === 'true' || random === '1';

    // 如果启用随机抽取，使用 $sample 聚合操作
    if (isRandom) {
      const pipeline = [
        { $match: cond },
        { $sample: { size: limitNum } }
      ];
      const items = await Question.aggregate(pipeline);
      const total = await Question.countDocuments(cond);
      return res.json({ items, total, skip: 0, limit: limitNum });
    }

    // 否则使用常规查询（按创建时间倒序）
    const [items, total] = await Promise.all([
      Question.find(cond)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum)
        .lean(),
      Question.countDocuments(cond),
    ]);

    res.json({ items, total, skip: skipNum, limit: limitNum });
  } catch (e) {
    console.error('GET /questions error:', e);
    res.status(500).json({ error: '获取题目列表失败' });
  }
});

/**
 * GET /api/questions/next
 * 即时练习“下一题”（给 /quiz 用）
 */
router.get('/next', async (req, res) => {
  try {
    const { node = '', difficulty = '' } = req.query;
    const cond = {};
    if (node) cond.knowledgeNodeId = node;
    if (difficulty) cond.difficulty = toInt(difficulty, 1);

    const total = await Question.countDocuments(cond);
    if (!total) {
      return res.status(404).json({ error: '没有符合条件的题目' });
    }

    const rand = Math.floor(Math.random() * total);
    const list = await Question.find(cond).skip(rand).limit(1).lean();
    const q = list[0];

    res.json(q);
  } catch (e) {
    console.error('GET /questions/next error:', e);
    res.status(500).json({ error: '获取下一题失败' });
  }
});

/**
 * GET /api/questions/:id
 * 支持用 _id 或业务 id 查询
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;

    try {
      doc = await Question.findById(id).lean();
    } catch {
      doc = null;
    }
    if (!doc) {
      doc = await Question.findOne({ id }).lean();
    }
    if (!doc) {
      return res.status(404).json({ error: '题目不存在' });
    }

    res.json(doc);
  } catch (e) {
    console.error('GET /questions/:id error:', e);
    res.status(500).json({ error: '获取题目失败' });
  }
});

/**
 * POST /api/questions
 * 新增题目
 */
router.post('/', async (req, res) => {
  try {
    const {
      id: rawId,
      content: rawContent,
      options: rawOptions,
      correctIndex: rawCorrectIndex,
      knowledgeNodeId: rawKnowledgeNodeId,
      difficulty: rawDifficulty,
      explain: rawExplain,
    } = req.body || {};

    // 验证并清理题干
    const content = sanitizeString(rawContent, { maxLength: 2000, allowEmpty: false });
    if (!content) {
      return res.status(400).json({ error: '题干不能为空' });
    }

    // 验证选项
    if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
      return res.status(400).json({ error: '至少需要 2 个选项' });
    }

    const options = rawOptions
      .slice(0, 10) // 最多 10 个选项
      .map(opt => sanitizeString(opt, { maxLength: 500, allowEmpty: false }))
      .filter(Boolean);

    if (options.length < 2) {
      return res.status(400).json({ error: '至少需要 2 个有效选项' });
    }

    // 验证正确答案索引
    const correctIndex = validateInt(rawCorrectIndex, {
      min: 0,
      max: options.length - 1,
      defaultValue: 0,
    });

    // 清理其他字段
    const id = rawId ? sanitizeString(rawId, { maxLength: 100 }) : null;
    const knowledgeNodeId = rawKnowledgeNodeId
      ? sanitizeString(rawKnowledgeNodeId, { maxLength: 100, allowEmpty: true })
      : '';
    const difficulty = validateInt(rawDifficulty, { min: 1, max: 5, defaultValue: 1 });
    const explain = rawExplain
      ? sanitizeString(rawExplain, { maxLength: 2000, allowEmpty: true })
      : '';

    const bizId =
      id || 'Q' + Date.now() + Math.random().toString(16).slice(2, 8);

    const doc = await Question.create({
      id: bizId,
      content,
      options,
      correctIndex,
      knowledgeNodeId,
      difficulty,
      explain,
    });

    res.json(doc.toObject());
  } catch (e) {
    console.error('POST /questions error:', e);
    res.status(500).json({ error: '新增题目失败' });
  }
});

/**
 * PUT /api/questions/:id
 * 更新题目（支持 _id 或业务 id）
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    let doc = await Question.findById(id);
    if (!doc) {
      doc = await Question.findOne({ id });
    }
    if (!doc) {
      return res.status(404).json({ error: '题目不存在' });
    }

    const fields = [
      'content',
      'options',
      'correctIndex',
      'knowledgeNodeId',
      'difficulty',
      'explain',
    ];
    fields.forEach((k) => {
      if (body[k] !== undefined) {
        doc[k] = body[k];
      }
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (e) {
    console.error('PUT /questions/:id error:', e);
    res.status(500).json({ error: '更新题目失败' });
  }
});

/**
 * DELETE /api/questions/:id
 * 删除题目
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let doc = await Question.findById(id);
    if (!doc) {
      doc = await Question.findOne({ id });
    }
    if (!doc) {
      return res.status(404).json({ error: '题目不存在' });
    }

    await Question.deleteOne({ _id: doc._id });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /questions/:id error:', e);
    res.status(500).json({ error: '删除题目失败' });
  }
});

/**
 * POST /api/questions/bulk-upsert
 * 批量导入/更新题目（题库导入 / AI 出题）
 */
router.post('/bulk-upsert', requireAuth, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) {
      return res.status(400).json({ error: '请求体必须是题目数组' });
    }

    const ops = items
      .map((raw, idx) => {
        const {
          id,
          content,
          options = [],
          correctIndex = 0,
          knowledgeNodeId = '',
          difficulty = 1,
          explain = '',
          bankId = null,
          source = 'bank',
        } = raw || {};

        // 基本校验：题干和选项
        if (!content || !Array.isArray(options) || options.length < 2) {
          return null;
        }

        const bizId = id || 'Q' + Date.now() + '-' + idx;

        // 规范化字段
        const safeDifficulty = (() => {
          const d = Number(difficulty);
          if (!Number.isFinite(d)) return 1;
          return Math.min(5, Math.max(1, d));
        })();

        const safeSource = (() => {
          if (typeof source !== 'string') return 'bank';
          const s = source.trim();
          const allow = ['bank', 'template', 'ai', 'qg'];
          return allow.includes(s) ? s : 'bank';
        })();

        const doc = {
          id: bizId,
          content,
          options,
          correctIndex:
            typeof correctIndex === 'number' ? correctIndex : 0,
          knowledgeNodeId: knowledgeNodeId || '',
          difficulty: safeDifficulty,
          explain: explain || '',
          // bankId 允许为 null
          bankId: bankId || null,
          source: safeSource,
        };

        return {
          updateOne: {
            filter: { id: bizId },
            update: { $set: doc },
            upsert: true,
          },
        };
      })
      .filter(Boolean);

    if (!ops.length) {
      return res.status(400).json({ error: '题目数据格式不正确' });
    }

    const r = await Question.bulkWrite(ops, { ordered: false });

    res.json({
      ok: true,
      matched: r.matchedCount || 0,
      modified: r.modifiedCount || 0,
      upserted: r.upsertedCount || 0,
    });
  } catch (e) {
    console.error('POST /questions/bulk-upsert error:', e);
    res
      .status(500)
      .json({ error: '批量导入/更新题目失败' });
  }
});


/**
 * POST /api/questions/import/json
 * 从原始 JSON 文本导入题库（给前端 importQuestionsJSON 用）
 */
router.post(
  '/import/json',
  requireAuth,
  express.text({ type: '*/*' }),
  async (req, res) => {
    try {
      const rawText = req.body || '';
      let items;
      try {
        items = JSON.parse(rawText);
      } catch {
        return res
          .status(400)
          .json({ error: '无法解析题库 JSON 文本' });
      }

      if (!Array.isArray(items) || !items.length) {
        return res
          .status(400)
          .json({ error: 'JSON 必须是非空数组' });
      }

      // 复用 bulk-upsert 的逻辑
      req.body = items;
      // 直接调用上面的处理函数
      const fakeReq = req;
      const fakeRes = res;
      // 手动调用 handler
      return router.handle(
        { ...fakeReq, url: '/bulk-upsert', method: 'POST' },
        fakeRes,
        () => {}
      );
    } catch (e) {
      console.error('POST /questions/import/json error:', e);
      res.status(500).json({ error: '导入题库失败' });
    }
  }
);

export default router;
