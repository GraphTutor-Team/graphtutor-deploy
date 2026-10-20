/**
 * GraphTutor V3.0 - AI功能API路由
 * 
 * 路径：/api/v3/ai
 * 功能：提供AI题目生成、质量分析、学科分类等接口
 */

import express from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  generateQuestions,
  analyzeQuestion,
  classifySubject,
  generateExplanation,
  chatCompletion,
  generateNoteSummary,
} from '../../services/ai/openAIService.js';
import {
  createAITask,
  getTaskStatus,
  cancelTask,
  retryTask,
  getUserTasks,
} from '../../services/ai/taskQueue.js';
import { validateInt } from '../../middleware/validation.js';
import { createNotification } from '../../services/notificationService.js';

const router = express.Router();

/**
 * POST /api/v3/ai/generate-questions
 * 生成题目（同步或异步）
 * 
 * body: {
 *   subjectCode: string,
 *   subjectName: string,
 *   difficulty: number (1-5),
 *   count: number (1-20),
 *   knowledgePoint: string (可选),
 *   reference: string (可选),
 *   questionType: 'single'|'multiple'|'judge'|'fill'|'short'|'mixed',
 *   bloom: 'remember'|'understand'|'apply'|'analyze',
 *   review: boolean (生成后审题修订，数量≤10 时生效),
 *   async: boolean (是否异步执行，默认false)
 * }
 */
router.post(
  '/generate-questions',
  requireAuth,
  async (req, res) => {
    try {
      const {
        subjectCode,
        subjectName,
        difficulty = 3,
        count = 5,
        knowledgePoint = '',
        reference = '',
        questionType = 'single',
        bloom = 'apply',
        review = true,
        async = false,
      } = req.body;

      const userId = req.user.id;

      // 验证参数
      const difficultyNum = validateInt(difficulty, {
        min: 1,
        max: 5,
        defaultValue: 3,
      });
      const countNum = validateInt(count, {
        min: 1,
        max: 20,
        defaultValue: 5,
      });

      const config = {
        subjectCode: subjectCode || 'DEFAULT',
        subjectName: subjectName || '通用',
        difficulty: difficultyNum,
        count: countNum,
        knowledgePoint,
        reference,
        questionType,
        bloom,
        review,
      };

      // 异步执行
      if (async) {
        const taskId = await createAITask(userId, 'generate', config);
        return res.json({
          success: true,
          data: {
            taskId,
            message: '任务已创建，请使用任务ID查询状态',
          },
        });
      }

      // 同步执行
      const questions = await generateQuestions(config, userId);

      res.json({
        success: true,
        data: {
          questions,
          count: questions.length,
        },
      });
    } catch (err) {
      console.error('POST /api/v3/ai/generate-questions error:', err);
      res.status(500).json({
        success: false,
        message: err.message || '生成题目失败',
      });
    }
  }
);

/**
 * POST /api/v3/ai/analyze-question
 * 分析题目质量
 * 
 * body: {
 *   question: Object (题目对象)
 * }
 */
