/**
 * GraphTutor V3.0 - 消息API客户端
 * 
 * 作用：提供消息相关的API调用函数
 * 关联页面：
 *   - pages/Messages.jsx (消息列表页面)
 *   - components/ChatWindow.jsx (聊天窗口组件)
 * 技术栈：
 *   - Axios (HTTP请求)
 *   - RESTful API
 */

import api from '../api.js';

/**
 * 发送消息
 * @param {Object} data - 消息数据
 * @param {string} data.receiverId - 接收者ID
 * @param {string} data.content - 消息内容
 * @param {string} data.type - 消息类型（可选）
 * @param {Array} data.attachments - 附件（可选）
 * @returns {Promise<Object>} 发送的消息
 */
export async function sendMessage(data) {
  const res = await api.post('/v3/messages', data);
  return res.data.data;
}

/**
 * 获取会话列表
 * @returns {Promise<Array>} 会话列表
 */
export async function getConversations() {
  const res = await api.get('/v3/messages/conversations');
  return res.data.data;
}

/**
 * 获取与特定用户的消息
 * @param {string} userId - 用户ID
 * @param {Object} params - 查询参数
 * @param {number} params.limit - 返回数量（默认50）
 * @param {string} params.before - 在此时间之前的消息（ISO日期字符串）
 * @returns {Promise<Array>} 消息列表
 */
export async function getConversation(userId, params = {}) {
  const res = await api.get(`/v3/messages/conversation/${userId}`, { params });
  return res.data.data;
}

/**
 * 标记与特定用户的消息为已读
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 更新结果
 */
export async function markMessagesAsRead(userId) {
  const res = await api.put(`/v3/messages/read/${userId}`);
  return res.data.data;
}

/**
 * 删除消息
 * @param {string} messageId - 消息ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteMessage(messageId) {
  const res = await api.delete(`/v3/messages/${messageId}`);
  return res.data.data;
}

/**
 * 获取未读消息数量
 * @returns {Promise<number>} 未读消息数量
 */
export async function getUnreadCount() {
  const res = await api.get('/v3/messages/unread');
  return res.data.data.count;
}

/**
 * 获取与特定用户的未读消息数量
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} 未读消息数量
 */
export async function getUnreadCountWithUser(userId) {
  const res = await api.get(`/v3/messages/unread/${userId}`);
  return res.data.data.count;
}

/**
 * 搜索消息
 * @param {string} keyword - 搜索关键词
 * @param {Object} params - 查询参数
 * @param {number} params.limit - 返回数量（默认50）
 * @param {number} params.offset - 偏移量（默认0）
 * @returns {Promise<Array>} 搜索结果
 */
export async function searchMessages(keyword, params = {}) {
  const res = await api.get('/v3/messages/search', {
    params: { keyword, ...params },
  });
  return res.data.data;
}

/**
 * 撤回消息
 * @param {string} messageId - 消息ID
 * @returns {Promise<Object>} 撤回结果
 */
export async function recallMessage(messageId) {
  const res = await api.post(`/v3/messages/${messageId}/recall`);
  return res.data.data;
}

