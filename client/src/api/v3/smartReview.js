/**
 * GraphTutor V3.0 - 智能复习API客户端
 */

import api from '../api.js';

/**
 * 获取今日需要复习的题目
 */
export async function getTodayReviewQuestions(options = {}) {
  const response = await api.get('/v3/smart-review/today', {
    params: options,
  });
  return response.data;
}

/**
 * 更新错题的复习计划
 */
export async function updateReviewPlan(wrongQuestionId, quality) {
  const response = await api.post(`/v3/smart-review/${wrongQuestionId}/update`, {
    quality,
  });
  return response.data;
}

/**
 * 生成智能复习计划
 */
export async function generateReviewPlan(options = {}) {
  const response = await api.get('/v3/smart-review/plan', {
    params: options,
  });
  return response.data;
}

/**
 * 发送复习提醒
 */
export async function sendReviewReminder() {
  const response = await api.post('/v3/smart-review/reminder');
  return response.data;
}

/**
 * 初始化复习计划
 */
export async function initializeReviewPlans() {
  const response = await api.post('/v3/smart-review/initialize');
  return response.data;
}

