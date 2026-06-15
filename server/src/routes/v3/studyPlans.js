/**
 * GraphTutor V3.0 - 学习计划API路由
 * 
 * 路径：/api/v3/study-plans
 * 功能：提供学习计划的CRUD操作、打卡、日历视图等功能
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  getStudyPlans,
  getStudyPlanDetail,
  getDailyTask,
  updateTaskProgress,
  checkIn,
  getCheckIns,
  getCalendarView,
  getStudyStats,
} from '../../services/studyPlanService.js';
import { validateInt } from '../../middleware/validation.js';
import { sanitizeString } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/study-plans/stats
 * 获取学习统计
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const stats = await getStudyStats(userId, { startDate, endDate });

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/study-plans/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取统计失败',
    });
  }
});

/**
 * GET /api/v3/study-plans
 * 获取学习计划列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page, limit } = req.query;

    const result = await getStudyPlans(userId, {
      status,
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/study-plans error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取学习计划列表失败',
    });
  }
});

/**
 * GET /api/v3/study-plans/:id
 * 获取学习计划详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await getStudyPlanDetail(userId, id);

    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    console.error('GET /api/v3/study-plans/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取学习计划失败',
    });
  }
});

/**
 * POST /api/v3/study-plans
 * 创建学习计划
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      type,
      startDate,
      endDate,
      dailyTarget,
      subjectCodes,
      knowledgeNodeIds,
      reminders,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '计划名称不能为空',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '开始日期和结束日期不能为空',
      });
    }

    const plan = await createStudyPlan(userId, {
      name: sanitizeString(name, { maxLength: 200 }),
      description: sanitizeString(description || '', { maxLength: 1000, allowEmpty: true }),
      type: type || 'daily',
      startDate,
      endDate,
      dailyTarget: validateInt(dailyTarget, { min: 1, defaultValue: 10 }),
      subjectCodes: Array.isArray(subjectCodes) ? subjectCodes : [],
      knowledgeNodeIds: Array.isArray(knowledgeNodeIds) ? knowledgeNodeIds : [],
      reminders: reminders || { enabled: false, times: [] },
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (err) {
    console.error('POST /api/v3/study-plans error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建学习计划失败',
    });
  }
});

/**
 * PUT /api/v3/study-plans/:id
 * 更新学习计划
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, status, dailyTarget, reminders } = req.body;

    const updates = {};
    if (name !== undefined) {
      updates.name = sanitizeString(name, { maxLength: 200 });
    }
    if (description !== undefined) {
      updates.description = sanitizeString(description, { maxLength: 1000, allowEmpty: true });
    }
    if (status !== undefined) {
      updates.status = status;
    }
    if (dailyTarget !== undefined) {
      updates.dailyTarget = validateInt(dailyTarget, { min: 1 });
    }
    if (reminders !== undefined) {
      updates.reminders = reminders;
    }

    const plan = await updateStudyPlan(userId, id, updates);

    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    console.error('PUT /api/v3/study-plans/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新学习计划失败',
    });
  }
});

/**
 * DELETE /api/v3/study-plans/:id
 * 删除学习计划
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await deleteStudyPlan(userId, id);

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/study-plans/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除学习计划失败',
    });
  }
});

/**
 * GET /api/v3/study-plans/:id/tasks/:date
 * 获取某日的任务
 */
router.get('/:id/tasks/:date', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, date } = req.params;

    const task = await getDailyTask(userId, id, date);

    res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('GET /api/v3/study-plans/:id/tasks/:date error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取任务失败',
    });
  }
});

/**
 * PUT /api/v3/study-plans/:id/tasks/:taskId
 * 更新任务进度
 */
router.put('/:id/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const { completedCount } = req.body;

    const task = await updateTaskProgress(userId, taskId, completedCount);

    res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('PUT /api/v3/study-plans/:id/tasks/:taskId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新任务失败',
    });
  }
});

/**
 * POST /api/v3/study-plans/:id/check-in
 * 打卡
 */
router.post('/:id/check-in', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { date, studyDuration, completedQuestions, correctQuestions, mood, summary, images } = req.body;

    const record = await checkIn(userId, id, {
      date: date || new Date(),
      studyDuration: validateInt(studyDuration, { min: 0, defaultValue: 0 }),
      completedQuestions: validateInt(completedQuestions, { min: 0, defaultValue: 0 }),
      correctQuestions: validateInt(correctQuestions, { min: 0, defaultValue: 0 }),
      mood: mood || 'normal',
      summary: sanitizeString(summary || '', { maxLength: 500, allowEmpty: true }),
      images: Array.isArray(images) ? images : [],
    });

    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (err) {
    console.error('POST /api/v3/study-plans/:id/check-in error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '打卡失败',
    });
  }
});

/**
 * GET /api/v3/study-plans/check-ins
 * 获取所有打卡记录（不依赖planId）
 */
router.get('/check-ins', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, page, limit } = req.query;

    // 获取所有计划的打卡记录
    const StudyCheckIn = (await import('../../models/StudyCheckIn.js')).default;
    const query = { userId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const pageNum = validateInt(page, { min: 1, defaultValue: 1 });
    const limitNum = validateInt(limit, { min: 1, max: 100, defaultValue: 30 });
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      StudyCheckIn.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('planId', 'title')
        .lean(),
      StudyCheckIn.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        items,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    console.error('GET /api/v3/study-plans/check-ins error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取打卡记录失败',
    });
  }
});

/**
 * GET /api/v3/study-plans/:id/check-ins
 * 获取指定计划的打卡记录
 */
router.get('/:id/check-ins', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { startDate, endDate, page, limit } = req.query;

    const result = await getCheckIns(userId, id, {
      startDate,
      endDate,
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 30 }),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/study-plans/:id/check-ins error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取打卡记录失败',
    });
  }
});

/**
 * GET /api/v3/study-plans/:id/calendar
 * 获取日历视图数据
 */
router.get('/:id/calendar', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: '年份和月份不能为空',
      });
    }

    const calendarData = await getCalendarView(
      userId,
      id,
      validateInt(year, { min: 2000, max: 2100 }),
      validateInt(month, { min: 1, max: 12 })
    );

    res.json({
      success: true,
      data: calendarData,
    });
  } catch (err) {
    console.error('GET /api/v3/study-plans/:id/calendar error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取日历数据失败',
    });
  }
});

export default router;

