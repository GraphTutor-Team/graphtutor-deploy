/**
 * GraphTutor V3.0 - 装备系统 API
 * 路径：/api/v3/equipment
 * 规则：连续打卡、累计打卡、参与计划数等解锁虚拟装备
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import StudyCheckIn from '../../models/StudyCheckIn.js';

const router = express.Router();

/** 装备定义：id, name, description, icon, rule(解锁条件说明), requireStreak | requireTotalDays | requirePlanCount */
const EQUIPMENT_DEFS = [
  {
    id: 'focus_halo',
    name: '专注光环',
    description: '连续打卡 7 天可获得，学习时更有状态',
    icon: '✨',
    requireStreak: 7,
  },
  {
    id: 'bookworm_badge',
    name: '书虫徽章',
    description: '累计打卡 30 天可获得',
    icon: '📚',
    requireTotalDays: 30,
  },
  {
    id: 'team_player',
    name: '协力者',
    description: '在 3 个不同学习计划中打卡可获得',
    icon: '🤝',
    requirePlanCount: 3,
  },
];

/**
 * GET /api/v3/equipment
 * 获取当前用户装备列表及解锁状态
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    startDate.setHours(0, 0, 0, 0);

    const checkIns = await StudyCheckIn.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    })
      .select('date planId')
      .lean();

    const dateSet = new Set(checkIns.map((c) => new Date(c.date).toISOString().slice(0, 10)));
    const totalDays = dateSet.size;
    const sortedDates = [...dateSet].sort().reverse();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let currentStreak = 0;
    if (sortedDates.length > 0 && (sortedDates[0] === today || sortedDates[0] === yesterdayStr)) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        prev.setDate(prev.getDate() - 1);
        if (sortedDates[i] === prev.toISOString().slice(0, 10)) currentStreak++;
        else break;
      }
    }

    const planCountAgg = await StudyCheckIn.aggregate([
      { $match: { userId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$planId' } },
      { $count: 'count' },
    ]);
    const planCount = planCountAgg[0]?.count ?? 0;

    const items = EQUIPMENT_DEFS.map((def) => {
      let unlocked = false;
      if (def.requireStreak != null) unlocked = currentStreak >= def.requireStreak;
      else if (def.requireTotalDays != null) unlocked = totalDays >= def.requireTotalDays;
      else if (def.requirePlanCount != null) unlocked = planCount >= def.requirePlanCount;
      return {
        ...def,
        unlocked,
        progress: def.requireStreak != null
          ? { current: currentStreak, required: def.requireStreak }
          : def.requireTotalDays != null
          ? { current: totalDays, required: def.requireTotalDays }
          : def.requirePlanCount != null
          ? { current: planCount, required: def.requirePlanCount }
          : null,
      };
    });

    res.json({
      success: true,
      data: {
        currentStreak,
        totalDays,
        planCount,
        items,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/equipment error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取装备列表失败',
    });
  }
});

export default router;
