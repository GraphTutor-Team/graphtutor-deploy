/**
 * GraphTutor V3.0 - 学习成就API
 */

import api from '../api.js';

/**
 * 获取学习成就列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Array>}
 */
export async function getAchievements(params = {}) {
  const { type } = params;
  const queryParams = new URLSearchParams();
  if (type) queryParams.append('type', type);
  
  const res = await api.get(`/v3/achievements?${queryParams.toString()}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取学习成就失败');
}

/**
 * 获取成就统计
 * @returns {Promise<Object>}
 */
export async function getAchievementStats() {
  const res = await api.get('/v3/achievements/stats');
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取成就统计失败');
}

/**
 * 手动触发成就检查
 * @param {Object} params - { eventType, eventData }
 * @returns {Promise<Object>}
 */
export async function checkAchievements(params = {}) {
  const res = await api.post('/v3/achievements/check', params);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '检查成就失败');
}

