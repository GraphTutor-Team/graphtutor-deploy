/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/routes/quizzes.js
 * 模块功能：测验 / 考试会话路由模块，负责创建测验、获取下一题、提交答案和结束测验。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/routes/quizzes.js
// 会话测验：创建会话、获取详情、作答、结束、列出会话

import express from 'express';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import QuizSession from '../models/QuizSession.js';
import Record from '../models/Record.js';
import { checkAnswer, resolveUserAnswer } from '../utils/questionScoring.js';
import { applySingleRecordSideEffects, applyBatchBonusSideEffects } from '../services/recordSideEffects.js';
import { buildTodaySet } from './v3/ai.js';

const router = express.Router();

function buildQuestionForCheck(snap) {
  return {
    type: snap.type || 'single',
    answer: snap.answer,
    answerIndex: snap.correctIndex,
    options: snap.options,
    codingMeta: snap.codingMeta,
  };
}

function upsertSessionAnswer(session, questionId, resolvedAnswer, isCorrect, timeSpentMs) {
  const existing = session.answers.find(
    (a) => String(a.questionId) === String(questionId)
  );
  if (existing) {
    existing.answerIndex = typeof resolvedAnswer === 'number' ? resolvedAnswer : existing.answerIndex;
    existing.userAnswer = resolvedAnswer;
    existing.isCorrect = isCorrect;
    existing.timeSpentMs = timeSpentMs ?? existing.timeSpentMs;
  } else {
    session.answers.push({
      questionId,
      answerIndex: typeof resolvedAnswer === 'number' ? resolvedAnswer : 0,
      userAnswer: resolvedAnswer,
      isCorrect,
      timeSpentMs,
    });
  }
}

async function persistAnswerRecord(session, snap, resolvedAnswer, isCorrect, timeSpentMs, userId) {
  const recordUserId = userId || session.userId;
  const doc = await Record.create({
    userId: recordUserId,
    questionId: snap.id,
    knowledgeNodeId: snap.knowledgeNodeId,
    isCorrect,
    answerIndex: typeof resolvedAnswer === 'number' ? resolvedAnswer : undefined,
    correctIndex: snap.correctIndex,
    sessionId: session._id,
    timeSpentMs,
  });
  await applySingleRecordSideEffects(recordUserId, {
    recordId: doc._id,
    questionId: String(snap.id),
    isCorrect,
    timeSpentMs,
    knowledgeNodeId: snap.knowledgeNodeId,
  });
  return doc;
}

function applyAnswerToSession(session, questionId, body) {
  const { answerIndex, timeSpentMs, userAnswer, answer } = body;
  const snap = session.questions.find(
    (q) => String(q.id) === String(questionId)
  );
  if (!snap) {
    return { error: '该题不属于本会话' };
  }
  const resolvedAnswer = resolveUserAnswer({ userAnswer, answer, answerIndex });
  const { isCorrect } = checkAnswer(buildQuestionForCheck(snap), resolvedAnswer);
  upsertSessionAnswer(session, questionId, resolvedAnswer, isCorrect, timeSpentMs);
  return { snap, resolvedAnswer, isCorrect, timeSpentMs };
}

function snapshotQuestion(q) {
  let correctIndex = q.answerIndex;
  if (correctIndex === undefined || correctIndex === null) {
    if (q.type === 'single' || q.type === 'judge') {
      correctIndex = typeof q.answer === 'number' ? q.answer : null;
    } else if (q.type === 'multiple' && Array.isArray(q.answer)) {
      correctIndex = q.answer.length > 0 ? q.answer[0] : null;
    }
  }

  return {
    id: q._id,
    content: q.content,
    options: q.options || [],
    correctIndex,
    difficulty: q.difficulty,
    knowledgeNodeId: q.knowledgeNodeId,
    type: q.type || 'single',
    answer: q.answer,
    codingMeta: q.codingMeta || null,
    explain: q.explain || '',
  };
}

/**
 * 从题库中抽题（支持按知识点、难度、学科、题库）
 */