router.post(
  '/analyze-question',
  requireAuth,
  async (req, res) => {
    try {
      // 添加调试日志
      console.log('[AI] analyze-question 请求体:', JSON.stringify(req.body, null, 2));
      console.log('[AI] req.body类型:', typeof req.body);
      console.log('[AI] req.body.question存在:', !!req.body.question);
      if (req.body.question) {
        console.log('[AI] question.content存在:', !!req.body.question.content);
        console.log('[AI] question.content值:', req.body.question.content);
      }
      
      const { question } = req.body;
      const userId = req.user.id;

      if (!question || !question.content) {
        console.log('[AI] 验证失败 - question:', question);
        console.log('[AI] 验证失败 - question.content:', question?.content);
        return res.status(400).json({
          success: false,
          message: '题目内容不能为空',
        });
      }

      const analysis = await analyzeQuestion(question, userId);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (err) {
      console.error('POST /api/v3/ai/analyze-question error:', err);
      res.status(500).json({
        success: false,
        message: err.message || '分析题目失败',
      });
    }
  }
);

/**
 * POST /api/v3/ai/classify-subject
 * 推荐学科分类
 * 
 * body: {
 *   questionContent: string
 * }
 */
router.post(
  '/classify-subject',
  requireAuth,
  async (req, res) => {
    try {
      const { questionContent } = req.body;
      const userId = req.user.id;

      if (!questionContent || !questionContent.trim()) {
        return res.status(400).json({
          success: false,
          message: '题目内容不能为空',
        });
      }

      const recommendation = await classifySubject(questionContent, userId);

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (err) {
      console.error('POST /api/v3/ai/classify-subject error:', err);
      res.status(500).json({
        success: false,
        message: err.message || '学科分类失败',
      });
    }
  }
);

/**
 * POST /api/v3/ai/generate-explanation
 * 生成题目解析
 * 
 * body: {
 *   question: Object
 * }
 */
router.post(
  '/generate-explanation',
  requireAuth,
  async (req, res) => {
    try {
      const { question } = req.body;
      const userId = req.user.id;

      if (!question || !question.content) {
        return res.status(400).json({
          success: false,
          message: '题目内容不能为空',
        });
      }

      const explanation = await generateExplanation(question, userId);

      res.json({
        success: true,
        data: {
          explanation,
        },
      });
    } catch (err) {
      console.error('POST /api/v3/ai/generate-explanation error:', err);
      res.status(500).json({
        success: false,
        message: err.message || '生成解析失败',
      });
    }
  }
);

/**
 * GET /api/v3/ai/tasks/:id
 * 获取任务状态
 */
router.get('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = getTaskStatus(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在',
      });
    }

    // 权限检查：只能查看自己的任务（除非是管理员）
    if (req.user.role !== 'admin') {
      // 这里需要从任务中获取userId，但当前实现中任务信息不包含userId
      // 简化处理：允许查看所有任务状态（不包含敏感数据）
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('GET /api/v3/ai/tasks/:id error:', err);
    res.status(500).json({
      success: false,
      message: '获取任务状态失败',
    });
  }
});

/**
 * DELETE /api/v3/ai/tasks/:id
 * 取消任务
 */
router.delete('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const success = cancelTask(id);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: '无法取消该任务（可能正在运行或已完成）',
      });
    }

    res.json({
      success: true,
      message: '任务已取消',
    });
  } catch (err) {
    console.error('DELETE /api/v3/ai/tasks/:id error:', err);
    res.status(500).json({
      success: false,
      message: '取消任务失败',
    });
  }
});

/**
 * POST /api/v3/ai/tasks/:id/retry
 * 重试任务
 */
router.post('/tasks/:id/retry', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const newTaskId = await retryTask(id);

    res.json({
      success: true,
      data: {
        taskId: newTaskId,
        message: '任务已重新创建',
      },
    });
  } catch (err) {
    console.error('POST /api/v3/ai/tasks/:id/retry error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '重试任务失败',
    });
  }
});

/**
 * GET /api/v3/ai/tasks
 * 获取用户的任务列表
 * 
 * 查询参数：
 * - status: 任务状态（pending, running, completed, error）
 * - limit: 数量限制
 */
router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit } = req.query;

    const tasks = getUserTasks(userId, {
      status,
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 50 }),
    });

    res.json({
      success: true,
      data: tasks,
      total: tasks.length,
    });
  } catch (err) {
    console.error('GET /api/v3/ai/tasks error:', err);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败',
    });
  }
});

/**
 * POST /api/v3/ai/chat
 * 统一 AI 对话（学习伴侣智能问答）
 * body: { messages: [{ role, content }], context?: { pageType, questionId, knowledgeNodeId, wrongQuestionIds } }
 * 返回: { content, recommendedQuestionIds? } —— 推荐练习时附带可开练的题目 ID
 */
function isPracticeRecommendIntent(text = '') {
  return /推荐|练习题|练几道|根据.{0,8}错题|错题.{0,12}(练|复习|巩固)/.test(String(text));
}

/**
 * 根据错题选出可练习的题目：优先同知识点新题，不足时回退到错题本身
 */
