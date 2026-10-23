/**
 * GraphTutor V3.0 - 智能推荐API
 * 
 * 路径：/api/v3/recommendations
 * 功能：提供智能题目推荐功能
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { assertBankQuestionAccess } from '../../services/contentAccess.js';
import {
  getRecommendedQuestions,
  getRecommendationReason,
} from '../../services/questionRecommendation.js';

const router = express.Router();

/**
 * GET /api/v3/recommendations/questions
 * 获取推荐的题目列表
 */
router.get('/questions', requireAuth, async (req, res) => {
  const sendEmpty = (message) => res.json({
    success: true,
    data: [],
    count: 0,
    message: message || '推荐服务暂不可用，已返回空列表',
  });

  try {
    const userId = req.user.id;
    const {
      limit = 10,
      subjectCode,
      bankId,
      strategy = 'adaptive',
      questionId,
      knowledgeNodeId,
      includeReasons = 'true',
    } = req.query;

    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    if (bankId) await assertBankQuestionAccess(userId, bankId);
    const questions = await Promise.race([
      getRecommendedQuestions(userId, {
        limit: limitNum,
        subjectCode,
        bankId,
        strategy,
        questionId,
        knowledgeNodeId,
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('recommendations timeout')), 12000);
      }),
    ]);

    const needReasons = includeReasons !== 'false' && includeReasons !== '0';
    const questionsWithReasons = needReasons
      ? await Promise.all(
          questions.map(async (q) => {
            try {
              const reason = await getRecommendationReason(userId, q._id?.toString() || q.id);
              return { ...q, recommendationReason: reason };
            } catch {
              return { ...q, recommendationReason: null };
            }
          })
        )
      : questions.map((q) => ({ ...q, recommendationReason: null }));

    res.json({
      success: true,
      data: questionsWithReasons,
      count: questionsWithReasons.length,
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
        pricePoints: err.pricePoints,
      });
    }
    console.error('GET /api/v3/recommendations/questions error:', err);
    sendEmpty('推荐服务暂不可用，已返回空列表');
  }
});

/**
 * GET /api/v3/recommendations/reason/:questionId
 * 获取题目的推荐理由
 */
router.get('/reason/:questionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;

    const reason = await getRecommendationReason(userId, questionId);

    res.json({
      success: true,
      data: {
        questionId,
        reason,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/recommendations/reason/:questionId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取推荐理由失败',
    });
  }
});

export default router;