async function selectQuestions({ size = 10, difficulty, node, bankId, subjectCode, excludeIds = [] }) {
  if (size < 1) return [];
  const match = {};
  if (difficulty) match.difficulty = Number(difficulty);
  if (node) match.knowledgeNodeId = node;
  if (subjectCode) match.subjectCode = subjectCode;
  if (bankId) {
    try {
      match.bankId = new mongoose.Types.ObjectId(bankId);
    } catch {
      throw new Error('无效的 bankId');
    }
  }
  const excluded = excludeIds
    .map((id) => (mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : null))
    .filter(Boolean);
  if (excluded.length) match._id = { $nin: excluded };

  const pipeline = [{ $match: match }, { $sample: { size } }];
  const docs = await Question.aggregate(pipeline).exec();
  return docs.map(snapshotQuestion);
}

function matchesSessionFilter(question, { difficulty, node, bankId, subjectCode }) {
  if (node && String(question.knowledgeNodeId || '') !== String(node)) return false;
  if (bankId && String(question.bankId || '') !== String(bankId)) return false;
  if (subjectCode && question.subjectCode && String(question.subjectCode) !== String(subjectCode)) return false;
  if (difficulty && Number(question.difficulty) !== Number(difficulty)) return false;
  return true;
}

/** 本周错过的题在前，同知识点新题紧随其后，再按筛选条件补齐。 */
async function selectSessionQuestions({ userId, size, difficulty, node, bankId, subjectCode, questionIds }) {
  if (Array.isArray(questionIds) && questionIds.length > 0) {
    return selectQuestionsByIds(questionIds.slice(0, 200));
  }
  const target = Math.min(200, Math.max(1, Number(size) || 10));
  const filters = { difficulty, node, bankId, subjectCode };
  let lead = [];
  try {
    const today = await buildTodaySet(userId, target);
    const ids = (today?.practiceQuestionIds || []).filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
    if (ids.length) {
      const docs = await Question.find({ _id: { $in: ids } }).lean();
      const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
      lead = ids
        .map((id) => byId.get(String(id)))
        .filter((doc) => doc && matchesSessionFilter(doc, filters))
        .map(snapshotQuestion);
    }
  } catch (err) {
    console.warn('[Quiz] today set skipped:', err.message);
    lead = [];
  }
  const rest = await selectQuestions({
    size: target - lead.length,
    ...filters,
    excludeIds: lead.map((question) => question.id),
  });
  return [...lead, ...rest].slice(0, target);
}

async function selectQuestionsByIds(questionIds) {
  const oids = [];
  const order = [];
  (questionIds || []).forEach((rawId) => {
    try {
      const oid = new mongoose.Types.ObjectId(String(rawId));
      oids.push(oid);
      order.push(String(oid));
    } catch {
      // skip invalid id
    }
  });
  if (!oids.length) return [];

  const docs = await Question.find({ _id: { $in: oids } }).lean();
  const map = new Map(docs.map((d) => [String(d._id), d]));
  return order.map((id) => map.get(id)).filter(Boolean).map(snapshotQuestion);
}

/**
 * POST /api/quizzes/session/start
 * 创建新会话
 */
