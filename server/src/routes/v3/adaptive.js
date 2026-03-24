/**
 * GraphTutor V3.0 - 自适应学习引擎 API
 *
 * 路径：/api/v3/adaptive
 * 功能：个性化路径生成（MVP）
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { generatePersonalizedPath } from '../../services/adaptiveLearningService.js';
import { sanitizeString } from '../../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/v3/adaptive/personalized-path
 * 根据用户目标生成个性化学习计划（每日知识点 + 题量），并创建学习计划与任务
 * body: { goalText?, targetDays?, preset? }  preset: 考研|考公|留学|四六级
 */
router.post('/personalized-path', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalText = sanitizeString(req.body?.goalText, { maxLength: 300, allowEmpty: true });
    const targetDays = Math.max(1, Math.min(30, parseInt(req.body?.targetDays, 10) || 7));
    const preset = ['考研', '考公', '留学', '四六级'].includes(req.body?.preset) ? req.body.preset : null;

    const result = await generatePersonalizedPath(userId, {
      goalText: goalText || undefined,
      targetDays,
      preset: preset || undefined,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: '个性化学习计划已生成',
    });
  } catch (err) {
    console.error('POST /api/v3/adaptive/personalized-path error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '生成个性化路径失败',
    });
  }
});

export default router;
