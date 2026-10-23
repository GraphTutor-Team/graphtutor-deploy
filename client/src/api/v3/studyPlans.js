/**
 * GraphTutor V3.0 - 学习计划API客户端
 * 
 * 功能：提供学习计划的前端API调用
 */

import api from '../api.js';

/**
 * 获取学习统计
 */
export async function getStudyStats(options = {}) {
  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);

  const response = await api.get(`/v3/study-plans/stats?${params.toString()}`);
  return response.data;
}

/**
 * 获取学习计划列表
 */
export async function getStudyPlans(options = {}) {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const response = await api.get(`/v3/study-plans?${params.toString()}`);
  return response.data;
}

/**
 * 获取学习计划详情
 */
export async function getStudyPlanDetail(planId) {
  const response = await api.get(`/v3/study-plans/${planId}`);
  return response.data;
}

/**
 * 创建学习计划
 */
export async function createStudyPlan(data) {
  const response = await api.post('/v3/study-plans', data);
  return response.data;
}

/**
 * 更新学习计划
 */
export async function updateStudyPlan(planId, data) {
  const response = await api.put(`/v3/study-plans/${planId}`, data);
  return response.data;
}

/**
 * 删除学习计划
 */
export async function deleteStudyPlan(planId) {
  const response = await api.delete(`/v3/study-plans/${planId}`);
  return response.data;
}

/**
 * 获取某日的任务
 */
export async function getDailyTask(planId, date) {
  const response = await api.get(`/v3/study-plans/${planId}/tasks/${date}`);
  return response.data;
}

/**
 * 更新任务进度
 */
export async function updateTaskProgress(planId, taskId, completedCount) {
  const response = await api.put(`/v3/study-plans/${planId}/tasks/${taskId}`, {
    completedCount,
  });
  return response.data;
}

/**
 * 打卡
 */
export async function checkIn(planId, data) {
  const response = await api.post(`/v3/study-plans/${planId}/check-in`, data);
  return response.data;
}

/**
 * 获取所有打卡记录（不依赖planId）
 */
export async function getAllCheckIns(options = {}) {
  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const response = await api.get(`/v3/study-plans/check-ins?${params.toString()}`);
  return response.data;
}

/**
 * 获取打卡记录（指定计划）
 */
export async function getCheckIns(planId, options = {}) {
  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const response = await api.get(`/v3/study-plans/${planId}/check-ins?${params.toString()}`);
  return response.data;
}

/**
 * 获取日历视图数据
 */
export async function getCalendarView(planId, year, month) {
  const response = await api.get(`/v3/study-plans/${planId}/calendar?year=${year}&month=${month}`);
  return response.data;
}

