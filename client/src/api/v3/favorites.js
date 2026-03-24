/**
 * GraphTutor V3.0 - 收藏API客户端
 * 
 * 功能：提供收藏和收藏夹的前端API调用
 */

import api from '../api.js';

// ========== 收藏夹相关 ==========

/**
 * 获取收藏夹列表
 */
export async function getFavoriteFolders() {
  const response = await api.get('/v3/favorites/folders');
  return response.data;
}

/**
 * 创建收藏夹
 */
export async function createFavoriteFolder(data) {
  const response = await api.post('/v3/favorites/folders', data);
  return response.data;
}

/**
 * 更新收藏夹
 */
export async function updateFavoriteFolder(folderId, data) {
  const response = await api.put(`/v3/favorites/folders/${folderId}`, data);
  return response.data;
}

/**
 * 删除收藏夹
 */
export async function deleteFavoriteFolder(folderId) {
  const response = await api.delete(`/v3/favorites/folders/${folderId}`);
  return response.data;
}

// ========== 收藏相关 ==========

/**
 * 获取收藏列表
 */
export async function getFavorites(options = {}) {
  const params = new URLSearchParams();
  if (options.folderId) params.append('folderId', options.folderId);
  if (options.tags && options.tags.length > 0) {
    options.tags.forEach(tag => params.append('tags', tag));
  }
  if (options.searchKeyword) params.append('searchKeyword', options.searchKeyword);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const response = await api.get(`/v3/favorites?${params.toString()}`);
  return response.data;
}

/**
 * 获取收藏统计
 */
export async function getFavoriteStats() {
  const response = await api.get('/v3/favorites/stats');
  return response.data;
}

/**
 * 检查题目是否已收藏
 */
export async function checkFavorite(questionId) {
  const response = await api.get(`/v3/favorites/check/${questionId}`);
  return response.data;
}

/**
 * 添加收藏
 */
export async function addFavorite(data) {
  const response = await api.post('/v3/favorites', data);
  return response.data;
}

/**
 * 移除收藏
 */
export async function removeFavorite(questionId, folderId) {
  const response = await api.delete(`/v3/favorites/${questionId}/${folderId}`);
  return response.data;
}

/**
 * 更新收藏（备注、标签）
 */
export async function updateFavorite(questionId, folderId, data) {
  const response = await api.put(`/v3/favorites/${questionId}/${folderId}`, data);
  return response.data;
}

/**
 * 移动收藏
 */
export async function moveFavorite(data) {
  const response = await api.post('/v3/favorites/move', data);
  return response.data;
}

/**
 * 复制收藏
 */
export async function copyFavorite(data) {
  const response = await api.post('/v3/favorites/copy', data);
  return response.data;
}

/**
 * 批量删除收藏
 */
export async function batchRemoveFavorites(data) {
  const response = await api.post('/v3/favorites/batch/remove', data);
  return response.data;
}

/**
 * 批量移动收藏
 */
export async function batchMoveFavorites(data) {
  const response = await api.post('/v3/favorites/batch/move', data);
  return response.data;
}

