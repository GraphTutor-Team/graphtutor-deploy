/**
 * GraphTutor V3.0 - 笔记API客户端
 * 
 * 功能：提供笔记的前端API调用
 */

import api from '../api.js';

/**
 * 获取笔记统计
 */
export async function getNoteStats() {
  const response = await api.get('/api/v3/notes/stats');
  return response.data;
}

/**
 * 获取笔记列表（支持搜索）
 */
export async function getNotes(options = {}) {
  const params = new URLSearchParams();
  if (options.searchKeyword) params.append('searchKeyword', options.searchKeyword);
  if (options.type) params.append('type', options.type);
  if (options.questionId) params.append('questionId', options.questionId);
  if (options.knowledgeNodeId) params.append('knowledgeNodeId', options.knowledgeNodeId);
  if (options.tags && options.tags.length > 0) {
    options.tags.forEach(tag => params.append('tags', tag));
  }
  if (options.isPublic !== undefined) params.append('isPublic', options.isPublic);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const response = await api.get(`/api/v3/notes?${params.toString()}`);
  return response.data;
}

/**
 * 获取公开笔记列表
 */
export async function getPublicNotes(options = {}) {
  const params = new URLSearchParams();
  if (options.searchKeyword) params.append('searchKeyword', options.searchKeyword);
  if (options.tags && options.tags.length > 0) {
    options.tags.forEach(tag => params.append('tags', tag));
  }
  if (options.type) params.append('type', options.type);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const response = await api.get(`/api/v3/notes/public?${params.toString()}`);
  return response.data;
}

/**
 * 获取题目的笔记
 */
export async function getQuestionNote(questionId) {
  const response = await api.get(`/api/v3/notes/question/${questionId}`);
  return response.data;
}

/**
 * 获取知识点的笔记列表
 */
export async function getKnowledgeNotes(knowledgeNodeId) {
  const response = await api.get(`/api/v3/notes/knowledge/${knowledgeNodeId}`);
  return response.data;
}

/**
 * 获取笔记详情
 */
export async function getNoteDetail(noteId) {
  const response = await api.get(`/api/v3/notes/${noteId}`);
  return response.data;
}

/**
 * 创建笔记
 */
export async function createNote(data) {
  const response = await api.post('/api/v3/notes', data);
  return response.data;
}

/**
 * 更新笔记
 */
export async function updateNote(noteId, data) {
  const response = await api.put(`/api/v3/notes/${noteId}`, data);
  return response.data;
}

/**
 * 删除笔记
 */
export async function deleteNote(noteId) {
  const response = await api.delete(`/api/v3/notes/${noteId}`);
  return response.data;
}

/**
 * 点赞笔记
 */
export async function likeNote(noteId) {
  const response = await api.post(`/api/v3/notes/${noteId}/like`);
  return response.data;
}

/**
 * 取消点赞
 */
export async function unlikeNote(noteId) {
  const response = await api.delete(`/api/v3/notes/${noteId}/like`);
  return response.data;
}

/**
 * 收藏笔记
 */
export async function favoriteNote(noteId) {
  const response = await api.post(`/api/v3/notes/${noteId}/favorite`);
  return response.data;
}

/**
 * 取消收藏笔记
 */
export async function unfavoriteNote(noteId) {
  const response = await api.delete(`/api/v3/notes/${noteId}/favorite`);
  return response.data;
}

/**
 * 检查是否已收藏笔记
 */
export async function checkNoteFavorite(noteId) {
  const response = await api.get(`/api/v3/notes/${noteId}/favorite/check`);
  return response.data;
}

/**
 * 获取用户收藏的笔记列表
 */
export async function getFavoriteNotes(options = {}) {
  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const response = await api.get(`/api/v3/notes/favorites?${params.toString()}`);
  return response.data;
}

/**
 * 获取相关笔记推荐
 */
export async function getNoteRecommendations(noteId, limit = 5) {
  const response = await api.get(`/api/v3/notes/${noteId}/recommendations?limit=${limit}`);
  return response.data;
}

/**
 * 生成分享链接
 */
export async function generateShareLink(noteId) {
  const response = await api.post(`/api/v3/notes/${noteId}/share`);
  return response.data;
}

/**
 * 通过分享token获取笔记
 */
export async function getNoteByShareToken(token) {
  const response = await api.get(`/api/v3/notes/share/${token}`);
  return response.data;
}

/**
 * 导出笔记为Markdown
 */
export async function exportNoteAsMarkdown(noteId) {
  const response = await api.get(`/api/v3/notes/${noteId}/export/markdown`, {
    responseType: 'blob',
  });
  
  // 创建下载链接
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `note-${noteId}.md`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return true;
}

/**
 * 批量导出笔记为Markdown
 */
export async function exportNotesAsMarkdown(noteIds = null) {
  const response = await api.post('/api/v3/notes/export/markdown', { noteIds }, {
    responseType: 'blob',
  });
  
  // 创建下载链接
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `notes-${Date.now()}.md`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return true;
}

