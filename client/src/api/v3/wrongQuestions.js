/**
 * GraphTutor V3.0 - 错题本API
 */

import api from '../api.js';

/**
 * 获取错题列表
 */
export async function getWrongQuestions(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.category) queryParams.append('category', params.category);
  if (params.tags) {
    const tags = Array.isArray(params.tags) ? params.tags : [params.tags];
    tags.forEach(tag => queryParams.append('tags', tag));
  }
  if (params.masteryStatus) queryParams.append('masteryStatus', params.masteryStatus);
  if (params.subjectCode) queryParams.append('subjectCode', params.subjectCode);
  if (params.searchKeyword) queryParams.append('searchKeyword', params.searchKeyword);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const res = await api.get(`/v3/wrong-questions?${queryParams.toString()}`);
  return res.data.data;
}

/**
 * 获取错题统计
 */
export async function getWrongQuestionStats() {
  const res = await api.get('/v3/wrong-questions/stats');
  return res.data.data;
}

/**
 * 获取分类列表
 */
export async function getCategories() {
  const res = await api.get('/v3/wrong-questions/categories');
  return res.data.data;
}

/**
 * 获取标签列表
 */
export async function getTags() {
  const res = await api.get('/v3/wrong-questions/tags');
  return res.data.data;
}

/**
 * 更新错题分类
 */
export async function updateCategory(questionId, category) {
  const res = await api.put(`/v3/wrong-questions/${questionId}/category`, { category });
  return res.data.data;
}

/**
 * 更新错题标签
 */
export async function updateTags(questionId, tags) {
  const res = await api.put(`/v3/wrong-questions/${questionId}/tags`, { tags });
  return res.data.data;
}

/**
 * 标记为已掌握
 */
export async function markAsMastered(questionId) {
  const res = await api.put(`/v3/wrong-questions/${questionId}/mastered`);
  return res.data.data;
}

/**
 * 取消掌握标记
 */
export async function unmarkAsMastered(questionId) {
  const res = await api.delete(`/v3/wrong-questions/${questionId}/mastered`);
  return res.data.data;
}

/**
 * 删除错题
 */
export async function deleteWrongQuestion(questionId) {
  const res = await api.delete(`/v3/wrong-questions/${questionId}`);
  return res.data;
}

/**
 * 批量更新分类
 */
export async function batchUpdateCategory(questionIds, category) {
  const res = await api.post('/v3/wrong-questions/batch/category', {
    questionIds,
    category,
  });
  return res.data.data;
}

/**
 * 批量更新标签
 */
export async function batchUpdateTags(questionIds, tags) {
  const res = await api.post('/v3/wrong-questions/batch/tags', {
    questionIds,
    tags,
  });
  return res.data.data;
}

/**
 * 批量标记为已掌握
 */
export async function batchMarkAsMastered(questionIds) {
  const res = await api.post('/v3/wrong-questions/batch/mastered', {
    questionIds,
  });
  return res.data.data;
}

/**
 * 批量删除错题
 */
export async function batchDeleteWrongQuestions(questionIds) {
  const res = await api.post('/v3/wrong-questions/batch/delete', {
    questionIds,
  });
  return res.data.data;
}

/**
 * 导出错题
 */
export async function exportWrongQuestions(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.category) queryParams.append('category', params.category);
  if (params.tags) {
    const tags = Array.isArray(params.tags) ? params.tags : [params.tags];
    tags.forEach(tag => queryParams.append('tags', tag));
  }
  if (params.masteryStatus) queryParams.append('masteryStatus', params.masteryStatus);
  if (params.subjectCode) queryParams.append('subjectCode', params.subjectCode);

  const res = await api.get(`/v3/wrong-questions/export?${queryParams.toString()}`);
  return res.data.data;
}

