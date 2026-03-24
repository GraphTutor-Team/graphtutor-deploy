// client/src/api/analytics.js
// 学习统计接口

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function getAccuracyByNode({ userId, limit = 50 }) {
  if (!userId) throw new Error('userId 不能为空');
  const params = new URLSearchParams({ userId, limit: String(limit) });
  return request(`/analytics/accuracy-by-node?${params.toString()}`);
}

export async function getProgress7d({ userId, days = 7 }) {
  if (!userId) throw new Error('userId 不能为空');
  const params = new URLSearchParams({
    userId,
    days: String(days),
  });
  return request(`/analytics/progress-7d?${params.toString()}`);
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
  
  const res = await request(`/analytics/mastery?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
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
  
  const res = await request(`/analytics/trend?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return res.data;
}
