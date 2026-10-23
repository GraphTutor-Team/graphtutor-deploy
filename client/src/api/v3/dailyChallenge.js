/**
 * GraphTutor V3.0 - 每日挑战 API
 * 获取今天的 10 道挑战题：先放本周错过的题，再补当天固定题目
 */

import api from '../api.js';

/**
 * 获取今日挑战题目 ID 列表
 * @param {string} [date] - 可选，YYYY-MM-DD，默认当天
 * @returns {Promise<{ date: string, questionIds: string[] }>}
 */
export async function getDailyChallenge(date) {
  const params = date ? { date } : {};
  const res = await api.get('/v3/daily-challenge', { params });
  if (res.data?.success && res.data?.data) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取今日挑战失败');
}
