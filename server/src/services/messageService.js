/**
 * GraphTutor V3.0 - 消息服务
 * 
 * 作用：处理消息相关的业务逻辑
 * 关联文件：
 *   - models/Message.js (消息模型)
 *   - models/User.js (用户模型)
 *   - models/Friendship.js (好友关系模型)
 *   - services/websocketService.js (WebSocket服务)
 *   - routes/v3/messages.js (消息API路由)
 * 技术栈：
 *   - Mongoose ODM
 *   - MongoDB聚合查询
 *   - WebSocket实时推送
 */

import Message from '../models/Message.js';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import webSocketService from './websocketService.js';
import { areFriends } from './friendService.js';

/**
 * 发送消息
 * @param {string} senderId - 发送者ID
 * @param {string} receiverId - 接收者ID
 * @param {string} content - 消息内容
 * @param {Object} options - 选项（type, attachments）
 * @returns {Promise<Object>} 创建的消息
 */
export async function sendMessage(senderId, receiverId, content, options = {}) {
  // 验证消息内容
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('消息内容不能为空');
  }

  if (content.length > 5000) {
    throw new Error('消息内容不能超过5000字符');
  }

  // 检查是否是好友（仅好友可以发送私信）
  const isFriend = await areFriends(senderId, receiverId);
  if (!isFriend) {
    throw new Error('只能向好友发送消息');
  }

  // 检查接收者是否存在
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new Error('接收者不存在');
  }

  // 创建消息
  const message = await Message.create({
    senderId,
    receiverId,
    content: content.trim(),
    type: options.type || 'text',
    attachments: options.attachments || [],
  });

  // 实时推送消息
  try {
    webSocketService.sendToUser(receiverId, 'message:new', {
      message: message.toObject ? message.toObject() : message,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('实时推送消息失败:', err);
    // 不影响消息保存，继续执行
  }

  // 获取发送者和接收者信息
  const sender = await User.findById(senderId).lean();
  const messageObj = message.toObject ? message.toObject() : message;
  
  return {
    ...messageObj,
    sender: {
      id: sender._id,
      name: sender.name || sender.email,
      avatarUrl: sender.avatarUrl,
    },
    receiver: {
      id: receiver._id,
      name: receiver.name || receiver.email,
      avatarUrl: receiver.avatarUrl,
    },
  };
}

/**
 * 获取会话列表
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 会话列表
 */
export async function getConversations(userId) {
  const conversations = await Message.getConversations(userId);

  // 获取用户信息
  const userIds = conversations.map(c => c._id);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  return conversations.map(conv => ({
    userId: conv._id,
    name: userMap.get(conv._id)?.name || userMap.get(conv._id)?.email || `用户${conv._id.slice(-4)}`,
    avatarUrl: userMap.get(conv._id)?.avatarUrl,
    lastMessage: conv.lastMessage,
    unreadCount: conv.unreadCount,
    lastMessageAt: conv.lastMessage?.createdAt,
  }));
}

/**
 * 获取两个用户之间的消息
 * @param {string} userId1 - 用户1 ID
 * @param {string} userId2 - 用户2 ID
 * @param {Object} options - 查询选项（limit, before）
 * @returns {Promise<Array>} 消息列表
 */
export async function getConversation(userId1, userId2, options = {}) {
  // 检查是否是好友
  const isFriend = await areFriends(userId1, userId2);
  if (!isFriend) {
    throw new Error('只能查看好友的消息');
  }

  const messages = await Message.getConversation(userId1, userId2, options);

  // 获取用户信息
  const userIds = new Set();
  messages.forEach(msg => {
    userIds.add(msg.senderId);
    userIds.add(msg.receiverId);
  });

  const users = await User.find({ _id: { $in: Array.from(userIds) } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  return messages.map(msg => ({
    ...msg,
    sender: {
      id: msg.senderId,
      name: userMap.get(msg.senderId)?.name || userMap.get(msg.senderId)?.email || `用户${msg.senderId.slice(-4)}`,
      avatarUrl: userMap.get(msg.senderId)?.avatarUrl,
    },
    receiver: {
      id: msg.receiverId,
      name: userMap.get(msg.receiverId)?.name || userMap.get(msg.receiverId)?.email || `用户${msg.receiverId.slice(-4)}`,
      avatarUrl: userMap.get(msg.receiverId)?.avatarUrl,
    },
  }));
}

/**
 * 标记消息为已读
 * @param {string} userId - 用户ID（接收者）
 * @param {string} senderId - 发送者ID
 * @returns {Promise<Object>} 更新结果
 */
export async function markMessagesAsRead(userId, senderId) {
  // 检查是否是好友
  const isFriend = await areFriends(userId, senderId);
  if (!isFriend) {
    throw new Error('只能标记好友的消息为已读');
  }

  const result = await Message.updateMany(
    {
      senderId,
      receiverId: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  // 推送已读状态更新
  try {
    webSocketService.sendToUser(senderId, 'message:read', {
      receiverId: userId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('实时推送已读状态失败:', err);
  }

  return {
    modifiedCount: result.modifiedCount,
  };
}

/**
 * 删除消息
 * @param {string} userId - 用户ID
 * @param {string} messageId - 消息ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteMessage(userId, messageId) {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('消息不存在');
  }

  // 检查权限：只有发送者或接收者可以删除
  if (message.senderId.toString() !== userId.toString() && message.receiverId.toString() !== userId.toString()) {
    throw new Error('无权删除此消息');
  }

  // 标记删除（软删除）
  if (message.senderId.toString() === userId.toString()) {
    message.isDeletedBySender = true;
  } else {
    message.isDeletedByReceiver = true;
  }

  await message.save();

  return {
    success: true,
    message: '消息已删除',
  };
}

/**
 * 清空与某用户的会话（当前用户侧软删除）
 * @param {string} userId - 当前用户 ID
 * @param {string} partnerId - 对方用户 ID
 */
export async function deleteConversation(userId, partnerId) {
  const uid = String(userId);
  const pid = String(partnerId);
  const messages = await Message.find({
    $or: [
      { senderId: uid, receiverId: pid },
      { senderId: pid, receiverId: uid },
    ],
  });

  let count = 0;
  for (const message of messages) {
    if (String(message.senderId) === uid) {
      message.isDeletedBySender = true;
    }
    if (String(message.receiverId) === uid) {
      message.isDeletedByReceiver = true;
    }
    await message.save();
    count += 1;
  }

  return {
    success: true,
    deleted: count,
    message: count > 0 ? '聊天记录已清空' : '暂无聊天记录',
  };
}

/**
 * 获取未读消息数量
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} 未读消息数量
 */
export async function getUnreadCount(userId) {
  const count = await Message.countDocuments({
    receiverId: userId,
    isRead: false,
    isDeletedByReceiver: false,
  });

  return count;
}

/**
 * 获取与特定用户的未读消息数量
 * @param {string} userId - 用户ID
 * @param {string} senderId - 发送者ID
 * @returns {Promise<number>} 未读消息数量
 */
export async function getUnreadCountWithUser(userId, senderId) {
  const count = await Message.countDocuments({
    senderId,
    receiverId: userId,
    isRead: false,
    isDeletedByReceiver: false,
  });

  return count;
}

/**
 * 撤回消息
 * @param {string} userId - 用户ID
 * @param {string} messageId - 消息ID
 * @returns {Promise<Object>} 撤回结果
 */
export async function recallMessage(userId, messageId) {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('消息不存在');
  }

  // 检查权限：只有发送者可以撤回
  if (message.senderId.toString() !== userId.toString()) {
    throw new Error('只能撤回自己发送的消息');
  }

  // 检查时间：只能撤回2分钟内的消息
  const now = new Date();
  const messageTime = new Date(message.createdAt);
  const diffMinutes = (now - messageTime) / 60000;
  if (diffMinutes > 2) {
    throw new Error('只能撤回2分钟内的消息');
  }

  // 标记为已撤回
  message.isRecalled = true;
  message.recalledAt = now;
  message.content = '[消息已撤回]';
  await message.save();

  // 实时推送撤回通知
  try {
    webSocketService.sendToUser(message.receiverId, 'message:recalled', {
      messageId: message._id.toString(),
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('实时推送撤回通知失败:', err);
  }

  return {
    success: true,
    message: '消息已撤回',
  };
}

/**
 * 搜索消息
 * @param {string} userId - 用户ID
 * @param {string} keyword - 搜索关键词
 * @param {Object} options - 查询选项（limit, offset）
 * @returns {Promise<Array>} 搜索结果
 */
export async function searchMessages(userId, keyword, options = {}) {
  const { limit = 50, offset = 0 } = options;

  if (!keyword || keyword.trim().length === 0) {
    throw new Error('搜索关键词不能为空');
  }

  // 搜索用户参与的所有会话中的消息
  const messages = await Message.find({
    $or: [
      { senderId: userId },
      { receiverId: userId },
    ],
    content: { $regex: keyword.trim(), $options: 'i' },
    isRecalled: false, // 不显示已撤回的消息
    $and: [
      {
        $or: [
          { senderId: userId, isDeletedBySender: false },
          { receiverId: userId, isDeletedBySender: false },
        ],
      },
      {
        $or: [
          { receiverId: userId, isDeletedByReceiver: false },
          { senderId: userId, isDeletedByReceiver: false },
        ],
      },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  // 获取相关用户信息
  const userIds = new Set();
  messages.forEach(msg => {
    userIds.add(msg.senderId);
    userIds.add(msg.receiverId);
  });

  const users = await User.find({ _id: { $in: Array.from(userIds) } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  return messages.map(msg => ({
    ...msg,
    sender: {
      id: msg.senderId,
      name: userMap.get(msg.senderId)?.name || userMap.get(msg.senderId)?.email || `用户${msg.senderId.slice(-4)}`,
      avatarUrl: userMap.get(msg.senderId)?.avatarUrl,
    },
    receiver: {
      id: msg.receiverId,
      name: userMap.get(msg.receiverId)?.name || userMap.get(msg.receiverId)?.email || `用户${msg.receiverId.slice(-4)}`,
      avatarUrl: userMap.get(msg.receiverId)?.avatarUrl,
    },
  }));
}

