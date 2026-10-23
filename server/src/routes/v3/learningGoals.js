/**
 * GraphTutor V3.0 - 学习目标管理API
 * 
 * 路径：/api/v3/learning-goals
 * 功能：提供学习目标的CRUD功能
 */

import express from 'express';
import LearningGoal from '../../models/LearningGoal.js';
import Subject from '../../models/Subject.js';
import { requireAuth } from '../../middleware/auth.js';
import { sanitizeString, validateInt } from '../../middleware/validation.js';

async function attachSubjectNames(goals) {
  const codes = [...new Set(
    goals
      .map((goal) => goal.subjectCode)
      .filter((code) => typeof code === 'string' && code),
  )];
  if (codes.length === 0) return goals;

  const subjects = await Subject.find({ code: { $in: codes } }).select('code name').lean();
  const byCode = new Map(subjects.map((subject) => [subject.code, subject]));
  return goals.map((goal) => {
    if (typeof goal.subjectCode !== 'string' || !goal.subjectCode) return goal;
    const subject = byCode.get(goal.subjectCode);
    if (!subject) return goal;
    return {
      ...goal,
      subjectCode: { code: subject.code, name: subject.name },
    };
  });
}

const router = express.Router();

/**
 * GET /api/v3/learning-goals
 * 获取用户的学习目标列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const goals = await attachSubjectNames(await LearningGoal.find(query)
      .populate('bankId', 'name')
      .sort({ createdAt: -1 })
      .lean());

    res.json({
      success: true,
      data: goals,
    });
  } catch (err) {
    console.error('GET /api/v3/learning-goals error:', err);
    res.status(500).json({
      success: false,
      message: '获取学习目标失败',
    });
  }
});

/**
 * POST /api/v3/learning-goals
 * 创建学习目标
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      type,
      targetType,
      targetValue,
      startDate,
      endDate,
      subjectCode,
      bankId,
      reminder,
    } = req.body;

    if (!title || !targetType || !targetValue || !endDate) {
      return res.status(400).json({
        success: false,
        message: '标题、目标类型、目标值和结束日期是必填项',
      });
    }

    const goal = await LearningGoal.create({
      userId,
      title: sanitizeString(title, { maxLength: 200 }),
      description: description ? sanitizeString(description, { maxLength: 1000 }) : '',
      type: type || 'custom',
      targetType,
      targetValue: validateInt(targetValue, { min: 1 }),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      subjectCode: subjectCode || null,
      bankId: bankId || null,
      reminder: reminder || { enabled: false },
    });

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (err) {
    console.error('POST /api/v3/learning-goals error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建学习目标失败',
    });
  }
});

/**
 * PUT /api/v3/learning-goals/:id
 * 更新学习目标
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const goal = await LearningGoal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: '学习目标不存在',
      });
    }

    // 允许更新的字段
    const allowedFields = [
      'title',
      'description',
      'targetValue',
      'endDate',
      'subjectCode',
      'bankId',
      'reminder',
      'status',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (updates.hasOwnProperty(field)) {
        if (field === 'title') {
          updateData[field] = sanitizeString(updates[field], { maxLength: 200 });
        } else if (field === 'description') {
          updateData[field] = sanitizeString(updates[field], { maxLength: 1000 });
        } else if (field === 'targetValue') {
          updateData[field] = validateInt(updates[field], { min: 1 });
        } else if (field === 'endDate') {
          updateData[field] = new Date(updates[field]);
        } else {
          updateData[field] = updates[field];
        }
      }
    });

    const updated = await LearningGoal.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('PUT /api/v3/learning-goals/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新学习目标失败',
    });
  }
});

/**
 * DELETE /api/v3/learning-goals/:id
 * 删除学习目标
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const goal = await LearningGoal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: '学习目标不存在',
      });
    }

    await LearningGoal.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '学习目标已删除',
    });
  } catch (err) {
    console.error('DELETE /api/v3/learning-goals/:id error:', err);
    res.status(500).json({
      success: false,
      message: '删除学习目标失败',
    });
  }
});

/**
 * GET /api/v3/learning-goals/stats
 * 获取学习目标统计信息
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, active, completed, expired] = await Promise.all([
      LearningGoal.countDocuments({ userId }),
      LearningGoal.countDocuments({ userId, status: 'active' }),
      LearningGoal.countDocuments({ userId, status: 'completed' }),
      LearningGoal.countDocuments({ userId, status: 'expired' }),
    ]);

    const activeGoals = await LearningGoal.find({ userId, status: 'active' })
      .select('targetValue currentValue')
      .lean();

    const avgProgress = activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => {
          const progress = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
          return sum + progress;
        }, 0) / activeGoals.length
      : 0;

    res.json({
      success: true,
      data: {
        total,
        active,
        completed,
        expired,
        avgProgress: Math.round(avgProgress * 100) / 100,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/learning-goals/stats error:', err);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
    });
  }
});

export default router;

