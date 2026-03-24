/**
 * GraphTutor V3.0 - 数据一致性检查工具
 * 
 * 功能：提供数据一致性检查和修复工具
 */

import { error as logError, warn, info } from './logger.js';

/**
 * 数据一致性检查结果
 */
export class ConsistencyCheckResult {
  constructor() {
    this.isConsistent = true;
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  addError(message, details = null) {
    this.isConsistent = false;
    this.errors.push({ message, details, timestamp: new Date() });
  }

  addWarning(message, details = null) {
    this.warnings.push({ message, details, timestamp: new Date() });
  }

  addFix(message, details = null) {
    this.fixes.push({ message, details, timestamp: new Date() });
  }

  toJSON() {
    return {
      isConsistent: this.isConsistent,
      errors: this.errors,
      warnings: this.warnings,
      fixes: this.fixes,
      summary: {
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
        fixCount: this.fixes.length,
      },
    };
  }
}

/**
 * 检查题目和题库的一致性
 * @param {Object} questionId - 题目ID
 * @param {Object} bankId - 题库ID
 * @returns {Promise<ConsistencyCheckResult>} 检查结果
 */
export async function checkQuestionBankConsistency(questionId, bankId) {
  const result = new ConsistencyCheckResult();

  try {
    const Question = (await import('../models/Question.js')).default;
    const QuestionBank = (await import('../models/QuestionBank.js')).default;

    const question = await Question.findById(questionId);
    const bank = await QuestionBank.findById(bankId);

    if (!question) {
      result.addError('题目不存在', { questionId });
      return result;
    }

    if (!bank) {
      result.addError('题库不存在', { bankId });
      return result;
    }

    // 检查题目是否属于该题库
    if (question.bankId && question.bankId.toString() !== bankId.toString()) {
      result.addError('题目不属于指定的题库', {
        questionId,
        questionBankId: question.bankId,
        expectedBankId: bankId,
      });
    }

    // 检查题库题目数量是否与实际一致
    const actualCount = await Question.countDocuments({ bankId });
    if (bank.questionCount !== actualCount) {
      result.addWarning('题库题目数量不一致', {
        bankId,
        recordedCount: bank.questionCount,
        actualCount,
      });
      result.addFix('更新题库题目数量', {
        bankId,
        newCount: actualCount,
      });
    }

  } catch (err) {
    logError('检查题目题库一致性失败', { error: err.message });
    result.addError('检查过程出错', { error: err.message });
  }

  return result;
}

/**
 * 检查用户学习记录的一致性
 * @param {string} userId - 用户ID
 * @returns {Promise<ConsistencyCheckResult>} 检查结果
 */
export async function checkUserRecordConsistency(userId) {
  const result = new ConsistencyCheckResult();

  try {
    const Record = (await import('../models/Record.js')).default;
    const WrongQuestion = (await import('../models/WrongQuestion.js')).default;

    // 检查错题本中的题目是否都有对应的记录
    const wrongQuestions = await WrongQuestion.find({ userId });
    const recordIds = new Set(
      (await Record.find({ userId }).select('_id')).map(r => r._id.toString())
    );

    for (const wq of wrongQuestions) {
      if (wq.recordId && !recordIds.has(wq.recordId.toString())) {
        result.addWarning('错题本中的记录不存在', {
          wrongQuestionId: wq._id,
          recordId: wq.recordId,
        });
      }
    }

    // 检查记录的isCorrect与错题本是否一致
    const records = await Record.find({ userId, isCorrect: false });
    for (const record of records) {
      const wrongQuestion = await WrongQuestion.findOne({
        userId,
        questionId: record.questionId,
      });

      if (!wrongQuestion) {
        result.addWarning('答错的题目未添加到错题本', {
          recordId: record._id,
          questionId: record.questionId,
        });
      }
    }

  } catch (err) {
    logError('检查用户记录一致性失败', { error: err.message });
    result.addError('检查过程出错', { error: err.message });
  }

  return result;
}

/**
 * 修复数据一致性问题
 * @param {ConsistencyCheckResult} checkResult - 检查结果
 * @param {Object} options - 选项
 * @param {boolean} options.autoFix - 是否自动修复
 * @returns {Promise<Object>} 修复结果
 */
export async function fixConsistencyIssues(checkResult, options = {}) {
  const { autoFix = false } = options;
  const fixes = [];

  if (!autoFix) {
    warn('自动修复已禁用，仅返回修复建议');
    return { fixed: false, fixes: checkResult.fixes };
  }

  try {
    // 修复题库题目数量
    for (const fix of checkResult.fixes) {
      if (fix.details && fix.details.bankId && fix.details.newCount !== undefined) {
        const QuestionBank = (await import('../models/QuestionBank.js')).default;
        await QuestionBank.findByIdAndUpdate(fix.details.bankId, {
          questionCount: fix.details.newCount,
        });
        fixes.push({
          type: 'questionBankCount',
          bankId: fix.details.bankId,
          newCount: fix.details.newCount,
        });
        info('修复题库题目数量', { bankId: fix.details.bankId });
      }
    }

    return { fixed: true, fixes };
  } catch (err) {
    logError('修复数据一致性问题失败', { error: err.message });
    throw err;
  }
}

/**
 * 检查所有数据的一致性
 * @returns {Promise<ConsistencyCheckResult>} 检查结果
 */
export async function checkAllConsistency() {
  const result = new ConsistencyCheckResult();

  try {
    const QuestionBank = (await import('../models/QuestionBank.js')).default;
    const banks = await QuestionBank.find({});

    // 检查所有题库的一致性
    for (const bank of banks) {
      const Question = (await import('../models/Question.js')).default;
      const actualCount = await Question.countDocuments({ bankId: bank._id });
      
      if (bank.questionCount !== actualCount) {
        result.addWarning('题库题目数量不一致', {
          bankId: bank._id,
          bankName: bank.name,
          recordedCount: bank.questionCount,
          actualCount,
        });
        result.addFix('更新题库题目数量', {
          bankId: bank._id,
          newCount: actualCount,
        });
      }
    }

    info('数据一致性检查完成', {
      errors: result.errors.length,
      warnings: result.warnings.length,
    });

  } catch (err) {
    logError('数据一致性检查失败', { error: err.message });
    result.addError('检查过程出错', { error: err.message });
  }

  return result;
}

