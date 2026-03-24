/**
 * GraphTutor V3.0 - 复习计划API
 */

import api from '../api.js';

/**
 * 获取复习计划列表
 */
export async function getReviewPlans(status) {
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  
  const res = await api.get(`/v3/review-plans?${queryParams.toString()}`);
  return res.data.data;
}

/**
 * 获取复习计划详情
 */
export async function getReviewPlan(id) {
  const res = await api.get(`/v3/review-plans/${id}`);
  return res.data.data;
}

/**
 * 创建复习计划
 */
export async function createReviewPlan(data) {
  const res = await api.post('/v3/review-plans', data);
  return res.data.data;
}

/**
 * 更新复习计划
 */
export async function updateReviewPlan(id, data) {
  const res = await api.put(`/v3/review-plans/${id}`, data);
  return res.data.data;
}

/**
 * 删除复习计划
 */
export async function deleteReviewPlan(id) {
  const res = await api.delete(`/v3/review-plans/${id}`);
  return res.data;
}

/**
 * 执行复习计划（获取今日复习题目）
 */
export async function executeReviewPlan(id) {
  const res = await api.post(`/v3/review-plans/${id}/execute`);
  return res.data.data;
}

/**
 * 获取复习计划统计
 */
export async function getReviewPlanStats(id) {
  const res = await api.get(`/v3/review-plans/${id}/stats`);
  return res.data.data;
}

