/**
 * GraphTutor V3.0 - AI功能API
 */

import api from '../api.js';

/**
 * 生成题目
 * @param {Object} config - 生成配置
 * @param {boolean} async - 是否异步执行
 * @returns {Promise<Object>}
 */
export async function generateQuestions(config, async = false) {
  const res = await api.post('/v3/ai/generate-questions', {
    ...config,
    async,
  });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '生成题目失败');
}

/**
 * 分析题目质量
 * @param {Object} question - 题目对象
 * @returns {Promise<Object>}
 */
export async function analyzeQuestion(question) {
  const res = await api.post('/v3/ai/analyze-question', { question });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '分析题目失败');
}

/**
 * 推荐学科分类
 * @param {string} questionContent - 题目内容
 * @returns {Promise<Object>}
 */
export async function classifySubject(questionContent) {
  const res = await api.post('/v3/ai/classify-subject', { questionContent });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '学科分类失败');
}

/**
 * 生成题目解析
 * @param {Object} question - 题目对象
 * @returns {Promise<string>}
 */
export async function generateExplanation(question) {
  const res = await api.post('/v3/ai/generate-explanation', { question });
  if (res.data?.success) {
    return res.data.data.explanation;
  }
  throw new Error(res.data?.message || '生成解析失败');
}

/**
 * 获取任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>}
 */
export async function getAITaskStatus(taskId) {
  const res = await api.get(`/v3/ai/tasks/${taskId}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取任务状态失败');
}

/**
 * 取消任务
 * @param {string} taskId - 任务ID
 * @returns {Promise<void>}
 */
export async function cancelAITask(taskId) {
  const res = await api.delete(`/v3/ai/tasks/${taskId}`);
  if (!res.data?.success) {
    throw new Error(res.data?.message || '取消任务失败');
  }
}

/**
 * 重试任务
 * @param {string} taskId - 任务ID
 * @returns {Promise<string>} 新任务ID
 */
export async function retryAITask(taskId) {
  const res = await api.post(`/v3/ai/tasks/${taskId}/retry`);
  if (res.data?.success) {
    return res.data.data.taskId;
  }
  throw new Error(res.data?.message || '重试任务失败');
}

/**
 * 获取用户的任务列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export async function getAITasks(params = {}) {
  const { status, limit = 50 } = params;
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  queryParams.append('limit', limit);

  const res = await api.get(`/v3/ai/tasks?${queryParams.toString()}`);
  if (res.data?.success) {
    return {
      data: res.data.data || [],
      total: res.data.total || 0,
    };
  }
  throw new Error(res.data?.message || '获取任务列表失败');
}

/**
 * 获取AI使用统计
 * @returns {Promise<Object>}
 */
export async function getAIStats() {
  const res = await api.get('/v3/ai/stats');
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取统计信息失败');
}

/**
 * AI 对话（学习伴侣）
 * @param {Array<{role: string, content: string}>} messages - 消息列表
 * @param {Object} [context] - 上下文 { pageType, questionId, knowledgeNodeId, wrongQuestionIds }
 * @returns {Promise<{ content: string, recommendedQuestionIds?: string[] }>}
 */
export async function chat(messages, context) {
  const res = await api.post('/v3/ai/chat', { messages, context });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || 'AI 对话失败');
}

/**
 * 生成长笔记摘要（Phase 1.4）
 * @param {string} content - 笔记正文
 * @returns {Promise<{ summary: string }>}
 */
export async function generateNoteSummary(content) {
  const res = await api.post('/v3/ai/note-summary', { content });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '生成摘要失败');
}

/**
 * 按近 7 天错题组今日练习
 * @param {number} limit
 * @returns {Promise<{ practiceQuestionIds: string[], weakNodes: Array }>}
 */
export async function getTodaySet(limit = 8, questionIds = []) {
  const ids = (Array.isArray(questionIds) ? questionIds : []).map(String).filter(Boolean);
  const res = ids.length
    ? await api.post('/v3/ai/today-set', { limit, questionIds: ids })
    : await api.get(`/v3/ai/today-set?limit=${limit}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取今日练习失败');
}

/**
 * 错题分析报告
 * @param {'week'|'month'} period
 * @returns {Promise<{ period, wrongCount, report, weakNodes, practiceQuestionIds }>}
 */
export async function getWrongReport(period = 'week') {
  const res = await api.get(`/v3/ai/wrong-report?period=${period}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取错题报告失败');
}

