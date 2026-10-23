/**
 * GraphTutor V3.0 - 消息API路由
 * 
 * 作用：提供消息相关的RESTful API接口
 * 关联文件：
 *   - services/messageService.js (消息服务)
 *   - models/Message.js (消息模型)
 * 技术栈：
 *   - Express Router
 *   - 中间件认证 (requireAuth)
 *   - 数据验证
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  sendMessage,
  getConversations,
  getConversation,
  markMessagesAsRead,
  deleteMessage,
  deleteConversation,
  getUnreadCount,
  getUnreadCountWithUser,
  searchMessages,
} from '../../services/messageService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/v3/messages
 * 发送消息
 * 
 * Body:
 * - receiverId: 接收者ID
 * - content: 消息内容
 * - type: 消息类型（可选，默认text）
 * - attachments: 附件（可选）
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content, type, attachments } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: '请指定接收者ID',
      });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空',
      });
    }

    const message = await sendMessage(senderId, receiverId, content, {
      type,
      attachments,
    });

    res.json({
      success: true,
      data: message,
      message: '消息已发送',
    });
  } catch (err) {
    console.error('POST /api/v3/messages error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '发送消息失败',
    });
  }
});

/**
 * GET /api/v3/messages/conversations
 * 获取会话列表
 */
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await getConversations(userId);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (err) {
    console.error('GET /api/v3/messages/conversations error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取会话列表失败',
    });
  }
});

/**
 * GET /api/v3/messages/conversation/:userId
 * 获取与特定用户的消息
 * 
 * 查询参数：
 * - limit: 返回数量（默认50）
 * - before: 在此时间之前的消息（ISO日期字符串）
 */
router.get('/conversation/:userId', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;
    const limit = validateInt(req.query.limit, { min: 1, max: 100, defaultValue: 50 });
    const before = req.query.before || null;

    const messages = await getConversation(currentUserId, targetUserId, {
      limit,
      before,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error('GET /api/v3/messages/conversation/:userId error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '获取消息失败',
    });
  }
});

/**
 * PUT /api/v3/messages/read/:userId
 * 标记与特定用户的消息为已读
 */
router.put('/read/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const senderId = req.params.userId;

    const result = await markMessagesAsRead(userId, senderId);

    res.json({
      success: true,
      data: result,
      message: '消息已标记为已读',
    });
  } catch (err) {
    console.error('PUT /api/v3/messages/read/:userId error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '标记消息失败',
    });
  }
});

/**
 * DELETE /api/v3/messages/conversation/:userId
 * 清空与某用户的聊天记录（软删除，仅对当前用户隐藏）
 */
router.delete('/conversation/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const partnerId = req.params.userId;
    const result = await deleteConversation(userId, partnerId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('DELETE /api/v3/messages/conversation/:userId error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '清空聊天记录失败',
    });
  }
});

/**
 * DELETE /api/v3/messages/:id
 * 删除消息
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    const result = await deleteMessage(userId, messageId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('DELETE /api/v3/messages/:id error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '删除消息失败',
    });
  }
});

/**
 * POST /api/v3/messages/:id/recall
 * 撤回消息
 */
router.post('/:id/recall', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    const result = await recallMessage(userId, messageId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('POST /api/v3/messages/:id/recall error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '撤回消息失败',
    });
  }
});

/**
 * GET /api/v3/messages/unread
 * 获取未读消息数量
 */
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        count,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/messages/unread error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取未读消息数量失败',
    });
  }
});

/**
 * GET /api/v3/messages/unread/:userId
 * 获取与特定用户的未读消息数量
 */
router.get('/unread/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const senderId = req.params.userId;
    const count = await getUnreadCountWithUser(userId, senderId);

    res.json({
      success: true,
      data: {
        count,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/messages/unread/:userId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取未读消息数量失败',
    });
  }
});

/**
 * GET /api/v3/messages/search
 * 搜索消息
 * 
 * 查询参数：
 * - keyword: 搜索关键词
 * - limit: 返回数量（默认50）
 * - offset: 偏移量（默认0）
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyword = req.query.keyword;
    const limit = validateInt(req.query.limit, { min: 1, max: 100, defaultValue: 50 });
    const offset = validateInt(req.query.offset, { min: 0, defaultValue: 0 });

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词',
      });
    }

    const messages = await searchMessages(userId, keyword, { limit, offset });

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error('GET /api/v3/messages/search error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '搜索消息失败',
    });
  }
});

export default router;

