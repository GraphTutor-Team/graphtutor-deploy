/**
 * GraphTutor V3.0 - 学习动态API客户端
 */

import api from '../api.js';

/**
 * 创建学习动态
 */
export async function createLearningPost(postData) {
  const res = await api.post('/v3/learning-posts', postData);
  return res.data;
}

/**
 * 获取动态列表
 */
export async function getLearningPosts(params = {}) {
  const res = await api.get('/v3/learning-posts', { params });
  return res.data;
}

/**
 * 获取动态详情
 */
export async function getLearningPostById(postId) {
  const res = await api.get(`/v3/learning-posts/${postId}`);
  return res.data;
}

/**
 * 点赞/取消点赞动态
 */
export async function toggleLikePost(postId) {
  const res = await api.put(`/v3/learning-posts/${postId}/like`);
  return res.data;
}

/**
 * 分享动态
 */
export async function sharePost(postId) {
  const res = await api.post(`/v3/learning-posts/${postId}/share`);
  return res.data;
}

/**
 * 删除动态
 */
export async function deleteLearningPost(postId) {
  const res = await api.delete(`/v3/learning-posts/${postId}`);
  return res.data;
}

/**
 * 创建评论
 */
export async function createComment(postId, commentData) {
  const res = await api.post(`/v3/learning-posts/${postId}/comments`, commentData);
  return res.data;
}

/**
 * 获取评论列表
 */
export async function getComments(postId, params = {}) {
  const res = await api.get(`/v3/learning-posts/${postId}/comments`, { params });
  return res.data;
}

/**
 * 点赞/取消点赞评论
 */
export async function toggleLikeComment(commentId) {
  const res = await api.put(`/v3/learning-posts/comments/${commentId}/like`);
  return res.data;
}

/**
 * 删除评论
 */
export async function deleteComment(commentId) {
  const res = await api.delete(`/v3/learning-posts/comments/${commentId}`);
  return res.data;
}

