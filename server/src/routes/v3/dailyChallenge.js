/**
 * GraphTutor V3.0 - 每日挑战 API
 * 路径：/api/v3/daily-challenge
 * 功能：按用户和日期返回当日 10 道题。先放本周错过的题，其余用当天固定题目补满。
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import Question from '../../models/Question.js';
import WrongQuestion from '../../models/WrongQuestion.js';

const router = express.Router();
const DAILY_COUNT = 10;
const POOL_SIZE = 500;

/** 简单确定性随机数生成器（基于种子），用于同一天同一套题 */
function seededRng(seed) {
  let s = typeof seed === 'string'
    ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) >>> 0
    : Math.abs(seed) >>> 0;
  return function () {
    s = Math.imul(48271, s) % 2147483647;
    return s / 2147483647;
  };
}

/** 用随机数生成器打乱数组（Fisher-Yates） */
function shuffleWithRng(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GET /api/v3/daily-challenge
 * 查询参数：date=YYYY-MM-DD（可选，默认当天）
 * 返回：{ date, questionIds: string[] }
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const userId = String(req.user.id);
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const wrongs = await WrongQuestion.find({
      userId,
      lastErrorAt: { $gte: since },
    }).sort({ lastErrorAt: -1 }).limit(DAILY_COUNT).select('questionId').lean();

    const questionIds = [];
    const seen = new Set();
    wrongs.forEach((row) => {
      const id = row.questionId ? String(row.questionId) : '';
      if (!id || seen.has(id) || questionIds.length >= DAILY_COUNT) return;
      seen.add(id);
      questionIds.push(id);
    });

    const excludeIds = questionIds.filter((id) => /^[a-f\d]{24}$/i.test(id));
    if (questionIds.length < DAILY_COUNT) {
      const pool = await Question.find(excludeIds.length ? { _id: { $nin: excludeIds } } : {})
        .select('_id')
        .limit(POOL_SIZE)
        .lean();
      const rng = seededRng(`${dateStr}:${userId}`);
      const shuffled = shuffleWithRng(pool.map((doc) => String(doc._id)), rng);
      shuffled.forEach((id) => {
        if (!id || seen.has(id) || questionIds.length >= DAILY_COUNT) return;
        seen.add(id);
        questionIds.push(id);
      });
    }

    res.json({
      success: true,
      data: {
        date: dateStr,
        questionIds,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/daily-challenge error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取今日挑战失败',
    });
  }
});

export default router;
