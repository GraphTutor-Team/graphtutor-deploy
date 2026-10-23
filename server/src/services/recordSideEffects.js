/**
 * 答题记录写入后的衍生更新（错题本、目标、成就、经验）
 */
import Question from '../models/Question.js';
import { updateLearningGoalsProgress } from './learningGoalUpdater.js';
import { checkAndAwardAchievements } from './achievementService.js';
import { addOrUpdateWrongQuestion } from './wrongQuestionService.js';
import { addLearningExp } from './learningAvatarService.js';

async function loadQuestion(questionId) {
  let question = await Question.findById(questionId).lean();
  if (!question) {
    question = await Question.findOne({ id: questionId }).lean();
  }
  return question;
}

/**
 * 单条记录：目标进度、成就、错题本
 */
export function applySingleRecordSideEffects(userId, {
  recordId,
  questionId,
  isCorrect,
  timeSpentMs,
  knowledgeNodeId,
}, question = null, options = {}) {
  if (!userId || !questionId) return;

  const run = async () => {
    if (options.isEmpty) return;

    const q = question || await loadQuestion(questionId);
    await updateLearningGoalsProgress(userId, {
      questionId: String(questionId),
      isCorrect: !!isCorrect,
      timeSpentMs: timeSpentMs != null ? Number(timeSpentMs) : null,
      subjectCode: q?.subjectCode || null,
      bankId: q?.bankId || null,
      knowledgeNodeId: knowledgeNodeId ? String(knowledgeNodeId) : null,
    }).catch((err) => {
      console.error('更新学习目标进度失败:', err);
    });

    await checkAndAwardAchievements(userId, isCorrect ? 'correct' : 'answer', {
      questionId: String(questionId),
      isCorrect: !!isCorrect,
    }).catch((err) => {
      console.error('检查成就失败:', err);
    });

    if (recordId && !options.skipWrongBook) {
      await addOrUpdateWrongQuestion(userId, recordId, String(questionId), !!isCorrect).catch((err) => {
        console.error('更新错题本失败:', err);
      });
    }
  };

  return run().catch((err) => {
    console.error('applySingleRecordSideEffects error:', err);
  });
}

/**
 * 批量记录：逐条 side effects + 全对成就 + 经验
 * @param {Array} entries - { recordId, questionId, isCorrect, timeSpentMs, knowledgeNodeId }
 */
export async function applyBatchRecordSideEffects(userId, entries) {
  if (!userId || !entries?.length) return;

  const uniqueQuestionIds = [...new Set(entries.map((e) => String(e.questionId)).filter(Boolean))];
  let questions = [];
  try {
    questions = uniqueQuestionIds.length
      ? await Question.find({
        $or: [
          { _id: { $in: uniqueQuestionIds } },
          { id: { $in: uniqueQuestionIds } },
        ],
      }).lean()
      : [];
  } catch (err) {
    console.error('加载题目失败:', err);
  }

  const questionMap = {};
  questions.forEach((q) => {
    const qid = q._id?.toString() || q.id;
    questionMap[qid] = q;
  });

  for (const entry of entries) {
    applySingleRecordSideEffects(userId, entry, questionMap[String(entry.questionId)], {
      skipWrongBook: true,
      isEmpty: entry.isEmpty === true,
    });
  }

  await Promise.all(entries.map(async (entry) => {
    if (!entry.recordId || !entry.questionId || entry.isEmpty) return;
    try {
      await addOrUpdateWrongQuestion(userId, entry.recordId, String(entry.questionId), !!entry.isCorrect);
    } catch (err) {
      console.error('更新错题本失败:', err);
    }
  }));

  const allCorrect = entries.every((e) => e.isCorrect === true);
  const correctCount = entries.filter((e) => e.isCorrect).length;

  if (allCorrect && entries.length > 0) {
    checkAndAwardAchievements(userId, 'exam_completed', {
      accuracy: 100,
      total: entries.length,
      correct: correctCount,
    }).catch((err) => {
      console.error('检查考试成就失败:', err);
    });
  }

  const expAmount = entries.length + 2 * correctCount;
  addLearningExp(userId, expAmount, 'answer').catch((err) => {
    console.error('学习经验更新失败:', err);
  });
}

/**
 * 测验批量交卷后的汇总奖励（单条 side effects 已在 persist 时触发）
 */
export function applyBatchBonusSideEffects(userId, entries) {
  if (!userId || !entries?.length) return;

  const allCorrect = entries.every((e) => e.isCorrect === true);
  const correctCount = entries.filter((e) => e.isCorrect).length;

  if (allCorrect && entries.length > 0) {
    checkAndAwardAchievements(userId, 'exam_completed', {
      accuracy: 100,
      total: entries.length,
      correct: correctCount,
    }).catch((err) => {
      console.error('检查考试成就失败:', err);
    });
  }

  const expAmount = entries.length + 2 * correctCount;
  addLearningExp(userId, expAmount, 'answer').catch((err) => {
    console.error('学习经验更新失败:', err);
  });
}
