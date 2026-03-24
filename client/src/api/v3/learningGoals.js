/**
 * GraphTutor V3.0 - 学习目标API
 */

import api from '../api.js';

/**
 * 获取学习目标列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export async function getLearningGoals(params = {}) {
  const { status, type } = params;
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  if (type) queryParams.append('type', type);
  
  const res = await api.get(`/v3/learning-goals?${queryParams.toString()}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取学习目标失败');
}

/**
 * 创建学习目标
 * @param {Object} payload - 学习目标数据
 * @returns {Promise<Object>}
 */
export async function createLearningGoal(payload) {
  const res = await api.post('/v3/learning-goals', payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '创建学习目标失败');
}

/**
 * 更新学习目标
 * @param {string} id - 学习目标ID
 * @param {Object} payload - 更新数据
 * @returns {Promise<Object>}
 */
export async function updateLearningGoal(id, payload) {
  const res = await api.put(`/v3/learning-goals/${id}`, payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '更新学习目标失败');
}

/**
 * 删除学习目标
 * @param {string} id - 学习目标ID
 * @returns {Promise<void>}
 */
export async function deleteLearningGoal(id) {
  const res = await api.delete(`/v3/learning-goals/${id}`);
  if (!res.data?.success) {
    throw new Error(res.data?.message || '删除学习目标失败');
  }
}

/**
 * 获取学习目标统计信息
 * @returns {Promise<Object>}
 */
export async function getLearningGoalStats() {
  const res = await api.get('/v3/learning-goals/stats');
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取统计信息失败');
}

