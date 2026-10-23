/**
 * GraphTutor V3.0 - 笔记API路由
 * 
 * 路径：/api/v3/notes
 * 功能：提供笔记的CRUD操作、搜索、分享等功能
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createNote,
  updateNote,
  deleteNote,
  getNoteDetail,
  searchNotes,
  getUserNotes,
  getQuestionNote,
  getKnowledgeNotes,
  likeNote,
  unlikeNote,
  favoriteNote,
  unfavoriteNote,
  isNoteFavorited,
  getFavoriteNotes,
  generateShareLink,
  getNoteByShareToken,
  getNoteStats,
  exportNoteAsMarkdown,
  exportNotesAsMarkdown,
} from '../../services/noteService.js';
import { recommendRelatedNotes } from '../../services/contentRecommendation.js';
import Note from '../../models/Note.js';
import { validateInt } from '../../middleware/validation.js';
import { priceOf, purchaseContent, redactLockedNote } from '../../services/contentAccess.js';
import { sanitizeString } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/notes/stats
 * 获取笔记统计
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getNoteStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/notes/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取统计失败',
    });
  }
});

/**
 * GET /api/v3/notes
 * 获取笔记列表（支持搜索）
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      searchKeyword,
      type,
      questionId,
      knowledgeNodeId,
      tags,
      isPublic,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const options = {
      type,
      questionId,
      knowledgeNodeId,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };

    const result = await searchNotes(userId, searchKeyword, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/notes error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取笔记列表失败',
    });
  }
});

/**
 * GET /api/v3/notes/public
 * 获取公开笔记列表
 */
router.get('/public', async (req, res) => {
  try {
    const {
      searchKeyword,
      tags,
      type,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const options = {
      searchKeyword,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      type,
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };

    const result = await Note.getPublicNotes(options);
    if (Array.isArray(result?.items)) {
      result.items = result.items.map((note) => (
        priceOf(note) > 0 ? redactLockedNote(note) : note
      ));
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/notes/public error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取公开笔记失败',
    });
  }
});

/**
 * GET /api/v3/notes/question/:questionId
 * 获取题目的笔记
 */
router.get('/question/:questionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;

    const note = await getQuestionNote(userId, questionId);

    res.json({
      success: true,
      data: note,
    });
  } catch (err) {
    console.error('GET /api/v3/notes/question/:questionId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取笔记失败',
    });
  }
});

/**
 * GET /api/v3/notes/knowledge/:knowledgeNodeId
 * 获取知识点的笔记列表
 */
router.get('/knowledge/:knowledgeNodeId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { knowledgeNodeId } = req.params;

    const notes = await getKnowledgeNotes(userId, knowledgeNodeId);

    res.json({
      success: true,
      data: notes,
    });
  } catch (err) {
    console.error('GET /api/v3/notes/knowledge/:knowledgeNodeId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取笔记失败',
    });
  }
});

/**
 * GET /api/v3/notes/favorites
 * 必须写在 /:id 前面，否则 favorites 会被当成笔记编号。
 */
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const options = {
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };

    const result = await getFavoriteNotes(userId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/notes/favorites error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取收藏笔记失败',
    });
  }
});

/**
 * GET /api/v3/notes/:id
 * 获取笔记详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const note = await getNoteDetail(id, userId);

    res.json({
      success: true,
      data: note,
    });
  } catch (err) {
    console.error('GET /api/v3/notes/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取笔记失败',
    });
  }
});

/**
 * POST /api/v3/notes
 * 创建笔记
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, questionId, knowledgeNodeId, title, content, summary, tags, isPublic, images, attachments, pricePoints } = req.body;

    if (!type || !['question', 'knowledge', 'general'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '笔记类型无效',
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: '笔记标题不能为空',
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '笔记内容不能为空',
      });
    }

    const note = await createNote(userId, {
      type,
      questionId,
      knowledgeNodeId,
      title: sanitizeString(title, { maxLength: 200 }),
      content: sanitizeString(content, { maxLength: 50000 }),
      summary: summary != null ? sanitizeString(String(summary), { maxLength: 500 }) : undefined,
      tags: Array.isArray(tags) ? tags.map(t => sanitizeString(t, { maxLength: 50 })).filter(Boolean) : [],
      isPublic: isPublic || false,
      pricePoints: validateInt(pricePoints, { min: 0, max: 100000, defaultValue: 0 }) || 0,
      images: Array.isArray(images) ? images : [],
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    res.status(201).json({
      success: true,
      data: note,
    });
  } catch (err) {
    console.error('POST /api/v3/notes error:', err);
    if (err.message === '该题目已有笔记，请编辑现有笔记') {
      return res.status(409).json({
        success: false,
        message: err.message,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || '创建笔记失败',
    });
  }
});

/**
 * POST /api/v3/notes/:id/purchase
 * 用积分解锁笔记正文。作者不需要购买。
 */
