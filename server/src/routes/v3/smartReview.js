/**
 * GraphTutor V3.0 - 智能复习API
 * 
 * 路径：/api/v3/smart-review
 * 功能：提供基于SuperMemo算法的智能复习功能
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  getTodayReviewQuestions,
  updateReviewPlan,
  generateReviewPlan,
  checkAndSendReviewReminders,
  initializeReviewPlans,
} from '../../services/smartReviewService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/smart-review/today
 * 获取今日需要复习的题目
 * 
 * 查询参数：
 * - limit: 最大数量（默认50）
 * - includeMastered: 是否包含已掌握的题目（默认false）
 */
router.get('/today', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      limit = '50',
      includeMastered = 'false',
    } = req.query;

    const limitNum = validateInt(limit, { min: 1, max: 100, defaultValue: 50 });

    const questions = await getTodayReviewQuestions(userId, {
      limit: limitNum,
      includeMastered: includeMastered === 'true',
    });

    res.json({
      success: true,
      data: {
        questions,
        count: questions.length,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/smart-review/today error:', err);
    res.json({
      success: true,
      data: { questions: [], count: 0 },
      message: '复习列表暂不可用，已返回空列表',
    });
  }
});

/**
 * POST /api/v3/smart-review/:wrongQuestionId/update
 * 更新错题的复习计划（基于回答质量）
 * 
 * body: {
 *   quality: number (0-5，必填)
 * }
 */
router.post('/:wrongQuestionId/update', requireAuth, async (req, res) => {
  try {
    const { wrongQuestionId } = req.params;
    const { quality } = req.body;
    const userId = req.user.id;

    if (quality === undefined || quality === null) {
      return res.status(400).json({
        success: false,
        message: 'quality 是必填项（0-5）',
      });
    }

    const qualityNum = validateInt(quality, { min: 0, max: 5, defaultValue: null });
    if (qualityNum === null) {
      return res.status(400).json({
        success: false,
        message: 'quality 必须是0-5之间的整数',
      });
    }

    // 验证错题是否属于当前用户
    const WrongQuestion = (await import('../../models/WrongQuestion.js')).default;
    const wrongQuestion = await WrongQuestion.findById(wrongQuestionId);
    if (!wrongQuestion) {
      return res.status(404).json({
        success: false,
        message: '错题不存在',
      });
    }

    if (wrongQuestion.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该错题',
      });
    }

    const updated = await updateReviewPlan(wrongQuestionId, qualityNum);

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('POST /api/v3/smart-review/:wrongQuestionId/update error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新复习计划失败',
    });
  }
});

/**
 * GET /api/v3/smart-review/plan
 * 生成智能复习计划
 * 
 * 查询参数：
 * - days: 计划天数（默认7）
 * - questionsPerDay: 每天题目数（默认10）
 */
router.get('/plan', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      days = '7',
      questionsPerDay = '10',
    } = req.query;

    const daysNum = validateInt(days, { min: 1, max: 30, defaultValue: 7 });
    const questionsPerDayNum = validateInt(questionsPerDay, { min: 1, max: 50, defaultValue: 10 });

    const plan = await generateReviewPlan(userId, {
      days: daysNum,
      questionsPerDay: questionsPerDayNum,
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    console.error('GET /api/v3/smart-review/plan error:', err);
    res.status(500).json({
      success: false,
      message: '生成复习计划失败',
    });
  }
});

/**
 * POST /api/v3/smart-review/reminder
 * 检查并发送复习提醒
 */
router.post('/reminder', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await checkAndSendReviewReminders(userId);

    res.json({
      success: true,
      data: {
        reminderSent: count > 0,
        questionCount: count,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/smart-review/reminder error:', err);
    res.status(500).json({
      success: false,
      message: '发送复习提醒失败',
    });
  }
});

/**
 * POST /api/v3/smart-review/initialize
 * 批量初始化复习计划（为没有复习计划的错题创建计划）
 */
router.post('/initialize', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await initializeReviewPlans(userId);

    res.json({
      success: true,
      data: {
        initialized: count,
        message: `已为 ${count} 道错题初始化复习计划`,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/smart-review/initialize error:', err);
    res.status(500).json({
      success: false,
      message: '初始化复习计划失败',
    });
  }
});

export default router;

