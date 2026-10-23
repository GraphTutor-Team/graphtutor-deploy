/**
 * GraphTutor V3.0 - 自适应学习引擎 API 客户端
 */

import api from '../api.js';

/**
 * 生成个性化学习路径（创建学习计划 + 每日任务）
 * @param {Object} params - { goalText?, targetDays?, preset? }  preset: 考研|考公|留学|四六级
 * @returns {Promise<{ plan, tasks, summary }>}
 */
export async function generatePersonalizedPath(params = {}) {
  const res = await api.post('/v3/adaptive/personalized-path', params);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '生成个性化路径失败');
}
