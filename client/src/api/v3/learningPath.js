/**
 * GraphTutor V3.0 - 学习路径 / 任务系统 API
 */

import api from '../api.js';

/**
 * 获取新手任务与每日任务进度
 * @returns {Promise<{ newbieTasks, dailyTasks, newbieComplete, dailyComplete }>}
 */
export async function getLearningPathTasks() {
  const res = await api.get('/v3/learning-path/tasks');
  if (!res.data?.success) throw new Error(res.data?.message || '获取任务失败');
  return res.data.data;
}