async function resolveRecommendedQuestionIds(wrongIds, count = 5) {
  const ids = [...new Set((wrongIds || []).map(String).filter(Boolean))].slice(0, 20);
  if (ids.length === 0) return [];

  try {
    const Question = (await import('../../models/Question.js')).default;
    const wrongQs = await Question.find({ _id: { $in: ids } })
      .select('_id knowledgeNodeId')
      .lean();
    const nodeIds = [
      ...new Set(
        wrongQs
          .map((q) => q.knowledgeNodeId)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const picked = [];
    if (nodeIds.length > 0) {
      const related = await Question.find({
        knowledgeNodeId: { $in: nodeIds },
        _id: { $nin: ids },
      })
        .select('_id')
        .limit(count * 3)
        .lean();
      for (const q of related) {
        if (picked.length >= count) break;
        picked.push(String(q._id));
      }
    }
    for (const id of ids) {
      if (picked.length >= count) break;
      if (!picked.includes(id)) picked.push(id);
    }
    return picked.slice(0, count);
  } catch (err) {
    console.warn('[ai/chat] resolveRecommendedQuestionIds failed:', err.message);
    return ids.slice(0, count);
  }
}

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { messages = [], context } = req.body || {};
    const userId = req.user.id;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messages 必须为非空数组',
      });
    }

    const lastUser = [...messages].reverse().find((m) => m?.role === 'user');
    const wantRecommend = isPracticeRecommendIntent(lastUser?.content);
    const wrongIds = Array.isArray(context?.wrongQuestionIds)
      ? context.wrongQuestionIds.map(String).filter(Boolean)
      : [];

    let recommendedQuestionIds = [];
    if (wantRecommend) {
      recommendedQuestionIds = await resolveRecommendedQuestionIds(wrongIds, 5);
    }

    const systemParts = [
      '你是 GraphTutor 的学习教练，会在首页、图谱、笔记、统计、路径、计划、练习和社区等页面提供辅助。回答要短、可执行，并依据当前页面现场；没有提供的数据不要编造。',
      '不要输出原始题目 ID 或数据库字段；需要练习时引导用户点击界面上的「开始练习」按钮即可。',
    ];
    const pageCoach = {
      home: '用户在首页。帮助决定今天先复习还是先练习。',
      graph: '用户在知识图谱。根据掌握度建议先补哪个知识点。',
      nodes: '用户在知识点页。解释概念、常考点和笔记要点。',
      notes: '用户在笔记。只依据笔记内容整理或出自测题。',
      analytics: '用户在学习统计。解读强弱项并给出本周安排。',
      learning_path: '用户在学习路径。解释推荐顺序，并指出第一步。',
      goals: '用户在学习目标。把目标拆成几天内能完成的小任务。',
      plans: '用户在学习计划。帮助调整节奏，避免计划不可执行。',
      checkin: '用户在打卡页。给一个今天能完成的短学习任务。',
      recommendations: '用户在推荐题页。说明这些题在补哪块薄弱点。',
      community: '用户在学习社区。帮助把问题写清楚。',
      messages: '用户在消息页。帮助写出简短、清楚的学习求助。',
      groups: '用户在学习小组。建议共同练习的主题。',
    };
    if (context?.pageType && pageCoach[context.pageType]) {
      systemParts.push(pageCoach[context.pageType]);
    }
    if (context && typeof context === 'object') {
      if (context.pageType) systemParts.push(`当前页面类型：${context.pageType}`);
      if (context.mode === 'practice') {
        systemParts.push('用户正在作答。默认只给思路提示，不要直接公布正确选项或标准答案，除非用户明确要求对答案或完整讲解。');
      } else if (context.mode === 'review_session') {
        systemParts.push('本次作答已经结束，可以指出错因、正确答案要点和下一步练习建议。');
      }
      if (context.questionId) systemParts.push(`当前题目ID：${context.questionId}`);
      if (context.knowledgeNodeId) systemParts.push(`当前知识点ID：${context.knowledgeNodeId}`);
      if (context.brief) {
        systemParts.push(`当前学习现场：\n${String(context.brief).slice(0, 1800)}`);
      }
      if (wrongIds.length > 0) {
        systemParts.push(`用户近期错题数量：${wrongIds.length}（可用于薄弱点分析）`);
      }
    }
    if (wantRecommend && recommendedQuestionIds.length > 0) {
      systemParts.push(
        `系统已为用户准备好 ${recommendedQuestionIds.length} 道巩固练习题（优先同知识点新题，必要时含错题重练）。请简要说明推荐理由与复习建议（2–5 句），并提示可点击「开始练习这 ${recommendedQuestionIds.length} 题」。`
      );
    } else if (wantRecommend && recommendedQuestionIds.length === 0) {
      systemParts.push(
        '用户想根据错题推荐练习，但当前没有可用错题数据。请温和提示先去做几道题，做错后即可推荐。'
      );
    }

    const systemMessage = {
      role: 'system',
      content: systemParts.join('\n'),
    };
    const fullMessages = [systemMessage, ...messages];

    let content;
    try {
      content = await chatCompletion(fullMessages, { temperature: 0.6 }, userId);
    } catch (llmErr) {
      if (wantRecommend && recommendedQuestionIds.length > 0) {
        content = `已根据你的错题薄弱点，准备了 ${recommendedQuestionIds.length} 道巩固练习。点击下方「开始练习」即可开练。`;
      } else {
        throw llmErr;
      }
    }

    res.json({
      success: true,
      data: {
        content,
        ...(recommendedQuestionIds.length > 0 ? { recommendedQuestionIds } : {}),
      },
    });
  } catch (err) {
    console.error('POST /api/v3/ai/chat error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'AI 对话失败',
    });
  }
});

