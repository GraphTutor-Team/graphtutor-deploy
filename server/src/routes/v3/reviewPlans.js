/**
 * GraphTutor V3.0 - 复习计划API路由
 * 
 * 路径：/api/v3/review-plans
 * 功能：提供复习计划的CRUD操作
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import ReviewPlan from '../../models/ReviewPlan.js';
import { validateInt, sanitizeString } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/review-plans
 * 获取复习计划列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const plans = await ReviewPlan.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: plans,
    });
  } catch (err) {
    console.error('GET /api/v3/review-plans error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取复习计划失败',
    });
  }
});

/**
 * GET /api/v3/review-plans/:id
 * 获取复习计划详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await ReviewPlan.findOne({ _id: id, userId }).lean();

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '复习计划不存在',
      });
    }

    // 获取今日复习题目
    const planDoc = await ReviewPlan.findById(id);
    const todayQuestions = await planDoc.getTodayQuestions();

    res.json({
      success: true,
      data: {
        ...plan,
        todayQuestions,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/review-plans/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取复习计划失败',
    });
  }
});

/**
 * POST /api/v3/review-plans
 * 创建复习计划
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      type,
      strategy,
      dailyCount,
      reviewTime,
      reminder,
      filters,
      startDate,
      endDate,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '计划名称不能为空',
      });
    }

    const plan = await ReviewPlan.create({
      userId,
      name: sanitizeString(name, { maxLength: 100 }),
      description: sanitizeString(description || '', { maxLength: 500, allowEmpty: true }),
      type: type || 'daily',
      strategy: strategy || 'due',
      dailyCount: validateInt(dailyCount, { min: 1, max: 100, defaultValue: 10 }),
      reviewTime: reviewTime || '09:00',
      reminder: reminder || { enabled: true, time: '08:00', days: [1, 2, 3, 4, 5] },
      filters: filters || {},
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (err) {
    console.error('POST /api/v3/review-plans error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建复习计划失败',
    });
  }
});

/**
 * PUT /api/v3/review-plans/:id
 * 更新复习计划
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const plan = await ReviewPlan.findOne({ _id: id, userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '复习计划不存在',
      });
    }

    // 更新字段
    if (updateData.name !== undefined) {
      plan.name = sanitizeString(updateData.name, { maxLength: 100 });
    }
    if (updateData.description !== undefined) {
      plan.description = sanitizeString(updateData.description, { maxLength: 500, allowEmpty: true });
    }
    if (updateData.type !== undefined) {
      plan.type = updateData.type;
    }
    if (updateData.strategy !== undefined) {
      plan.strategy = updateData.strategy;
    }
    if (updateData.dailyCount !== undefined) {
      plan.dailyCount = validateInt(updateData.dailyCount, { min: 1, max: 100 });
    }
    if (updateData.reviewTime !== undefined) {
      plan.reviewTime = updateData.reviewTime;
    }
    if (updateData.reminder !== undefined) {
      plan.reminder = updateData.reminder;
    }
    if (updateData.filters !== undefined) {
      plan.filters = updateData.filters;
    }
    if (updateData.status !== undefined) {
      plan.status = updateData.status;
    }
    if (updateData.startDate !== undefined) {
      plan.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      plan.endDate = updateData.endDate ? new Date(updateData.endDate) : undefined;
    }

    await plan.save();

    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    console.error('PUT /api/v3/review-plans/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新复习计划失败',
    });
  }
});

/**
 * DELETE /api/v3/review-plans/:id
 * 删除复习计划
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await ReviewPlan.findOneAndDelete({ _id: id, userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '复习计划不存在',
      });
    }

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/review-plans/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除失败',
    });
  }
});

/**
 * POST /api/v3/review-plans/:id/execute
 * 执行复习计划（获取今日复习题目）
 */
router.post('/:id/execute', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await ReviewPlan.findOne({ _id: id, userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '复习计划不存在',
      });
    }

    if (plan.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: '复习计划未激活',
      });
    }

    const questions = await plan.getTodayQuestions();
    const questionIds = questions
      .map((item) => item.questionId)
      .filter(Boolean);

    plan.lastExecutedAt = new Date();
    if (!plan.stats) {
      plan.stats = { totalReviews: 0, completedReviews: 0, masteredCount: 0 };
    }
    plan.stats.totalReviews = (plan.stats.totalReviews || 0) + 1;
    await plan.save();

    res.json({
      success: true,
      data: {
        questions,
        questionIds,
        plan: plan.toObject(),
      },
    });
  } catch (err) {
    console.error('POST /api/v3/review-plans/:id/execute error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '执行复习计划失败',
    });
  }
});

/**
 * GET /api/v3/review-plans/:id/stats
 * 获取复习计划统计
 */
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await ReviewPlan.findOne({ _id: id, userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '复习计划不存在',
      });
    }

    await plan.updateStats();

    res.json({
      success: true,
      data: {
        plan: plan.toObject(),
        stats: plan.stats,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/review-plans/:id/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取统计失败',
    });
  }
});

export default router;