router.post('/session/start', async (req, res) => {
  try {
    const { userId, size = 10, difficulty, node, bankId, subjectCode, questionIds } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId 是必填项' });
    }

    console.log('[Quiz] Creating session with params:', {
      userId, size, difficulty, node, bankId, subjectCode, questionIds: questionIds?.length,
    });

    const questions = await selectSessionQuestions({
      userId, size, difficulty, node, bankId, subjectCode, questionIds,
    });
    console.log('[Quiz] Selected questions count:', questions.length);
    
    if (!questions.length) {
      return res.status(400).json({ error: '题库中没有符合条件的题目' });
    }

    // 格式化题目数据，确保id是ObjectId格式
    const formattedQuestions = questions.map(q => {
      // q.id 从 selectQuestions 返回时已经是 ObjectId（来自 q._id）
      // 但为了安全，确保格式正确
      let questionId = q.id;
      if (questionId && typeof questionId === 'string') {
        try {
          questionId = new mongoose.Types.ObjectId(questionId);
        } catch (e) {
          console.error('[Quiz] Invalid question ID format:', questionId);
          throw new Error(`无效的题目ID格式: ${questionId}`);
        }
      }
      
      const knowledgeNodeId = q.knowledgeNodeId ? String(q.knowledgeNodeId) : null;
      
      return {
        id: questionId,
        content: q.content || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: q.correctIndex !== undefined && q.correctIndex !== null ? Number(q.correctIndex) : null,
        difficulty: q.difficulty !== undefined ? Number(q.difficulty) : 1,
        knowledgeNodeId: knowledgeNodeId,
        type: q.type || 'single',
        answer: q.answer,
        codingMeta: q.codingMeta || null,
        explain: q.explain || '',
      };
    });

    console.log('[Quiz] Formatted questions:', formattedQuestions.length);
    console.log('[Quiz] First question sample:', formattedQuestions[0] ? {
      id: String(formattedQuestions[0].id),
      content: formattedQuestions[0].content?.substring(0, 30),
      optionsCount: formattedQuestions[0].options?.length,
    } : 'none');

    const session = await QuizSession.create({
      userId: String(userId),
      questions: formattedQuestions,
      targetSize: size,
      totalQuestions: formattedQuestions.length,
    });

    res.json({
      id: session._id,
      userId: session.userId,
      status: session.status,
      size: session.totalQuestions,
      createdAt: session.createdAt,
    });
  } catch (e) {
    console.error('start session error:', e);
    console.error('Error details:', {
      message: e.message,
      stack: e.stack,
      name: e.name,
    });
    res.status(500).json({ 
      error: '创建会话失败',
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
});

/**
 * GET /api/quizzes/session/:id
 * 获取会话详情（默认不返回正确答案）
 * ?reveal=1 或会话已 finished 时返回正确答案
 */
router.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reveal } = req.query;

    const session = await QuizSession.findById(id).lean();
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const needReveal = reveal === '1' || session.status === 'finished';

    const questions = session.questions.map((q) => {
      const codingMeta = q.codingMeta
        ? {
            language: q.codingMeta.language,
            starterCode: q.codingMeta.starterCode,
            slug: q.codingMeta.slug,
            hint: q.codingMeta.hint,
            externalSource: q.codingMeta.externalSource,
            ...(needReveal ? { referenceCode: q.codingMeta.referenceCode } : {}),
          }
        : undefined;

      return {
        id: q.id,
        content: q.content,
        options: q.options,
        difficulty: q.difficulty,
        knowledgeNodeId: q.knowledgeNodeId,
        type: q.type || 'single',
        codingMeta,
        answer: needReveal ? q.answer : undefined,
        explain: needReveal ? q.explain : undefined,
        correctIndex: needReveal ? q.correctIndex : undefined,
      };
    });

    const answers = (session.answers || []).map((a) => ({
      questionId: a.questionId,
      answerIndex: a.answerIndex,
      userAnswer: a.userAnswer,
      isCorrect: needReveal ? a.isCorrect : undefined,
    }));

    res.json({
      id: session._id,
      userId: session.userId,
      status: session.status,
      questions,
      answers,
      totalCorrect: session.totalCorrect,
      totalQuestions: session.totalQuestions,
      createdAt: session.createdAt,
      finishedAt: session.finishedAt,
    });
  } catch (e) {
    console.error('get session error:', e);
    res.status(500).json({ error: '获取会话详情失败' });
  }
});

/**
 * GET /api/quizzes
 * 列出会话
 */
