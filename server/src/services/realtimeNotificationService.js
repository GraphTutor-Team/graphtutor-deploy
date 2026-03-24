/**
 * GraphTutor V3.0 - 实时通知推送服务
 * 
 * 功能：结合通知服务和WebSocket，实现实时通知推送
 */

import { createNotification } from './notificationService.js';
import webSocketService from './websocketService.js';
import { info, warn, debug } from '../utils/logger.js';

/**
 * 创建并实时推送通知
 * @param {Object} notificationData - 通知数据
 * @returns {Promise<Object>} 创建的通知
 */
export async function createAndPushNotification(notificationData) {
  try {
    // 创建通知
    const notification = await createNotification(notificationData);

    // 实时推送通知
    const pushed = webSocketService.sendToUser(
      notificationData.userId,
      'notification:new',
      {
        notification: notification.toObject ? notification.toObject() : notification,
        timestamp: new Date().toISOString(),
      }
    );

    if (pushed) {
      info(`实时通知已推送给用户 ${notificationData.userId}`);
    } else {
      debug(`用户 ${notificationData.userId} 未在线，通知已保存但未推送`);
    }

    return notification;
  } catch (err) {
    warn('创建并推送通知失败:', { error: err.message, data: notificationData });
    throw err;
  }
}

/**
 * 批量创建并推送通知
 * @param {Array} notificationsData - 通知数据数组
 * @returns {Promise<Array>} 创建的通知数组
 */
export async function createAndPushNotifications(notificationsData) {
  if (!Array.isArray(notificationsData) || notificationsData.length === 0) {
    return [];
  }

  const results = [];

  for (const data of notificationsData) {
    try {
      const notification = await createAndPushNotification(data);
      results.push(notification);
    } catch (err) {
      warn(`创建通知失败:`, { error: err.message, data });
    }
  }

  return results;
}

/**
 * 推送未读通知数量更新
 * @param {string} userId - 用户ID
 * @param {number} count - 未读数量
 */
export function pushUnreadCountUpdate(userId, count) {
  webSocketService.sendToUser(userId, 'notification:unread-count', {
    count,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 推送通知已读状态更新
 * @param {string} userId - 用户ID
 * @param {string} notificationId - 通知ID
 * @param {boolean} isRead - 是否已读
 */
export function pushNotificationReadUpdate(userId, notificationId, isRead) {
  webSocketService.sendToUser(userId, 'notification:read-update', {
    notificationId,
    isRead,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 推送通知删除更新
 * @param {string} userId - 用户ID
 * @param {string} notificationId - 通知ID
 */
export function pushNotificationDeleteUpdate(userId, notificationId) {
  webSocketService.sendToUser(userId, 'notification:delete', {
    notificationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 创建并推送成就解锁通知
 * @param {string} userId - 用户ID
 * @param {Object} achievement - 成就对象
 * @returns {Promise<Object>}
 */
export async function createAndPushAchievementNotification(userId, achievement) {
  return createAndPushNotification({
    userId,
    type: 'achievement',
    title: '🎉 成就解锁！',
    content: `恭喜你解锁了成就：${achievement.title}`,
    relatedId: achievement._id || achievement.id,
    relatedType: 'achievement',
    link: `/achievements`,
    icon: '🎉',
    priority: 5,
  });
}

/**
 * 创建并推送讨论回复通知
 * @param {string} userId - 用户ID
 * @param {Object} discussion - 讨论对象
 * @param {Object} reply - 回复对象
 * @returns {Promise<Object>}
 */
export async function createAndPushReplyNotification(userId, discussion, reply) {
  return createAndPushNotification({
    userId,
    type: 'reply',
    title: '💬 收到新回复',
    content: `你的讨论"${discussion.title}"收到了新回复`,
    relatedId: discussion._id || discussion.id,
    relatedType: 'discussion',
    link: `/community/${discussion._id || discussion.id}`,
    icon: '💬',
    priority: 4,
  });
}

/**
 * 创建并推送学习提醒通知
 * @param {string} userId - 用户ID
 * @param {string} message - 提醒消息
 * @returns {Promise<Object>}
 */
export async function createAndPushReminderNotification(userId, message) {
  return createAndPushNotification({
    userId,
    type: 'reminder',
    title: '⏰ 学习提醒',
    content: message || '该学习了！保持每天的学习习惯',
    link: '/quiz',
    icon: '⏰',
    priority: 3,
  });
}

/**
 * 创建并推送系统通知
 * @param {string} userId - 用户ID
 * @param {string} title - 通知标题
 * @param {string} content - 通知内容
 * @param {Object} options - 其他选项
 * @returns {Promise<Object>}
 */
export async function createAndPushSystemNotification(userId, title, content, options = {}) {
  return createAndPushNotification({
    userId,
    type: 'system',
    title,
    content,
    link: options.link || null,
    icon: options.icon || '🔔',
    priority: options.priority || 3,
    relatedId: options.relatedId || null,
    relatedType: options.relatedType || null,
  });
}

/** 别名：供 smartReviewService 等调用「创建并实时推送通知」 */
export { createAndPushNotification as createRealtimeNotification };

