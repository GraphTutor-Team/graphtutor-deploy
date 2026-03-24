/**
 * GraphTutor V3.0 - 通知API路由
 * 
 * 路径：/api/v3/notifications
 * 功能：提供通知的CRUD操作
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteNotifications,
} from '../../services/notificationService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/notifications
 * 获取用户通知列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page,
      limit,
      type,
      isRead,
      priority,
    } = req.query;

    const result = await getUserNotifications(userId, {
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      type: type || null,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : null,
      priority: priority ? parseInt(priority, 10) : null,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/notifications error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取通知失败',
    });
  }
});

/**
 * GET /api/v3/notifications/unread-count
 * 获取未读通知数量
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (err) {
    console.error('GET /api/v3/notifications/unread-count error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取未读数量失败',
    });
  }
});

/**
 * PUT /api/v3/notifications/:id/read
 * 标记通知为已读
 */
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await markAsRead(id, userId);

    res.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    console.error('PUT /api/v3/notifications/:id/read error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '标记已读失败',
    });
  }
});

/**
 * PUT /api/v3/notifications/read-all
 * 标记所有通知为已读
 */
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;

    const result = await markAllAsRead(userId, type || null);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (err) {
    console.error('PUT /api/v3/notifications/read-all error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '标记全部已读失败',
    });
  }
});

/**
 * DELETE /api/v3/notifications/:id
 * 删除通知
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await deleteNotification(id, userId);

    res.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    console.error('DELETE /api/v3/notifications/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除通知失败',
    });
  }
});

/**
 * DELETE /api/v3/notifications
 * 批量删除通知
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的通知ID列表',
      });
    }

    const result = await deleteNotifications(ids, userId);

    res.json({
      success: true,
      data: {
        deletedCount: result.modifiedCount,
      },
    });
  } catch (err) {
    console.error('DELETE /api/v3/notifications error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量删除失败',
    });
  }
});

export default router;

