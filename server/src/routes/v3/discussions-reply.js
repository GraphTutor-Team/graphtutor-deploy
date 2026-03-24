/**
 * GraphTutor V3.0 - 讨论回复API路由
 * 
 * 路径：/api/v3/discussions/:id/replies
 * 功能：处理讨论回复的点赞、标记最佳答案等
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import DiscussionReply from '../../models/DiscussionReply.js';
import Discussion from '../../models/Discussion.js';
import User from '../../models/User.js';

const router = express.Router({ mergeParams: true });

/**
 * PUT /api/v3/discussions/:id/replies/:replyId/like
 * 点赞回复
 */
router.put('/:replyId/like', requireAuth, async (req, res) => {
  try {
    const { replyId } = req.params;

    const reply = await DiscussionReply.findByIdAndUpdate(
      replyId,
      { $inc: { likeCount: 1 } },
      { new: true }
    ).lean();

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: '回复不存在',
      });
    }

    res.json({
      success: true,
      data: reply,
    });
  } catch (err) {
    console.error('PUT /api/v3/discussions/:id/replies/:replyId/like error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '点赞失败',
    });
  }
});

/**
 * PUT /api/v3/discussions/:id/replies/:replyId/best-answer
 * 标记为最佳答案（仅讨论创建者可以）
 */
router.put('/:replyId/best-answer', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, replyId } = req.params;

    // 检查讨论是否存在且是当前用户创建的
    const discussion = await Discussion.findById(id).lean();
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在',
      });
    }

    if (discussion.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有讨论创建者可以标记最佳答案',
      });
    }

    // 取消其他回复的最佳答案标记
    await DiscussionReply.updateMany(
      { discussionId: id, _id: { $ne: replyId } },
      { $set: { isBestAnswer: false } }
    );

    // 标记当前回复为最佳答案
    const reply = await DiscussionReply.findByIdAndUpdate(
      replyId,
      { $set: { isBestAnswer: true } },
      { new: true }
    ).lean();

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: '回复不存在',
      });
    }

    // 悬赏积分转给回答者（采纳后）
    const bountyPoints = Math.max(0, discussion.bountyPoints || 0);
    if (bountyPoints > 0 && reply.userId) {
      await User.findByIdAndUpdate(reply.userId, { $inc: { points: bountyPoints } });
      await Discussion.findByIdAndUpdate(id, { $set: { bountyPoints: 0 } });
    }

    // 标记讨论为已解决
    await Discussion.findByIdAndUpdate(id, { $set: { isResolved: true } });

    res.json({
      success: true,
      data: { ...reply, awardedPoints: bountyPoints },
    });
  } catch (err) {
    console.error('PUT /api/v3/discussions/:id/replies/:replyId/best-answer error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '标记最佳答案失败',
    });
  }
});

export default router;

