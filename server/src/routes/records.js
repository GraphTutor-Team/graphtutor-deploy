/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/routes/records.js
 * 模块功能：答题记录路由模块，负责保存每次作答记录，并为分析模块提供原始数据。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/routes/records.js
// 做题记录：提交记录 + 查询记录 + 错题本 + 批量考试记录

import express from 'express';
import Record from '../models/Record.js';
import Question from '../models/Question.js';
import { applySingleRecordSideEffects, applyBatchRecordSideEffects } from '../services/recordSideEffects.js';

const router = express.Router();

/**
 * POST /api/records
 * 提交一条做题记录（给 /quiz 即时练习用）
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      questionId,
      knowledgeNodeId,
      isCorrect,
      answerIndex,
      correctIndex,
      sessionId,
      timeSpentMs,
    } = req.body || {};

    // 验证必填字段
    if (!userId || !questionId) {
      return res.status(400).json({ error: '缺少必要字段：userId 和 questionId 必填' });
    }

    // answerIndex 可以是 number 或 null（表示未答题）
    if (answerIndex !== null && answerIndex !== undefined && typeof answerIndex !== 'number') {
      return res.status(400).json({ error: 'answerIndex 必须是数字或 null' });
    }

    // 确保 answerIndex 和 correctIndex 是 number 或 null
    const normalizedAnswerIndex = answerIndex != null && answerIndex !== '' ? Number(answerIndex) : null;
    const normalizedCorrectIndex = correctIndex != null && correctIndex !== '' ? Number(correctIndex) : null;
    
    // 确保 isCorrect 有默认值
    const normalizedIsCorrect = isCorrect === true || isCorrect === false ? isCorrect : false;
    
    const doc = await Record.create({
      userId: String(userId),
      questionId: String(questionId), // 确保是字符串
      knowledgeNodeId: knowledgeNodeId ? String(knowledgeNodeId) : null,
      isCorrect: normalizedIsCorrect,
      answerIndex: normalizedAnswerIndex,
      correctIndex: normalizedCorrectIndex,
      sessionId: sessionId ? String(sessionId) : null,
      timeSpentMs: timeSpentMs ? Number(timeSpentMs) : null,
    });

    // 异步更新学习目标、成就、错题本
    if (userId && questionId) {
      let question = null;
      try {
        question = await Question.findById(questionId).lean();
        if (!question) {
          question = await Question.findOne({ id: questionId }).lean();
        }
      } catch (err) {
        // 忽略错误
      }

      applySingleRecordSideEffects(userId, {
        recordId: doc._id,
        questionId: String(questionId),
        isCorrect: normalizedIsCorrect,
        timeSpentMs: timeSpentMs ? Number(timeSpentMs) : null,
        knowledgeNodeId: knowledgeNodeId ? String(knowledgeNodeId) : null,
      }, question);
    }

    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error('create record error:', e);
    res.status(500).json({ error: '创建记录失败' });
  }
});

/**
 * POST /api/records/batch
 * 批量提交一场考试的做题记录（给 /exam 用，一次性写入整张试卷）
 *
 * 请求体示例：
 * {
 *   "userId": "u1",
 *   "sessionId": "exam-20241127-1", // 可选
 *   "records": [
 *     {
 *       "questionId": "...",
 *       "knowledgeNodeId": "os-ch1",
 *       "answerIndex": 1,
 *       "correctIndex": 2,
 *       "isCorrect": false,
 *       "timeSpentMs": 8000
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/batch', async (req, res) => {
  try {
    const { userId, sessionId, records } = req.body || {};

    if (!userId || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'userId 和非空 records 数组是必填项' });
    }

    const docs = records
      .filter((r) => {
        // 过滤有效记录：必须有 questionId，answerIndex 可以是 number 或 null
        return r && 
               r.questionId != null && 
               (r.answerIndex === null || r.answerIndex === undefined || typeof r.answerIndex === 'number');
      })
      .map((r) => {
        // 规范化数据类型，确保兼容性
        const normalizedAnswerIndex = r.answerIndex != null && r.answerIndex !== '' ? Number(r.answerIndex) : null;
        const normalizedCorrectIndex = r.correctIndex != null && r.correctIndex !== '' ? Number(r.correctIndex) : null;
        
        return {
          userId: String(userId),
          questionId: String(r.questionId),
          knowledgeNodeId: r.knowledgeNodeId ? String(r.knowledgeNodeId) : null,
          isCorrect: r.isCorrect === true || r.isCorrect === false ? r.isCorrect : false,
          answerIndex: normalizedAnswerIndex,
          correctIndex: normalizedCorrectIndex,
          sessionId: sessionId || r.sessionId ? String(sessionId || r.sessionId) : null,
          timeSpentMs: r.timeSpentMs ? Number(r.timeSpentMs) : null,
        };
      });

    if (docs.length === 0) {
      return res.status(400).json({ error: 'records 中没有有效的记录' });
    }

    const result = await Record.insertMany(docs);

    if (userId) {
      const entries = result.map((doc) => ({
        recordId: doc._id,
        questionId: String(doc.questionId),
        isCorrect: doc.isCorrect === true,
        timeSpentMs: doc.timeSpentMs,
        knowledgeNodeId: doc.knowledgeNodeId,
      }));
      applyBatchRecordSideEffects(userId, entries).catch((err) => {
        console.error('批量记录 side effects 失败:', err);
      });
    }

    res.json({ ok: true, inserted: result.length });
  } catch (e) {
    console.error('batch create records error:', e);
    res.status(500).json({ error: '批量创建记录失败' });
  }
});

/**
 * GET /api/records?userId=&limit=
 * 最近做题记录
 */
router.get('/', async (req, res) => {
  try {
    const { userId, limit = 100 } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId 是必填项' });
    }

    const list = await Record.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 100)
      .lean();

    res.json(list);
  } catch (e) {
    console.error('list records error:', e);
    res.status(500).json({ error: '获取记录失败' });
  }
});

/**
 * GET /api/records/wrong?userId=&days=&limit=
 * 最近错题记录（附带题目内容）
 */
router.get('/wrong', async (req, res) => {
  try {
    const { userId, days = 30, limit = 50 } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId 是必填项' });
    }

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const wrong = await Record.find({
      userId,
      isCorrect: false,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 50)
      .lean();

    const qids = [...new Set(wrong.map((r) => String(r.questionId)))];
    const questions = await Question.find({ _id: { $in: qids } }).lean();
    const qMap = new Map(questions.map((q) => [String(q._id), q]));

    const result = wrong.map((r) => {
      const q = qMap.get(String(r.questionId));
      return {
        ...r,
        question: q
          ? {
              id: q._id,
              content: q.content,
              options: q.options,
              correctIndex: q.correctIndex,
              difficulty: q.difficulty,
              knowledgeNodeId: q.knowledgeNodeId,
              explain: q.explain,
            }
          : null,
      };
    });

    res.json(result);
  } catch (e) {
    console.error('wrong records error:', e);
    res.status(500).json({ error: '获取错题记录失败' });
  }
});

export default router;
