/**
 * GraphTutor V3.0 - 业务操作事务包装器
 * 
 * 功能：为常见业务操作提供事务支持
 */

import { withTransaction, batchTransaction } from './transaction.js';
import { NotFoundError, ConflictError } from './errorHandler.js';
import { info, error as logError } from './logger.js';

/**
 * 创建题目并更新题库计数（事务）
 * @param {Object} questionData - 题目数据
 * @param {string} userId - 用户ID
 * @param {Object} session - MongoDB session（可选）
 * @returns {Promise<Object>} 创建的题目
 */
export async function createQuestionWithBankUpdate(questionData, userId, session = null) {
  const Question = (await import('../models/Question.js')).default;
  const QuestionBank = (await import('../models/QuestionBank.js')).default;

  const operation = async (txnSession) => {
    // 创建题目
    const question = await Question.create([questionData], { session: txnSession });
    const createdQuestion = question[0];

    // 如果指定了题库，更新题库计数
    if (questionData.bankId) {
      await QuestionBank.findByIdAndUpdate(
        questionData.bankId,
        { $inc: { questionCount: 1 } },
        { session: txnSession }
      );
      info('题目创建并更新题库计数', {
        questionId: createdQuestion._id,
        bankId: questionData.bankId,
      });
    }

    return createdQuestion;
  };

  if (session) {
    return await operation(session);
  } else {
    return await withTransaction(operation);
  }
}

/**
 * 删除题目并更新题库计数（事务）
 * @param {string} questionId - 题目ID
 * @param {string} userId - 用户ID
 * @param {Object} session - MongoDB session（可选）
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteQuestionWithBankUpdate(questionId, userId, session = null) {
  const Question = (await import('../models/Question.js')).default;
  const QuestionBank = (await import('../models/QuestionBank.js')).default;

  const operation = async (txnSession) => {
    // 查找题目
    const question = await Question.findById(questionId).session(txnSession);
    if (!question) {
      throw new NotFoundError('题目不存在');
    }

    const bankId = question.bankId;

    // 删除题目
    await Question.deleteOne({ _id: questionId }).session(txnSession);

    // 如果题目属于某个题库，更新题库计数
    if (bankId) {
      await QuestionBank.findByIdAndUpdate(
        bankId,
        { $inc: { questionCount: -1 } },
        { session: txnSession }
      );
      info('题目删除并更新题库计数', {
        questionId,
        bankId,
      });
    }

    return { deleted: true, questionId, bankId };
  };

  if (session) {
    return await operation(session);
  } else {
    return await withTransaction(operation);
  }
}

/**
 * 批量创建题目并更新题库计数（事务）
 * @param {Array<Object>} questionsData - 题目数据数组
 * @param {string} userId - 用户ID
 * @param {Object} session - MongoDB session（可选）
 * @returns {Promise<Array>} 创建的题目数组
 */
export async function batchCreateQuestionsWithBankUpdate(questionsData, userId, session = null) {
  const Question = (await import('../models/Question.js')).default;
  const QuestionBank = (await import('../models/QuestionBank.js')).default;

  const operation = async (txnSession) => {
    // 创建所有题目
    const questions = await Question.insertMany(questionsData, { session: txnSession });

    // 统计每个题库需要增加的题目数量
    const bankCounts = {};
    for (const q of questionsData) {
      if (q.bankId) {
        bankCounts[q.bankId] = (bankCounts[q.bankId] || 0) + 1;
      }
    }

    // 批量更新题库计数
    const updatePromises = Object.entries(bankCounts).map(([bankId, count]) =>
      QuestionBank.findByIdAndUpdate(
        bankId,
        { $inc: { questionCount: count } },
        { session: txnSession }
      )
    );

    await Promise.all(updatePromises);

    info('批量创建题目并更新题库计数', {
      questionCount: questions.length,
      bankUpdates: Object.keys(bankCounts).length,
    });

    return questions;
  };

  if (session) {
    return await operation(session);
  } else {
    return await withTransaction(operation);
  }
}

/**
 * 移动题目到另一个题库（事务）
 * @param {string} questionId - 题目ID
 * @param {string} newBankId - 新题库ID
 * @param {string} userId - 用户ID
 * @param {Object} session - MongoDB session（可选）
 * @returns {Promise<Object>} 更新结果
 */
export async function moveQuestionToBank(questionId, newBankId, userId, session = null) {
  const Question = (await import('../models/Question.js')).default;
  const QuestionBank = (await import('../models/QuestionBank.js')).default;

  const operation = async (txnSession) => {
    // 查找题目
    const question = await Question.findById(questionId).session(txnSession);
    if (!question) {
      throw new NotFoundError('题目不存在');
    }

    // 验证新题库是否存在
    const newBank = await QuestionBank.findById(newBankId).session(txnSession);
    if (!newBank) {
      throw new NotFoundError('目标题库不存在');
    }

    const oldBankId = question.bankId;

    // 更新题目的题库
    question.bankId = newBankId;
    await question.save({ session: txnSession });

    // 更新旧题库计数（如果存在）
    if (oldBankId) {
      await QuestionBank.findByIdAndUpdate(
        oldBankId,
        { $inc: { questionCount: -1 } },
        { session: txnSession }
      );
    }

    // 更新新题库计数
    await QuestionBank.findByIdAndUpdate(
      newBankId,
      { $inc: { questionCount: 1 } },
      { session: txnSession }
    );

    info('题目移动到新题库', {
      questionId,
      oldBankId,
      newBankId,
    });

    return { questionId, oldBankId, newBankId };
  };

  if (session) {
    return await operation(session);
  } else {
    return await withTransaction(operation);
  }
}

/**
 * 创建学习记录并更新错题本（事务）
 * @param {Object} recordData - 记录数据
 * @param {Object} session - MongoDB session（可选）
 * @returns {Promise<Object>} 创建结果
 */
export async function createRecordWithWrongQuestionUpdate(recordData, session = null) {
  const Record = (await import('../models/Record.js')).default;
  const WrongQuestion = (await import('../models/WrongQuestion.js')).default;

  const operation = async (txnSession) => {
    // 创建记录
    const record = await Record.create([recordData], { session: txnSession });
    const createdRecord = record[0];

    // 如果答错了，添加到错题本
    if (!recordData.isCorrect) {
      await WrongQuestion.findOneAndUpdate(
        {
          userId: recordData.userId,
          questionId: recordData.questionId,
        },
        {
          userId: recordData.userId,
          questionId: recordData.questionId,
          recordId: createdRecord._id,
          lastWrongAt: new Date(),
          wrongCount: { $inc: 1 },
        },
        {
          upsert: true,
          session: txnSession,
          new: true,
        }
      );
    } else {
      // 如果答对了，从错题本中移除
      await WrongQuestion.deleteOne(
        {
          userId: recordData.userId,
          questionId: recordData.questionId,
        },
        { session: txnSession }
      );
    }

    return createdRecord;
  };

  if (session) {
    return await operation(session);
  } else {
    return await withTransaction(operation);
  }
}

