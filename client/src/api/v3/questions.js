/**
 * GraphTutor V3.0 - 题目管理API
 */

import api from '../api.js';

/**
 * 获取题目列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} { data, meta }
 */
export async function getQuestions(params = {}) {
  const {
    subjectCode,
    bankId,
    difficulty,
    knowledgeNodeId,
    managerId,
    tags,
    source,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = params;

  const queryParams = new URLSearchParams();
  if (subjectCode) queryParams.append('subjectCode', subjectCode);
  if (bankId) queryParams.append('bankId', bankId);
  if (difficulty) {
    if (Array.isArray(difficulty)) {
      queryParams.append('difficulty', JSON.stringify(difficulty));
    } else {
      queryParams.append('difficulty', difficulty);
    }
  }
  if (knowledgeNodeId) queryParams.append('knowledgeNodeId', knowledgeNodeId);
  if (managerId) queryParams.append('managerId', managerId);
  if (tags) {
    if (Array.isArray(tags)) {
      tags.forEach((tag) => queryParams.append('tags', tag));
    } else {
      queryParams.append('tags', tags);
    }
  }
  if (source) queryParams.append('source', source);
  if (search) queryParams.append('search', search);
  queryParams.append('page', page);
  queryParams.append('limit', limit);
  if (sort) queryParams.append('sort', sort);

  const res = await api.get(`/v3/questions?${queryParams.toString()}`);
  return {
    data: res.data?.data || [],
    meta: res.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/**
 * 获取题目统计信息
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export async function getQuestionStats(params = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });

  const res = await api.get(`/v3/questions/stats?${queryParams.toString()}`);
  return res.data?.data;
}

/**
 * 获取题目详情
 * @param {string} id - 题目ID（支持_id、id、qid）
 * @returns {Promise<Object>}
 */
export async function getQuestion(id) {
  const res = await api.get(`/v3/questions/${id}`);
  return res.data?.data;
}

/**
 * 创建题目
 * @param {Object} payload - 题目数据
 * @returns {Promise<Object>}
 */
export async function createQuestion(payload) {
  const res = await api.post('/v3/questions', payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '创建题目失败');
}

/**
 * 更新题目
 * @param {string} id - 题目ID
 * @param {Object} payload - 更新数据
 * @returns {Promise<Object>}
 */
export async function updateQuestion(id, payload) {
  const res = await api.put(`/v3/questions/${id}`, payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '更新题目失败');
}

/**
 * 删除题目
 * @param {string} id - 题目ID
 * @returns {Promise<void>}
 */
export async function deleteQuestion(id) {
  const res = await api.delete(`/v3/questions/${id}`);
  if (!res.data?.success) {
    throw new Error(res.data?.message || '删除题目失败');
  }
}

/**
 * 批量创建题目
 * @param {Object} payload - { questions: Array, bankId: string }
 * @returns {Promise<Object>}
 */
export async function batchCreateQuestions(payload) {
  const res = await api.post('/v3/questions/batch', payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '批量创建题目失败');
}

/**
 * 获取题目版本历史
 * @param {string} id - 题目ID
 * @param {Object} options - { limit, includeContent }
 * @returns {Promise<Array>}
 */
export async function getQuestionVersions(id, options = {}) {
  const { limit = 50, includeContent = false } = options;
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit);
  if (includeContent) queryParams.append('includeContent', 'true');

  const res = await api.get(`/v3/questions/${id}/versions?${queryParams.toString()}`);
  return res.data?.data || [];
}

/**
 * 恢复题目到指定版本
 * @param {string} id - 题目ID
 * @param {number} version - 版本号
 * @returns {Promise<Object>}
 */
export async function restoreQuestionVersion(id, version) {
  const res = await api.post(`/v3/questions/${id}/restore`, { version });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '恢复版本失败');
}

/**
 * 对比两个版本
 * @param {string} id - 题目ID
 * @param {number} v1 - 版本1
 * @param {number} v2 - 版本2
 * @returns {Promise<Object>}
 */
export async function compareQuestionVersions(id, v1, v2) {
  const res = await api.get(`/v3/questions/${id}/compare?v1=${v1}&v2=${v2}`);
  return res.data?.data;
}

/**
 * 查找相似题目
 * @param {string} id - 题目ID
 * @param {number} limit - 数量限制（默认5）
 * @returns {Promise<Array>}
 */
export async function findSimilarQuestions(id, limit = 5) {
  const res = await api.get(`/v3/questions/${id}/similar?limit=${limit}`);
  return res.data?.data || [];
}

/**
 * 收藏题目
 * @param {string} id - 题目ID
 * @returns {Promise<Object>}
 */
export async function favoriteQuestion(id) {
  const res = await api.post(`/v3/questions/${id}/favorite`);
  if (res.data?.success) {
    return res.data;
  }
  throw new Error(res.data?.message || '收藏失败');
}

/**
 * 取消收藏题目
 * @param {string} id - 题目ID
 * @returns {Promise<Object>}
 */
export async function unfavoriteQuestion(id) {
  const res = await api.delete(`/v3/questions/${id}/favorite`);
  if (res.data?.success) {
    return res.data;
  }
  throw new Error(res.data?.message || '取消收藏失败');
}

/**
 * 获取收藏的题目列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} { data, meta }
 */
export async function getFavoriteQuestions(params = {}) {
  const { page = 1, limit = 20 } = params;
  const queryParams = new URLSearchParams();
  queryParams.append('page', page);
  queryParams.append('limit', limit);
  
  const res = await api.get(`/v3/questions/favorites?${queryParams.toString()}`);
  if (res.data?.success) {
    return res.data;
  }
  throw new Error(res.data?.message || '获取收藏列表失败');
}

/**
 * 批量更新题目
 * @param {Object} payload - { ids: Array, updates: Object }
 * @returns {Promise<Object>}
 */
export async function batchUpdateQuestions(payload) {
  const res = await api.put('/v3/questions/batch', payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '批量更新失败');
}

/**
 * 批量删除题目
 * @param {Array<string>} ids - 题目ID数组
 * @returns {Promise<Object>}
 */
export async function batchDeleteQuestions(ids) {
  const res = await api.delete('/v3/questions/batch', { data: { ids } });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '批量删除失败');
}

