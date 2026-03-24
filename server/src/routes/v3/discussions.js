/**
 * GraphTutor V3.0 - 讨论区API路由
 * 
 * 路径：/api/v3/discussions
 * 功能：提供讨论区的CRUD操作
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import Discussion from '../../models/Discussion.js';
import DiscussionReply from '../../models/DiscussionReply.js';
import User from '../../models/User.js';
import { createReplyNotification } from '../../services/notificationService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/discussions
 * 获取讨论列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      type,
      questionId,
      knowledgeNodeId,
      searchKeyword,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (questionId) query.questionId = questionId;
    if (knowledgeNodeId) query.knowledgeNodeId = knowledgeNodeId;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // 文本搜索
    if (searchKeyword && searchKeyword.trim()) {
      query.$text = { $search: searchKeyword.trim() };
    }
    if (req.query.bountyOnly === 'true') {
      query.bountyPoints = { $gt: 0 };
    }

    const skip = (validateInt(page, { min: 1, defaultValue: 1 }) - 1) * validateInt(limit, { min: 1, max: 100, defaultValue: 20 });
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    if (searchKeyword && searchKeyword.trim()) {
      sort.score = { $meta: 'textScore' };
    }
    if (req.query.sortBy === 'bountyPoints') {
      sort.bountyPoints = -1;
    }

    // 置顶优先
    const finalSort = { isPinned: -1, ...sort };

    const [items, total] = await Promise.all([
      Discussion.find(query)
        .sort(finalSort)
        .skip(skip)
        .limit(validateInt(limit, { min: 1, max: 100, defaultValue: 20 }))
        .lean(),
      Discussion.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: validateInt(page, { min: 1, defaultValue: 1 }),
        limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
        totalPages: Math.ceil(total / validateInt(limit, { min: 1, max: 100, defaultValue: 20 })),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/discussions error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取讨论列表失败',
    });
  }
});

/**
 * POST /api/v3/discussions
 * 创建讨论
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, questionId, knowledgeNodeId, title, content, tags, bountyPoints: rawBounty } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: '标题不能为空',
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '内容不能为空',
      });
    }

    const bountyPoints = Math.min(1000, Math.max(0, parseInt(rawBounty, 10) || 0));
    if (bountyPoints > 0) {
      const user = await User.findById(userId).select('points').lean();
      const currentPoints = user?.points ?? 100;
      if (currentPoints < bountyPoints) {
        return res.status(400).json({
          success: false,
          message: `积分不足，当前 ${currentPoints}，需要 ${bountyPoints}`,
        });
      }
      const newPoints = Math.max(0, currentPoints - bountyPoints);
      await User.findByIdAndUpdate(userId, { $set: { points: newPoints } });
    }

    const discussion = await Discussion.create({
      userId,
      type: type || 'general',
      questionId: questionId || undefined,
      knowledgeNodeId: knowledgeNodeId || undefined,
      title: title.trim(),
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []),
      bountyPoints,
    });

    res.json({
      success: true,
      data: discussion,
    });
  } catch (err) {
    console.error('POST /api/v3/discussions error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建讨论失败',
    });
  }
});

/**
 * GET /api/v3/discussions/:id
 * 获取讨论详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const discussion = await Discussion.findById(id).lean();
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在',
      });
    }

    // 增加浏览次数
    await Discussion.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    // 获取回复
    const replies = await DiscussionReply.find({ discussionId: id })
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        ...discussion,
        replies,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/discussions/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取讨论详情失败',
    });
  }
});

/**
 * POST /api/v3/discussions/:id/replies
 * 添加回复
 */
router.post('/:id/replies', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content, parentReplyId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '回复内容不能为空',
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在',
      });
    }

    const reply = await DiscussionReply.create({
      discussionId: id,
      userId,
      content: content.trim(),
      parentReplyId: parentReplyId || null,
    });

    // 更新讨论的回复数和最后回复时间
    const updatedDiscussion = await Discussion.findByIdAndUpdate(
      id,
      {
        $inc: { replyCount: 1 },
        $set: { lastReplyAt: new Date() },
      },
      { new: true }
    ).lean();

    // 如果回复的不是讨论创建者，发送通知
    if (updatedDiscussion && updatedDiscussion.userId !== userId) {
      try {
        await createReplyNotification(updatedDiscussion.userId, updatedDiscussion, reply);
      } catch (err) {
        console.error('创建回复通知失败:', err);
        // 不阻塞主流程
      }
    }

    res.json({
      success: true,
      data: reply,
    });
  } catch (err) {
    console.error('POST /api/v3/discussions/:id/replies error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '添加回复失败',
    });
  }
});

/**
 * PUT /api/v3/discussions/:id/like
 * 点赞讨论
 */
router.put('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const discussion = await Discussion.findByIdAndUpdate(
      id,
      { $inc: { likeCount: 1 } },
      { new: true }
    ).lean();

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在',
      });
    }

    res.json({
      success: true,
      data: discussion,
    });
  } catch (err) {
    console.error('PUT /api/v3/discussions/:id/like error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '点赞失败',
    });
  }
});

// 回复相关路由（需要先导入）
import discussionsReplyRouter from './discussions-reply.js';
router.use('/:id/replies', discussionsReplyRouter);

export default router;

