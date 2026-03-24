/**
 * GraphTutor V3.0 - 讨论区API
 */

import api from '../api.js';

/**
 * 获取讨论列表
 */
export async function getDiscussions(params = {}) {
  const res = await api.get('/v3/discussions', { params });
  return res.data;
}

/**
 * 创建讨论
 */
export async function createDiscussion(data) {
  const res = await api.post('/v3/discussions', data);
  return res.data;
}

/**
 * 获取讨论详情
 */
export async function getDiscussionDetail(id) {
  const res = await api.get(`/v3/discussions/${id}`);
  return res.data;
}

/**
 * 添加回复
 */
export async function addReply(discussionId, content, parentReplyId = null) {
  const res = await api.post(`/v3/discussions/${discussionId}/replies`, {
    content,
    parentReplyId,
  });
  return res.data;
}

/**
 * 点赞讨论
 */
export async function likeDiscussion(id) {
  const res = await api.put(`/v3/discussions/${id}/like`);
  return res.data;
}

/**
 * 点赞回复
 */
export async function likeReply(discussionId, replyId) {
  const res = await api.put(`/v3/discussions/${discussionId}/replies/${replyId}/like`);
  return res.data;
}

/**
 * 标记为最佳答案
 */
export async function markBestAnswer(discussionId, replyId) {
  const res = await api.put(`/v3/discussions/${discussionId}/replies/${replyId}/best-answer`);
  return res.data;
}
