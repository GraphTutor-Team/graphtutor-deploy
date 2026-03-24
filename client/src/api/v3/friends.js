/**
 * GraphTutor V3.0 - 好友API客户端
 * 
 * 作用：提供好友管理相关的API调用函数
 * 关联页面：
 *   - pages/Friends.jsx (好友管理页面)
 *   - pages/FriendsDiscover.jsx (好友发现页面)
 * 技术栈：
 *   - Axios (HTTP请求)
 *   - RESTful API
 *   - 错误处理
 */

import api from '../api.js';

/**
 * 获取好友列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {string} params.status - 状态（active/blocked）
 * @returns {Promise<Object>} 好友列表
 */
export async function getFriends(params = {}) {
  const res = await api.get('/v3/friends', { params });
  return res.data.data;
}

/**
 * 获取好友请求列表
 * @param {Object} params - 查询参数
 * @param {string} params.type - 类型（received/sent）
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {string} params.status - 状态（pending/accepted/rejected/cancelled）
 * @returns {Promise<Object>} 请求列表
 */
export async function getFriendRequests(params = {}) {
  const res = await api.get('/v3/friends/requests', { params });
  return res.data.data;
}

/**
 * 发送好友请求
 * @param {string} toUserId - 接收者ID
 * @param {string} message - 请求消息（可选）
 * @returns {Promise<Object>} 创建的请求
 */
export async function sendFriendRequest(toUserId, message = '') {
  const res = await api.post('/v3/friends/requests', {
    toUserId,
    message,
  });
  return res.data.data;
}

/**
 * 接受好友请求
 * @param {string} requestId - 请求ID
 * @returns {Promise<Object>} 创建的好友关系
 */
export async function acceptFriendRequest(requestId) {
  const res = await api.put(`/v3/friends/requests/${requestId}/accept`);
  return res.data.data;
}

/**
 * 拒绝好友请求
 * @param {string} requestId - 请求ID
 * @returns {Promise<Object>} 更新的请求
 */
export async function rejectFriendRequest(requestId) {
  const res = await api.put(`/v3/friends/requests/${requestId}/reject`);
  return res.data.data;
}

/**
 * 取消好友请求
 * @param {string} requestId - 请求ID
 * @returns {Promise<Object>} 更新的请求
 */
export async function cancelFriendRequest(requestId) {
  const res = await api.delete(`/v3/friends/requests/${requestId}`);
  return res.data.data;
}

/**
 * 删除好友
 * @param {string} friendId - 好友ID
 * @returns {Promise<void>}
 */
export async function deleteFriend(friendId) {
  await api.delete(`/v3/friends/${friendId}`);
}

/**
 * 屏蔽好友
 * @param {string} friendId - 好友ID
 * @returns {Promise<Object>} 更新的好友关系
 */
export async function blockFriend(friendId) {
  const res = await api.put(`/v3/friends/${friendId}/block`);
  return res.data.data;
}

/**
 * 获取共同好友
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 共同好友列表
 */
export async function getMutualFriends(userId) {
  const res = await api.get(`/v3/friends/mutual/${userId}`);
  return res.data.data.items;
}

/**
 * 检查是否是好友
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否是好友
 */
export async function checkFriendship(userId) {
  const res = await api.get(`/v3/friends/check/${userId}`);
  return res.data.data.isFriend;
}

/**
 * 搜索用户
 * @param {Object} params - 查询参数
 * @param {string} params.keyword - 搜索关键词
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @returns {Promise<Object>} 搜索结果
 */
export async function searchUsers(params = {}) {
  const res = await api.get('/v3/friends/search', { params });
  return res.data.data;
}

/**
 * 获取推荐好友
 * @param {Object} params - 查询参数
 * @param {number} params.limit - 返回数量
 * @returns {Promise<Array>} 推荐好友列表
 */
export async function getRecommendedFriends(params = {}) {
  const res = await api.get('/v3/friends/recommendations', { params });
  return res.data.data.items;
}

/**
 * 获取好友学习统计
 * @param {string} friendId - 好友ID
 * @param {Object} params - 查询参数
 * @param {number} params.days - 统计天数（默认30）
 * @returns {Promise<Object>} 好友学习统计
 */
export async function getFriendLearningStats(friendId, params = {}) {
  const res = await api.get(`/v3/friends/${friendId}/stats`, { params });
  return res.data.data;
}

/**
 * 对比学习数据
 * @param {string} friendId - 好友ID
 * @param {Object} params - 查询参数
 * @param {number} params.days - 统计天数（默认30）
 * @returns {Promise<Object>} 学习数据对比
 */
export async function compareLearningData(friendId, params = {}) {
  const res = await api.get(`/v3/friends/${friendId}/compare`, { params });
  return res.data.data;
}

/**
 * 获取共同学习内容
 * @param {string} friendId - 好友ID
 * @param {Object} params - 查询参数
 * @param {number} params.limit - 返回数量（默认20）
 * @returns {Promise<Object>} 共同学习内容
 */
export async function getCommonLearningContent(friendId, params = {}) {
  const res = await api.get(`/v3/friends/${friendId}/common`, { params });
  return res.data.data;
}

/**
 * 获取好友排行榜
 * @param {Object} params - 查询参数
 * @param {string} params.type - 排行类型（total/questions/accuracy）
 * @param {string} params.period - 时间范围（all/week/month）
 * @param {number} params.limit - 返回数量（默认50）
 * @returns {Promise<Object>} 好友排行榜
 */
export async function getFriendsLeaderboard(params = {}) {
  const res = await api.get('/v3/friends/leaderboard', { params });
  return res.data.data;
}

