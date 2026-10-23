// 学习统计接口。走统一 api 客户端，登录 token 与其它页面一致。
import api from './api.js';

function fail(error) {
  const data = error?.response?.data;
  const status = error?.response?.status;
  return new Error(data?.error || data?.message || (status ? `HTTP ${status}` : error?.message || '请求失败'));
}

async function get(path) {
  try {
    const res = await api.get(path);
    return res.data;
  } catch (error) {
    throw fail(error);
  }
}

export async function getAccuracyByNode({ userId, limit = 50 }) {
  if (!userId) throw new Error('userId 不能为空');
  const params = new URLSearchParams({ userId, limit: String(limit) });
  return get(`/analytics/accuracy-by-node?${params.toString()}`);
}

export async function getProgress7d({ userId, days = 7 }) {
  if (!userId) throw new Error('userId 不能为空');
  const params = new URLSearchParams({
    userId,
    days: String(days),
  });
  return get(`/analytics/progress-7d?${params.toString()}`);
}

/**
 * 获取知识点掌握度详细分析
 * @param {Object} params - { days, subjectCode, minQuestions }
 * @returns {Promise<Object>}
 */
export async function getKnowledgeMastery(params = {}) {
  const { userId, days = 30, subjectCode, minQuestions = 3 } = params;
  const queryParams = new URLSearchParams();
  if (userId) queryParams.append('userId', userId);
  if (days) queryParams.append('days', days);
  if (subjectCode) queryParams.append('subjectCode', subjectCode);
  if (minQuestions) queryParams.append('minQuestions', minQuestions);

  const res = await get(`/analytics/mastery?${queryParams.toString()}`);
  return res.data || res;
}

/**
 * 获取学习趋势数据
 * @param {Object} params - { days }
 * @returns {Promise<Array>}
 */
export async function getLearningTrend(params = {}) {
  const { days = 30 } = params;
  const queryParams = new URLSearchParams();
  if (days) queryParams.append('days', days);

  const res = await get(`/analytics/trend?${queryParams.toString()}`);
  return res.data;
}