/**
 * POST /api/v3/ai/note-summary
 * 生成长笔记摘要（Phase 1.4）
 * body: { content: string }
 */
router.post('/note-summary', requireAuth, async (req, res) => {
  try {
    const { content } = req.body || {};
    const userId = req.user.id;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, message: 'content 不能为空' });
    }
    const summary = await generateNoteSummary(content, userId);
    res.json({ success: true, data: { summary } });
  } catch (err) {
    console.error('POST /api/v3/ai/note-summary error:', err);
    res.status(500).json({ success: false, message: err.message || '生成摘要失败' });
  }
});

/**
 * GET /api/v3/ai/wrong-report
 * 错题分析报告（Phase 1.5），按周/月聚合后由 AI 生成分析与复习建议
 * query: period=week|month
 */
router.get('/wrong-report', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period === 'month' ? 'month' : 'week';
    const WrongQuestion = (await import('../../models/WrongQuestion.js')).default;
    const Question = (await import('../../models/Question.js')).default;

    const from = new Date();
    if (period === 'week') {
      from.setDate(from.getDate() - 7);
    } else {
      from.setMonth(from.getMonth() - 1);
    }
    const wrongs = await WrongQuestion.find({
      userId,
      lastErrorAt: { $gte: from },
    })
      .sort({ lastErrorAt: -1 })
      .limit(100)
      .lean();

    const questionIds = [...new Set(wrongs.map((w) => w.questionId))];
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('content type subjectCode knowledgeNodeId')
      .lean();
    const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const topicList = wrongs.slice(0, 30).map((w) => {
      const q = qMap.get(w.questionId?.toString());
      return q ? (q.content || '').replace(/\s+/g, ' ').slice(0, 80) : '';
    }).filter(Boolean);

    const prompt = `根据以下用户在${period === 'week' ? '本周' : '本月'}的错题摘要，生成一段「错题分析 + 复习建议」（200–400 字）。\n错题摘要（前若干题）：\n${topicList.join('\n')}\n请直接输出分析正文，包含：1）薄弱点概括；2）复习建议。`;
    const messages = [
      { role: 'system', content: '你是学习助手，根据用户错题数据给出简明分析和复习建议。' },
      { role: 'user', content: prompt },
    ];
    const report = await chatCompletion(messages, { temperature: 0.5 }, userId);
    const reportText = report || '暂无足够错题数据生成报告。';

    // 推送到通知中心：生成后写入一条系统通知，便于用户在通知中心看到
    try {
      await createNotification({
        userId,
        type: 'system',
        title: period === 'week' ? '本周错题分析已生成' : '本月错题分析已生成',
        content: wrongs.length > 0 ? `共 ${wrongs.length} 道错题，已生成分析与复习建议。点击查看详情。` : '暂无足够错题数据。',
        link: '/analytics',
        priority: 4,
      });
    } catch (notifyErr) {
      console.warn('wrong-report: createNotification failed', notifyErr);
    }

    res.json({
      success: true,
      data: {
        period,
        wrongCount: wrongs.length,
        report: reportText,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/ai/wrong-report error:', err);
    res.status(500).json({ success: false, message: err.message || '生成错题报告失败' });
  }
});

/**
 * GET /api/v3/ai/stats
 * 获取AI使用统计（当前用户）
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const AIRunLog = (await import('../../models/AIRunLog.js')).default;

    // 获取最近30天的统计
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await AIRunLog.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          totalDuration: { $sum: '$duration' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
        },
      },
    ]);

    const totalStats = await AIRunLog.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        byType: stats,
        total: totalStats[0] || {
          totalCount: 0,
          totalCost: 0,
          avgDuration: 0,
        },
        period: '30天',
      },
    });
  } catch (err) {
    console.error('GET /api/v3/ai/stats error:', err);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
    });
  }
});

export default router;

