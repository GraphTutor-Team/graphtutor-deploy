/**
 * GraphTutor V3.0 - 学习路径 / 任务系统 API
 *
 * 路径：/api/v3/learning-path
 * 功能：新手任务、每日任务进度，完成新手路径可领取成就
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import Record from '../../models/Record.js';
import WrongQuestion from '../../models/WrongQuestion.js';
import Achievement from '../../models/Achievement.js';
import StudyCheckIn from '../../models/StudyCheckIn.js';
import Note from '../../models/Note.js';
import { createAchievementNotification } from '../../services/notificationService.js';

const router = express.Router();

/** 今日 0 点（服务器本地） */
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * GET /api/v3/learning-path/tasks
 * 获取新手任务与每日任务进度
 */
router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const { start: todayStart, end: todayEnd } = getTodayRange();

    const [
      recordCount,
      recordCountToday,
      wrongCount,
      hasNewbieAchievement,
      checkInToday,
      noteActivityToday,
    ] = await Promise.all([
      Record.countDocuments({ userId }),
      Record.countDocuments({
        userId,
        createdAt: { $gte: todayStart },
      }),
      WrongQuestion.countDocuments({ userId }),
      Achievement.findOne({ userId, type: 'newbie_path' }).lean(),
      StudyCheckIn.findOne({
        userId,
        date: { $gte: todayStart, $lt: todayEnd },
      }).lean(),
      Note.findOne({
        userId,
        updatedAt: { $gte: todayStart },
      }).select('_id').lean(),
    ]);

    const step1 = recordCount >= 1;
    const step2 = wrongCount >= 1;
    const step3 = recordCount >= 2;
    const newbieComplete = step1 && step2 && step3;

    let newbieAchievementUnlocked = !!hasNewbieAchievement;
    if (newbieComplete && !hasNewbieAchievement) {
      const existing = await Achievement.findOne({ userId, type: 'newbie_path' });
      if (!existing) {
        const achievement = await Achievement.create({
          userId,
          type: 'newbie_path',
          title: '新手入门',
          description: '完成首次练习、加入错题本并复习一次',
          icon: '🌟',
          metadata: { source: 'learning_path' },
        });
        newbieAchievementUnlocked = true;
        try {
          await createAchievementNotification(userId, achievement);
        } catch (e) {
          console.warn('createAchievementNotification failed:', e?.message);
        }
      }
    }

    const newbieTasks = [
      {
        id: 'newbie_1',
        title: '完成首次练习',
        done: step1,
        link: '/quiz',
        order: 1,
      },
      {
        id: 'newbie_2',
        title: '加入错题本',
        done: step2,
        link: '/review',
        order: 2,
      },
      {
        id: 'newbie_3',
        title: '复习一次',
        done: step3,
        link: '/review',
        order: 3,
      },
      {
        id: 'newbie_4',
        title: '获得成就',
        done: newbieAchievementUnlocked,
        link: '/achievements',
        order: 4,
      },
    ];

    const dailyTasks = [
      {
        id: 'daily_checkin',
        title: '每日打卡',
        target: 1,
        current: checkInToday ? 1 : 0,
        done: !!checkInToday,
        link: '/checkin',
        order: 1,
      },
      {
        id: 'daily_5questions',
        title: '做 5 道题',
        target: 5,
        current: Math.min(recordCountToday, 5),
        done: recordCountToday >= 5,
        link: '/quiz',
        order: 2,
      },
      {
        id: 'daily_1note',
        title: '看一篇笔记',
        target: 1,
        current: noteActivityToday ? 1 : 0,
        done: !!noteActivityToday,
        link: '/notes',
        order: 3,
      },
    ];

    res.json({
      success: true,
      data: {
        newbieTasks,
        dailyTasks,
        newbieComplete: newbieTasks.every((t) => t.done),
        dailyComplete: dailyTasks.every((t) => t.done),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/learning-path/tasks error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取任务失败',
    });
  }
});

export default router;
