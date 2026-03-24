/**
 * GraphTutor V3.0 - 通知API客户端
 */

import api from '../api.js';

/**
 * 获取通知列表
 */
export async function getNotifications(params = {}) {
  const res = await api.get('/v3/notifications', { params });
  return res.data;
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount() {
  const res = await api.get('/v3/notifications/unread-count');
  return res.data.data.count;
}

/**
 * 标记通知为已读
 */
export async function markAsRead(notificationId) {
  const res = await api.put(`/v3/notifications/${notificationId}/read`);
  return res.data;
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(type = null) {
  const res = await api.put('/v3/notifications/read-all', { type });
  return res.data;
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId) {
  const res = await api.delete(`/v3/notifications/${notificationId}`);
  return res.data;
}

/**
 * 批量删除通知
 */
export async function deleteNotifications(ids) {
  const res = await api.delete('/v3/notifications', { data: { ids } });
  return res.data;
}

