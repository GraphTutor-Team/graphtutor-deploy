/**
 * GraphTutor V3.0 - 学习动态API路由
 * 
 * 路径：/api/v3/learning-posts
 * 功能：提供学习动态的CRUD操作
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createLearningPost,
  getLearningPosts,
  getLearningPostById,
  toggleLikePost,
  sharePost,
  deleteLearningPost,
  createComment,
  getComments,
  toggleLikeComment,
  deleteComment,
} from '../../services/learningPostService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/v3/learning-posts
 * 创建学习动态
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const post = await createLearningPost(userId, req.body);

    res.json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error('POST /api/v3/learning-posts error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建动态失败',
    });
  }
});

/**
 * GET /api/v3/learning-posts
 * 获取动态列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page,
      limit,
      type,
      visibility,
      authorId,
    } = req.query;

    const result = await getLearningPosts(userId, {
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      type: type || null,
      visibility: visibility || null,
      authorId: authorId || null,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/learning-posts error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取动态列表失败',
    });
  }
});

/**
 * GET /api/v3/learning-posts/:id
 * 获取动态详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await getLearningPostById(postId, userId);

    res.json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error('GET /api/v3/learning-posts/:id error:', err);
    res.status(err.message === '动态不存在' ? 404 : err.message === '无权查看此动态' ? 403 : 500).json({
      success: false,
      message: err.message || '获取动态详情失败',
    });
  }
});

/**
 * PUT /api/v3/learning-posts/:id/like
 * 点赞/取消点赞动态
 */
router.put('/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await toggleLikePost(postId, userId);

    res.json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error('PUT /api/v3/learning-posts/:id/like error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '操作失败',
    });
  }
});

/**
 * POST /api/v3/learning-posts/:id/share
 * 分享动态
 */
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await sharePost(postId);

    res.json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error('POST /api/v3/learning-posts/:id/share error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '分享失败',
    });
  }
});

/**
 * DELETE /api/v3/learning-posts/:id
 * 删除动态
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    await deleteLearningPost(postId, userId);

    res.json({
      success: true,
      message: '动态已删除',
    });
  } catch (err) {
    console.error('DELETE /api/v3/learning-posts/:id error:', err);
    res.status(err.message === '动态不存在' ? 404 : err.message === '无权删除此动态' ? 403 : 500).json({
      success: false,
      message: err.message || '删除动态失败',
    });
  }
});

/**
 * POST /api/v3/learning-posts/:id/comments
 * 创建评论
 */
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空',
      });
    }

    const comment = await createComment(postId, userId, {
      content: content.trim(),
      parentId: parentId || null,
    });

    res.json({
      success: true,
      data: comment,
    });
  } catch (err) {
    console.error('POST /api/v3/learning-posts/:id/comments error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建评论失败',
    });
  }
});

/**
 * GET /api/v3/learning-posts/:id/comments
 * 获取评论列表
 */
router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const { page, limit } = req.query;

    const result = await getComments(postId, {
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/learning-posts/:id/comments error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取评论列表失败',
    });
  }
});

/**
 * PUT /api/v3/learning-posts/comments/:commentId/like
 * 点赞/取消点赞评论
 */
router.put('/comments/:commentId/like', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const commentId = req.params.commentId;

    const comment = await toggleLikeComment(commentId, userId);

    res.json({
      success: true,
      data: comment,
    });
  } catch (err) {
    console.error('PUT /api/v3/learning-posts/comments/:commentId/like error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '操作失败',
    });
  }
});

/**
 * DELETE /api/v3/learning-posts/comments/:commentId
 * 删除评论
 */
router.delete('/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const commentId = req.params.commentId;

    await deleteComment(commentId, userId);

    res.json({
      success: true,
      message: '评论已删除',
    });
  } catch (err) {
    console.error('DELETE /api/v3/learning-posts/comments/:commentId error:', err);
    res.status(err.message === '评论不存在' ? 404 : err.message === '无权删除此评论' ? 403 : 500).json({
      success: false,
      message: err.message || '删除评论失败',
    });
  }
});

export default router;

