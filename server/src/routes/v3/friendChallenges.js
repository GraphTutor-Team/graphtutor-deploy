/**
 * GraphTutor V3.0 - 好友挑战API路由
 * 
 * 路径：/api/v3/friend-challenges
 * 功能：提供好友挑战的CRUD操作
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createFriendChallenge,
  acceptChallenge,
  cancelChallenge,
  getUserChallenges,
  getChallengesBetweenUsers,
  updateChallengeProgress,
  getChallengeStats,
} from '../../services/friendChallengeService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/v3/friend-challenges
 * 创建好友挑战
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { participantId, ...challengeData } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: '参与者ID不能为空',
      });
    }

    const challenge = await createFriendChallenge(creatorId, participantId, challengeData);

    res.json({
      success: true,
      data: challenge,
    });
  } catch (err) {
    console.error('POST /api/v3/friend-challenges error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建挑战失败',
    });
  }
});

/**
 * GET /api/v3/friend-challenges
 * 获取用户的挑战列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page,
      limit,
      status,
      type,
    } = req.query;

    const result = await getUserChallenges(userId, {
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      status: status || null,
      type: type || null,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/friend-challenges error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取挑战列表失败',
    });
  }
});

/**
 * GET /api/v3/friend-challenges/stats
 * 获取挑战统计
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getChallengeStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/friend-challenges/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取挑战统计失败',
    });
  }
});

/**
 * GET /api/v3/friend-challenges/between/:userId
 * 获取两个用户之间的挑战
 */
router.get('/between/:userId', requireAuth, async (req, res) => {
  try {
    const userId1 = req.user.id;
    const userId2 = req.params.userId;

    const challenges = await getChallengesBetweenUsers(userId1, userId2);

    res.json({
      success: true,
      data: challenges,
    });
  } catch (err) {
    console.error('GET /api/v3/friend-challenges/between/:userId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取挑战失败',
    });
  }
});

/**
 * PUT /api/v3/friend-challenges/:id/accept
 * 接受挑战
 */
router.put('/:id/accept', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const challengeId = req.params.id;

    const challenge = await acceptChallenge(challengeId, userId);

    res.json({
      success: true,
      data: challenge,
    });
  } catch (err) {
    console.error('PUT /api/v3/friend-challenges/:id/accept error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '接受挑战失败',
    });
  }
});

/**
 * PUT /api/v3/friend-challenges/:id/cancel
 * 取消挑战
 */
router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const challengeId = req.params.id;

    const challenge = await cancelChallenge(challengeId, userId);

    res.json({
      success: true,
      data: challenge,
    });
  } catch (err) {
    console.error('PUT /api/v3/friend-challenges/:id/cancel error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '取消挑战失败',
    });
  }
});

/**
 * PUT /api/v3/friend-challenges/:id/progress
 * 更新挑战进度
 */
router.put('/:id/progress', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const challengeId = req.params.id;

    const challenge = await updateChallengeProgress(challengeId, userId);

    res.json({
      success: true,
      data: challenge,
    });
  } catch (err) {
    console.error('PUT /api/v3/friend-challenges/:id/progress error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新挑战进度失败',
    });
  }
});

import FriendChallenge from '../../models/FriendChallenge.js';

/**
 * GET /api/v3/friend-challenges/:id
 * 获取挑战详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const challengeId = req.params.id;

    const challenge = await FriendChallenge.findById(challengeId)
      .populate('creatorId', 'name email avatar')
      .populate('participantId', 'name email avatar')
      .populate('winner', 'name email')
      .lean();

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: '挑战不存在',
      });
    }

    // 验证用户是否有权限查看
    const isCreator = challenge.creatorId._id.toString() === userId;
    const isParticipant = challenge.participantId._id.toString() === userId;

    if (!isCreator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: '无权查看此挑战',
      });
    }

    res.json({
      success: true,
      data: challenge,
    });
  } catch (err) {
    console.error('GET /api/v3/friend-challenges/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取挑战详情失败',
    });
  }
});

export default router;

