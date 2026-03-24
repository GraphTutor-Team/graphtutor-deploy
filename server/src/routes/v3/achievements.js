/**
 * GraphTutor V3.0 - 学习成就API
 * 
 * 路径：/api/v3/achievements
 * 功能：提供学习成就的查询功能
 */

import express from 'express';
import Achievement from '../../models/Achievement.js';
import { requireAuth } from '../../middleware/auth.js';
import { checkAndAwardAchievements } from '../../services/achievementService.js';

const router = express.Router();

/**
 * GET /api/v3/achievements
 * 获取用户的学习成就列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    const query = { userId };
    if (type) {
      query.type = type;
    }

    const achievements = await Achievement.find(query)
      .sort({ unlockedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: achievements,
    });
  } catch (err) {
    console.error('GET /api/v3/achievements error:', err);
    res.status(500).json({
      success: false,
      message: '获取学习成就失败',
    });
  }
});

/**
 * GET /api/v3/achievements/stats
 * 获取用户成就统计
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 计算本周开始时间
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [total, recent, thisWeek] = await Promise.all([
      Achievement.countDocuments({ userId }),
      Achievement.find({ userId })
        .sort({ unlockedAt: -1 })
        .limit(5)
        .lean(),
      Achievement.countDocuments({
        userId,
        unlockedAt: { $gte: startOfWeek },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        recent,
        thisWeek,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/achievements/stats error:', err);
    res.status(500).json({
      success: false,
      message: '获取成就统计失败',
    });
  }
});

/**
 * POST /api/v3/achievements/check
 * 手动触发成就检查（用于测试或修复）
 */
router.post('/check', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventType, eventData } = req.body;

    const achievements = await checkAndAwardAchievements(
      userId,
      eventType || 'daily_check',
      eventData || {}
    );

    res.json({
      success: true,
      data: {
        checked: true,
        newAchievements: achievements.length,
        achievements,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/achievements/check error:', err);
    res.status(500).json({
      success: false,
      message: '检查成就失败',
    });
  }
});

export default router;

