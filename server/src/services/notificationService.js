/**
 * GraphTutor V3.0 - 通知服务
 * 
 * 功能：处理通知的创建、查询、标记等操作
 */

import Notification from '../models/Notification.js';

/**
 * 创建通知
 */
export async function createNotification(data) {
  const {
    userId,
    type,
    title,
    content,
    relatedId = null,
    relatedType = null,
    link = null,
    icon = null,
    priority = 3,
  } = data;

  const notification = await Notification.create({
    userId,
    type,
    title,
    content,
    relatedId,
    relatedType,
    link,
    icon,
    priority,
    isRead: false,
    isDeleted: false,
  });

  return notification;
}

/**
 * 批量创建通知
 */
export async function createNotifications(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return [];
  }

  const created = await Notification.insertMany(notifications);
  return created;
}

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    isRead = null,
    priority = null,
  } = options;

  const query = {
    userId,
    isDeleted: false,
  };

  if (type) query.type = type;
  if (isRead !== null) query.isRead = isRead;
  if (priority) query.priority = priority;

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
  ]);

  return {
    items: notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(userId) {
  return Notification.countDocuments({
    userId,
    isRead: false,
    isDeleted: false,
  });
}

/**
 * 标记通知为已读
 */
export async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new Error('通知不存在');
  }

  notification.isRead = true;
  await notification.save();

  return notification;
}

/**
 * 批量标记为已读
 */
export async function markAllAsRead(userId, type = null) {
  const query = {
    userId,
    isRead: false,
    isDeleted: false,
  };

  if (type) query.type = type;

  const result = await Notification.updateMany(query, {
    $set: { isRead: true },
  });

  return result;
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId, userId) {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new Error('通知不存在');
  }

  notification.isDeleted = true;
  await notification.save();

  return notification;
}

/**
 * 批量删除通知
 */
export async function deleteNotifications(notificationIds, userId) {
  const result = await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      userId,
    },
    {
      $set: { isDeleted: true },
    }
  );

  return result;
}

/**
 * 创建成就解锁通知
 */
export async function createAchievementNotification(userId, achievement) {
  return createNotification({
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
 * 创建讨论回复通知
 */
export async function createReplyNotification(userId, discussion, reply) {
  return createNotification({
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
 * 创建学习提醒通知
 */
export async function createReminderNotification(userId, message) {
  return createNotification({
    userId,
    type: 'reminder',
    title: '⏰ 学习提醒',
    content: message || '该学习了！保持每天的学习习惯',
    link: '/quiz',
    icon: '⏰',
    priority: 3,
  });
}

