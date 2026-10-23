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
import { attachAuthors, withLikedByMe } from '../../utils/discussionHelpers.js';

const router = express.Router({ mergeParams: true });

/**
 * PUT /api/v3/discussions/:id/replies/:replyId/like
 * 点赞 / 取消点赞回复
 */
router.put('/:replyId/like', requireAuth, async (req, res) => {
  try {
    const { replyId } = req.params;
    const userId = String(req.user.id);

    const reply = await DiscussionReply.findById(replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: '回复不存在',
      });
    }

    const likedBy = (reply.likedBy || []).map(String);
    const alreadyLiked = likedBy.includes(userId);

    let updated;
    if (alreadyLiked) {
      updated = await DiscussionReply.findByIdAndUpdate(
        replyId,
        { $pull: { likedBy: userId }, $inc: { likeCount: -1 } },
        { new: true }
      ).lean();
      if (updated && updated.likeCount < 0) {
        updated.likeCount = 0;
        await DiscussionReply.findByIdAndUpdate(replyId, { $set: { likeCount: 0 } });
      }
    } else {
      updated = await DiscussionReply.findByIdAndUpdate(
        replyId,
        { $addToSet: { likedBy: userId }, $inc: { likeCount: 1 } },
        { new: true }
      ).lean();
    }

    const [withAuthor] = await attachAuthors([updated]);

    res.json({
      success: true,
      data: withLikedByMe(withAuthor, userId),
      message: alreadyLiked ? '已取消点赞' : '点赞成功',
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

    if (discussion.bountyStatus === 'awarded') {
      return res.status(400).json({
        success: false,
        message: '悬赏已经发放，不能再改最佳答案',
      });
    }

    const replyDoc = await DiscussionReply.findOne({ _id: replyId, discussionId: id }).lean();
    if (!replyDoc) {
      return res.status(404).json({
        success: false,
        message: '回复不存在',
      });
    }

    const bountyPoints = Math.max(0, discussion.bountyPoints || 0);
    const bountyOpen = bountyPoints > 0 && discussion.bountyStatus !== 'awarded' && !discussion.isResolved;
    if (bountyOpen && String(replyDoc.userId || '') === String(discussion.userId)) {
      return res.status(400).json({
        success: false,
        message: '不能把悬赏发给自己',
      });
    }

    // 取消其他回复的最佳答案标记
    await DiscussionReply.updateMany(
      { discussionId: id, _id: { $ne: replyId } },
      { $set: { isBestAnswer: false } }
    );

    const reply = await DiscussionReply.findByIdAndUpdate(
      replyId,
      { $set: { isBestAnswer: true } },
      { new: true }
    ).lean();

    let awardedPoints = 0;
    if (bountyOpen && reply.userId) {
      const claimed = await Discussion.findOneAndUpdate(
        {
          _id: id,
          bountyPoints: { $gt: 0 },
          isResolved: { $ne: true },
          bountyStatus: { $ne: 'awarded' },
        },
        {
          $set: {
            bountyStatus: 'awarded',
            bountyAwardedTo: String(reply.userId),
            isResolved: true,
          },
        },
      );
      if (claimed) {
        awardedPoints = bountyPoints;
        await User.findByIdAndUpdate(reply.userId, { $inc: { points: bountyPoints } });
      }
    } else {
      await Discussion.findByIdAndUpdate(id, { $set: { isResolved: true } });
    }

    res.json({
      success: true,
      data: { ...reply, awardedPoints },
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

