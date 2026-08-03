/**
 * GraphTutor V3.0 - 好友API路由
 * 
 * 路径：/api/v3/friends
 * 功能：提供好友管理、好友请求、好友发现等功能
 * 关联文件：
 *   - services/friendService.js (好友业务逻辑)
 *   - models/FriendRequest.js (好友请求模型)
 *   - models/Friendship.js (好友关系模型)
 * 技术栈：
 *   - Express Router
 *   - 认证中间件
 *   - 数据验证
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriendsList,
  getFriendRequests,
  deleteFriend,
  blockFriend,
  areFriends,
  getMutualFriends,
  searchUsers,
  getRecommendedFriends,
  getFriendLearningStats,
  compareLearningData,
  getCommonLearningContent,
  getFriendsLeaderboard,
  getPublicUserProfile,
} from '../../services/friendService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/friends
 * 获取好友列表
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - status: 状态（active/blocked，默认active）
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = validateInt(req.query.page, 1);
    const limit = validateInt(req.query.limit, 20);
    const status = req.query.status || 'active';

    const result = await getFriendsList(userId, { page, limit, status });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/friends error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取好友列表失败',
    });
  }
});

/**
 * GET /api/v3/friends/requests
 * 获取好友请求列表
 * 
 * 查询参数：
 * - type: 类型（received/sent，默认received）
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - status: 状态（pending/accepted/rejected/cancelled，默认pending）
 */
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const type = req.query.type || 'received';
    const page = validateInt(req.query.page, 1);
    const limit = validateInt(req.query.limit, 20);
    const status = req.query.status || 'pending';

    const result = await getFriendRequests(userId, type, { page, limit, status });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/friends/requests error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取好友请求失败',
    });
  }
});

/**
 * POST /api/v3/friends/requests
 * 发送好友请求
 * 
 * Body:
 * - toUserId: 接收者ID（必填）
 * - message: 请求消息（可选）
 */
router.post('/requests', requireAuth, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, message } = req.body;

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: '请指定接收者ID',
      });
    }

    const request = await sendFriendRequest(fromUserId, toUserId, message);

    res.json({
      success: true,
      data: request,
      message: '好友请求已发送',
    });
  } catch (err) {
    console.error('POST /api/v3/friends/requests error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '发送好友请求失败',
    });
  }
});

/**
 * PUT /api/v3/friends/requests/:id/accept
 * 接受好友请求
 */
router.put('/requests/:id/accept', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.id;

    const result = await acceptFriendRequest(requestId, userId);

    res.json({
      success: true,
      data: result,
      message: '好友请求已接受',
    });
  } catch (err) {
    console.error('PUT /api/v3/friends/requests/:id/accept error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '接受好友请求失败',
    });
  }
});

/**
 * PUT /api/v3/friends/requests/:id/reject
 * 拒绝好友请求
 */
router.put('/requests/:id/reject', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.id;

    const request = await rejectFriendRequest(requestId, userId);

    res.json({
      success: true,
      data: request,
      message: '好友请求已拒绝',
    });
  } catch (err) {
    console.error('PUT /api/v3/friends/requests/:id/reject error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '拒绝好友请求失败',
    });
  }
});

/**
 * DELETE /api/v3/friends/requests/:id
 * 取消好友请求
 */
router.delete('/requests/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.id;

    const request = await cancelFriendRequest(requestId, userId);

    res.json({
      success: true,
      data: request,
      message: '好友请求已取消',
    });
  } catch (err) {
    console.error('DELETE /api/v3/friends/requests/:id error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '取消好友请求失败',
    });
  }
});

/**
 * DELETE /api/v3/friends/:id
 * 删除好友
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;

    await deleteFriend(userId, friendId);

    res.json({
      success: true,
      message: '好友已删除',
    });
  } catch (err) {
    console.error('DELETE /api/v3/friends/:id error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '删除好友失败',
    });
  }
});

/**
 * PUT /api/v3/friends/:id/block
 * 屏蔽好友
 */
router.put('/:id/block', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;

    const friendship = await blockFriend(userId, friendId);

    res.json({
      success: true,
      data: friendship,
      message: '好友已屏蔽',
    });
  } catch (err) {
    console.error('PUT /api/v3/friends/:id/block error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '屏蔽好友失败',
    });
  }
});

