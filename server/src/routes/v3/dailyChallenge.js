/**
 * GraphTutor V3.0 - 每日挑战 API
 * 路径：/api/v3/daily-challenge
 * 功能：按日期返回当日固定 10 道题 ID（同一天所有用户相同），用于「今日挑战」
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import Question from '../../models/Question.js';

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
    const ids = await Question.find({}).select('_id').limit(POOL_SIZE).lean();
    const idStrings = ids.map((doc) => String(doc._id));

    if (idStrings.length === 0) {
      return res.json({ success: true, data: { date: dateStr, questionIds: [] } });
    }

    const rng = seededRng(dateStr);
    const shuffled = shuffleWithRng(idStrings, rng);
    const questionIds = shuffled.slice(0, Math.min(DAILY_COUNT, shuffled.length));

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