router.post('/:id/purchase', requireAuth, async (req, res) => {
  try {
    const result = await purchaseContent(req.user.id, 'note', req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error('POST /api/v3/notes/:id/purchase error:', err);
    res.status(status).json({ success: false, message: err.message || '解锁失败' });
  }
});

/**
 * PUT /api/v3/notes/:id
 * 更新笔记
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content, tags, isPublic, summary, images, attachments, pricePoints } = req.body;

    const updates = {};
    if (title !== undefined) {
      updates.title = sanitizeString(title, { maxLength: 200 });
    }
    if (content !== undefined) {
      updates.content = sanitizeString(content, { maxLength: 50000 });
    }
    if (tags !== undefined) {
      updates.tags = Array.isArray(tags)
        ? tags.map(t => sanitizeString(t, { maxLength: 50 })).filter(Boolean)
        : [];
    }
    if (isPublic !== undefined) {
      updates.isPublic = isPublic;
    }
    if (pricePoints !== undefined) {
      updates.pricePoints = validateInt(pricePoints, { min: 0, max: 100000, defaultValue: 0 }) || 0;
    }
    if (summary !== undefined) {
      updates.summary = sanitizeString(summary, { maxLength: 500, allowEmpty: true });
    }
    if (images !== undefined) {
      updates.images = Array.isArray(images) ? images : [];
    }
    if (attachments !== undefined) {
      updates.attachments = Array.isArray(attachments) ? attachments : [];
    }

    const note = await updateNote(userId, id, updates);

    res.json({
      success: true,
      data: note,
    });
  } catch (err) {
    console.error('PUT /api/v3/notes/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新笔记失败',
    });
  }
});

/**
 * DELETE /api/v3/notes/:id
 * 删除笔记
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await deleteNote(userId, id);

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/notes/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除笔记失败',
    });
  }
});

/**
 * POST /api/v3/notes/:id/like
 * 点赞笔记
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await likeNote(userId, id);

    res.json({
      success: true,
      message: '点赞成功',
    });
  } catch (err) {
    console.error('POST /api/v3/notes/:id/like error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '点赞失败',
    });
  }
});

/**
 * DELETE /api/v3/notes/:id/like
 * 取消点赞
 */
router.delete('/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await unlikeNote(userId, id);

    res.json({
      success: true,
      message: '取消点赞成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/notes/:id/like error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '取消点赞失败',
    });
  }
});

/**
 * POST /api/v3/notes/:id/favorite
 * 收藏笔记
 */
router.post('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await favoriteNote(userId, id);

    res.json({
      success: true,
      message: '收藏成功',
    });
  } catch (err) {
    console.error('POST /api/v3/notes/:id/favorite error:', err);
    if (err.message === '已收藏') {
      return res.status(409).json({
        success: false,
        message: err.message,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || '收藏失败',
    });
  }
});

/**
 * DELETE /api/v3/notes/:id/favorite
 * 取消收藏笔记
 */
router.delete('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await unfavoriteNote(userId, id);

    res.json({
      success: true,
      message: '取消收藏成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/notes/:id/favorite error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '取消收藏失败',
    });
  }
});

/**
 * GET /api/v3/notes/:id/favorite/check
 * 检查用户是否已收藏笔记
 */
router.get('/:id/favorite/check', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const isFavorited = await isNoteFavorited(userId, id);

    res.json({
      success: true,
      data: { isFavorited },
    });
  } catch (err) {
    console.error('GET /api/v3/notes/:id/favorite/check error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '检查失败',
    });
  }
});

/**
 * POST /api/v3/notes/:id/share
 * 生成分享链接
 */
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const shareInfo = await generateShareLink(userId, id);

    res.json({
      success: true,
      data: shareInfo,
    });
  } catch (err) {
    console.error('POST /api/v3/notes/:id/share error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '生成分享链接失败',
    });
  }
});

/**
 * GET /api/v3/notes/share/:token
 * 通过分享token获取笔记
 */
router.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id || null;

    const note = await getNoteByShareToken(token);

    // 如果用户已登录，检查点赞和收藏状态
    if (userId) {
      const NoteLike = (await import('../../models/NoteLike.js')).default;
      const NoteFavorite = (await import('../../models/NoteFavorite.js')).default;
      
      const [like, favorite] = await Promise.all([
        NoteLike.findOne({ userId, noteId: note._id }),
        NoteFavorite.findOne({ userId, noteId: note._id }),
      ]);

      note.isLiked = !!like;
      note.isFavorited = !!favorite;
    } else {
      note.isLiked = false;
      note.isFavorited = false;
    }

    res.json({
      success: true,
      data: note,
    });
  } catch (err) {
    console.error('GET /api/v3/notes/share/:token error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取分享笔记失败',
    });
  }
});

/**
 * GET /api/v3/notes/:id/export/markdown
 * 导出笔记为Markdown
 */
router.get('/:id/export/markdown', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { markdown, filename } = await exportNoteAsMarkdown(id, userId);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send(markdown);
  } catch (err) {
    console.error('GET /api/v3/notes/:id/export/markdown error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '导出失败',
    });
  }
});

/**
 * POST /api/v3/notes/export/markdown
 * 批量导出笔记为Markdown
 */
router.post('/export/markdown', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { noteIds } = req.body;

    const markdown = await exportNotesAsMarkdown(userId, noteIds);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="notes-${Date.now()}.md"`);
    res.send(markdown);
  } catch (err) {
    console.error('POST /api/v3/notes/export/markdown error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '导出失败',
    });
  }
});

export default router;