router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const list = await QuizSession.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(
      list.map((s) => ({
        id: s._id,
        userId: s.userId,
        status: s.status,
        correct: s.totalCorrect,
        total: s.totalQuestions,
        createdAt: s.createdAt,
        finishedAt: s.finishedAt,
      }))
    );
  } catch (e) {
    console.error('list sessions error:', e);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

/**
 * POST /api/quizzes/session/:id/answer
 * 提交单题作答
 */
router.post('/session/:id/answer', async (req, res) => {
  try {
    const { id } = req.params;
    const { questionId, userId } = req.body;

    const session = await QuizSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    if (session.status !== 'ongoing') {
      return res.status(400).json({ error: '会话已结束或已取消' });
    }

    const result = applyAnswerToSession(session, questionId, req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    const { snap, resolvedAnswer, isCorrect, timeSpentMs: spentMs } = result;
    await session.save();
    await persistAnswerRecord(session, snap, resolvedAnswer, isCorrect, spentMs, userId);

    res.json({ ok: true, isCorrect });
  } catch (e) {
    console.error('submit answer error:', e);
    res.status(500).json({ error: '提交答案失败' });
  }
});

/**
 * POST /api/quizzes/session/:id/answers/batch
 * 批量提交作答（练习/考试交卷时用，减少请求次数）
 */
router.post('/session/:id/answers/batch', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, answers } = req.body || {};
    const list = Array.isArray(answers) ? answers : [];
    if (!list.length) {
      return res.json({ ok: true, submitted: 0 });
    }
    if (list.length > 100) {
      return res.status(400).json({ error: '单次最多提交 100 题' });
    }

    const session = await QuizSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    if (session.status !== 'ongoing') {
      return res.status(400).json({ error: '会话已结束或已取消' });
    }

    let submitted = 0;
    const bonusEntries = [];
    for (const item of list) {
      if (!item || !item.questionId) continue;
      const result = applyAnswerToSession(session, item.questionId, item);
      if (result.error) continue;
      const { snap, resolvedAnswer, isCorrect, timeSpentMs } = result;
      await persistAnswerRecord(session, snap, resolvedAnswer, isCorrect, timeSpentMs, userId);
      bonusEntries.push({
        questionId: String(snap.id),
        isCorrect,
        timeSpentMs,
        knowledgeNodeId: snap.knowledgeNodeId,
      });
      submitted += 1;
    }
    await session.save();

    const recordUserId = userId || session.userId;
    if (recordUserId && bonusEntries.length) {
      applyBatchBonusSideEffects(recordUserId, bonusEntries);
    }

    res.json({ ok: true, submitted });
  } catch (e) {
    console.error('batch submit answers error:', e);
    res.status(500).json({ error: '批量提交答案失败' });
  }
});

/**
 * POST /api/quizzes/session/:id/finish
 * 结束会话并计算正确率
 */
router.post('/session/:id/finish', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await QuizSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const totalQuestions = session.questions.length;
    const lastByQid = new Map();
    session.answers.forEach((a) => {
      lastByQid.set(String(a.questionId), a);
    });

    let correct = 0;
    session.questions.forEach((q) => {
      const a = lastByQid.get(String(q.id));
      if (!a) return;
      if (a.isCorrect) {
        correct += 1;
        return;
      }
      const resolvedAnswer = a.userAnswer !== undefined ? a.userAnswer : a.answerIndex;
      const { isCorrect } = checkAnswer(
        {
          type: q.type || 'single',
          answer: q.answer,
          answerIndex: q.correctIndex,
          options: q.options,
          codingMeta: q.codingMeta,
        },
        resolvedAnswer
      );
      if (isCorrect) {
        a.isCorrect = true;
        correct += 1;
      }
    });

    session.status = 'finished';
    session.totalCorrect = correct;
    session.totalQuestions = totalQuestions;
    session.finishedAt = new Date();
    await session.save();

    const acc = totalQuestions ? Math.round((correct * 100) / totalQuestions) : 0;

    res.json({ correct, total: totalQuestions, acc });
  } catch (e) {
    console.error('finish session error:', e);
    res.status(500).json({ error: '结束会话失败' });
  }
});

/**
 * DELETE /api/quizzes/session/:id
 * 删除会话（可作为后台工具）
 */
router.delete('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await QuizSession.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    console.error('delete session error:', e);
    res.status(500).json({ error: '删除会话失败' });
  }
});

export default router;
