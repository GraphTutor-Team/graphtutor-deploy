/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/routes/analytics.js
 * 模块功能：数据分析路由模块，提供按知识点正确率、7 日进度等统计接口。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

import express from 'express';
import Record from '../models/Record.js';
import { getKnowledgeMastery, getLearningTrend } from '../services/learningAnalytics.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * 工具：根据请求中的 userId 构造匹配条件
 */
const userMatch = (req) => {
  const userId = req.query.userId;
  return userId ? { userId } : {};
};

/**
 * GET /api/analytics/accuracy-by-node
 * 按知识点统计答题总数、正确数和正确率
 */
router.get('/accuracy-by-node', async (req, res, next) => {
  try {
    const match = userMatch(req);

    const pipeline = [
      Object.keys(match).length ? { $match: match } : null,
      {
        $group: {
          _id: '$knowledgeNodeId',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          node: '$_id',
          total: 1,
          correct: 1,
          acc: {
            // 百分比
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      // 正确率从低到高、总题数从多到少，方便找薄弱点
      { $sort: { acc: 1, total: -1 } },
      { $limit: 50 },
    ].filter(Boolean);

    const agg = await Record.aggregate(pipeline);
    res.json(agg);
  } catch (err) {
    console.error('GET /api/analytics/accuracy-by-node error:', err);
    next(err);
  }
});

/**
 * GET /api/analytics/progress-7d
 * 统计近 7 日每天的答题情况与正确率
 */
router.get('/progress-7d', async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 6 * 24 * 3600 * 1000);
    const match = userMatch(req);

    const agg = await Record.aggregate([
      {
        $match: {
          ...match,
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id',
          total: 1,
          correct: 1,
          acc: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { day: 1 } },
    ]);

    res.json(agg);
  } catch (err) {
    console.error('GET /api/analytics/progress-7d error:', err);
    next(err);
  }
});

/**
 * GET /api/analytics/last-errors
 * 查询最近做错的题目列表
 */
router.get('/last-errors', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const match = { isCorrect: false, ...(userMatch(req)) };

    const items = await Record.find(match)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json(items);
  } catch (err) {
    console.error('GET /api/analytics/last-errors error:', err);
    next(err);
  }
});

/**
 * GET /api/analytics/mastery
 * 获取知识点掌握度详细分析（V3.0增强）
 */
router.get('/mastery', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id || req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId 是必填项' });
    }

    const { days = 30, subjectCode, minQuestions = 3 } = req.query;
    
    const data = await getKnowledgeMastery(userId, {
      days: parseInt(days, 10),
      subjectCode,
      minQuestions: parseInt(minQuestions, 10),
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/analytics/mastery error:', err);
    next(err);
  }
});

/**
 * GET /api/analytics/trend
 * 获取学习趋势数据（V3.0增强）
 */
router.get('/trend', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id || req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId 是必填项' });
    }

    const { days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days, 10) || 30));
    const data = await getLearningTrend(userId, daysNum);

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/analytics/trend error:', err);
    next(err);
  }
});

export default router;
