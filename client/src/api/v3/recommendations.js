/**
 * GraphTutor V3.0 - 智能推荐API
 */

import api from '../api.js';

/**
 * 获取推荐的题目列表
 * @param {Object} params - 推荐参数
 * @returns {Promise<Object>}
 */
export async function getRecommendedQuestions(params = {}) {
  const {
    limit = 10,
    subjectCode,
    bankId,
    strategy = 'adaptive',
    questionId,
    knowledgeNodeId,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit);
  if (subjectCode) queryParams.append('subjectCode', subjectCode);
  if (bankId) queryParams.append('bankId', bankId);
  if (strategy) queryParams.append('strategy', strategy);
  if (questionId) queryParams.append('questionId', questionId);
  if (knowledgeNodeId) queryParams.append('knowledgeNodeId', knowledgeNodeId);
  // includeReasons=false 可显著减少首屏接口耗时（避免 N 次推荐理由请求）
  if (params.includeReasons === false) queryParams.append('includeReasons', 'false');

  const res = await api.get(`/v3/recommendations/questions?${queryParams.toString()}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取推荐题目失败');
}

/**
 * 获取题目的推荐理由
 * @param {string} questionId - 题目ID
 * @returns {Promise<string>}
 */
export async function getRecommendationReason(questionId) {
  const res = await api.get(`/v3/recommendations/reason/${questionId}`);
  if (res.data?.success) {
    return res.data.data.reason;
  }
  throw new Error(res.data?.message || '获取推荐理由失败');
}