/**
 * GET /api/v3/friends/mutual/:userId
 * 获取共同好友
 */
router.get('/mutual/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.userId;

    const mutualFriends = await getMutualFriends(userId, targetUserId);

    res.json({
      success: true,
      data: {
        items: mutualFriends,
        total: mutualFriends.length,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/friends/mutual/:userId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取共同好友失败',
    });
  }
});

/**
 * GET /api/v3/friends/check/:userId
 * 检查是否是好友
 */
router.get('/check/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.userId;

    const isFriend = await areFriends(userId, targetUserId);

    res.json({
      success: true,
      data: { isFriend },
    });
  } catch (err) {
    console.error('GET /api/v3/friends/check/:userId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '检查好友关系失败',
    });
  }
});

/**
 * GET /api/v3/friends/profile/:userId
 * 获取用户公开资料
 */
router.get('/profile/:userId', requireAuth, async (req, res) => {
  try {
    const profile = await getPublicUserProfile(req.user.id, req.params.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('GET /api/v3/friends/profile/:userId error:', err);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || '获取用户资料失败',
    });
  }
});

/**
 * GET /api/v3/friends/search
 * 搜索用户（好友发现）
 * 
 * 查询参数：
 * - keyword: 搜索关键词（必填）
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyword = req.query.keyword;
    const page = validateInt(req.query.page, 1);
    const limit = validateInt(req.query.limit, 20);

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词',
      });
    }

    const result = await searchUsers(userId, keyword, { page, limit });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/friends/search error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '搜索用户失败',
    });
  }
});

/**
 * GET /api/v3/friends/recommendations
 * 获取推荐好友
 * 
 * 查询参数：
 * - limit: 返回数量（默认10）
 */
router.get('/recommendations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = validateInt(req.query.limit, 10);

    const recommendations = await getRecommendedFriends(userId, { limit });

    res.json({
      success: true,
      data: {
        items: recommendations,
        total: recommendations.length,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/friends/recommendations error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取推荐好友失败',
    });
  }
});

/**
 * GET /api/v3/friends/:id/stats
 * 获取好友学习统计
 * 
 * 查询参数：
 * - days: 统计天数（默认30）
 */
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;
    const days = validateInt(req.query.days, 30);

    const stats = await getFriendLearningStats(userId, friendId, { days });

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/friends/:id/stats error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '获取好友学习统计失败',
    });
  }
});

/**
 * GET /api/v3/friends/:id/compare
 * 对比学习数据
 * 
 * 查询参数：
 * - days: 统计天数（默认30）
 */
router.get('/:id/compare', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;
    const days = validateInt(req.query.days, 30);

    const comparison = await compareLearningData(userId, friendId, { days });

    res.json({
      success: true,
      data: comparison,
    });
  } catch (err) {
    console.error('GET /api/v3/friends/:id/compare error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '对比学习数据失败',
    });
  }
});

/**
 * GET /api/v3/friends/:id/common
 * 获取共同学习内容
 * 
 * 查询参数：
 * - limit: 返回数量（默认20）
 */
router.get('/:id/common', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;
    const limit = validateInt(req.query.limit, 20);

    const commonContent = await getCommonLearningContent(userId, friendId, { limit });

    res.json({
      success: true,
      data: commonContent,
    });
  } catch (err) {
    console.error('GET /api/v3/friends/:id/common error:', err);
    res.status(400).json({
      success: false,
      message: err.message || '获取共同学习内容失败',
    });
  }
});

/**
 * GET /api/v3/friends/leaderboard
 * 获取好友排行榜
 * 
 * 查询参数：
 * - type: 排行类型（total/questions/accuracy，默认total）
 * - period: 时间范围（all/week/month，默认all）
 * - limit: 返回数量（默认50）
 */
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const type = req.query.type || 'total';
    const period = req.query.period || 'all';
    const limit = validateInt(req.query.limit, 50);

    const leaderboard = await getFriendsLeaderboard(userId, { type, period, limit });

    res.json({
      success: true,
      data: {
        type,
        period,
        items: leaderboard,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/friends/leaderboard error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取好友排行榜失败',
    });
  }
});

export default router;

