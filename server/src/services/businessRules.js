/**
 * GraphTutor V3.0 - 业务规则验证服务
 * 
 * 功能：提供业务规则验证，确保数据符合业务逻辑
 */

import Question from '../models/Question.js';
import QuestionBank from '../models/QuestionBank.js';
import { BadRequestError, ConflictError } from '../utils/errorHandler.js';
import { log } from '../utils/logger.js';

/**
 * 业务规则验证服务类
 */
export class BusinessRules {
  /**
   * 验证题目选项数量
   * @param {Array} options - 题目选项数组
   * @param {number} minOptions - 最少选项数
   * @param {number} maxOptions - 最多选项数
   * @throws {BadRequestError}
   */
  static validateQuestionOptions(options, minOptions = 2, maxOptions = 10) {
    if (!Array.isArray(options)) {
      throw new BadRequestError('题目选项必须是数组');
    }

    if (options.length < minOptions) {
      throw new BadRequestError(`题目至少需要 ${minOptions} 个选项`);
    }

    if (options.length > maxOptions) {
      throw new BadRequestError(`题目最多只能有 ${maxOptions} 个选项`);
    }

    // 检查选项是否为空
    const emptyOptions = options.filter(opt => !opt || opt.trim().length === 0);
    if (emptyOptions.length > 0) {
      throw new BadRequestError('题目选项不能为空');
    }

    // 检查选项是否重复
    const uniqueOptions = new Set(options.map(opt => opt.trim().toLowerCase()));
    if (uniqueOptions.size !== options.length) {
      throw new BadRequestError('题目选项不能重复');
    }
  }

  /**
   * 验证题目答案索引
   * @param {number} answerIndex - 答案索引
   * @param {Array} options - 题目选项数组
   * @throws {BadRequestError}
   */
  static validateAnswerIndex(answerIndex, options) {
    if (typeof answerIndex !== 'number' || !Number.isInteger(answerIndex)) {
      throw new BadRequestError('答案索引必须是整数');
    }

    if (answerIndex < 0) {
      throw new BadRequestError('答案索引不能为负数');
    }

    if (answerIndex >= options.length) {
      throw new BadRequestError(`答案索引 ${answerIndex} 超出选项范围（0-${options.length - 1}）`);
    }
  }

  /**
   * 验证题目难度
   * @param {number} difficulty - 难度值
   * @param {number} minDifficulty - 最小难度
   * @param {number} maxDifficulty - 最大难度
   * @throws {BadRequestError}
   */
  static validateDifficulty(difficulty, minDifficulty = 1, maxDifficulty = 5) {
    if (typeof difficulty !== 'number' || !Number.isInteger(difficulty)) {
      throw new BadRequestError('难度必须是整数');
    }

    if (difficulty < minDifficulty || difficulty > maxDifficulty) {
      throw new BadRequestError(`难度必须在 ${minDifficulty}-${maxDifficulty} 之间`);
    }
  }

  /**
   * 验证题库名称唯一性
   * @param {string} name - 题库名称
   * @param {string} ownerId - 所有者ID
   * @param {string} excludeId - 排除的题库ID（用于更新时）
   * @returns {Promise<void>}
   * @throws {ConflictError}
   */
  static async validateBankNameUnique(name, ownerId, excludeId = null) {
    const query = {
      name: name.trim(),
      ownerId: ownerId,
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingBank = await QuestionBank.findOne(query).lean();
    if (existingBank) {
      throw new ConflictError('题库名称已存在');
    }
  }

  /**
   * 验证题库是否可以删除
   * @param {Object} bank - 题库对象
   * @throws {BadRequestError}
   */
  static validateBankDeletion(bank) {
    if (!bank) {
      throw new BadRequestError('题库不存在');
    }

    // 官方题库不能删除（只能由管理员删除，但需要额外检查）
    if (bank.isOfficial) {
      throw new BadRequestError('官方题库不能删除');
    }

    // 检查是否有其他管理者
    const otherManagers = bank.managers?.filter(m => m.toString() !== bank.ownerId?.toString());
    if (otherManagers && otherManagers.length > 0) {
      throw new BadRequestError('该题库有其他管理者，无法删除');
    }
  }

  /**
   * 验证题目是否可以删除
   * @param {Object} question - 题目对象
   * @param {Object} bank - 题库对象（可选）
   * @throws {BadRequestError}
   */
  static validateQuestionDeletion(question, bank = null) {
    if (!question) {
      throw new BadRequestError('题目不存在');
    }

    // 如果题目属于官方题库，需要额外权限检查
    if (bank && bank.isOfficial) {
      throw new BadRequestError('官方题库的题目不能删除');
    }
  }

  /**
   * 验证标签格式
   * @param {Array} tags - 标签数组
   * @param {number} maxTags - 最大标签数
   * @param {number} maxTagLength - 单个标签最大长度
   * @throws {BadRequestError}
   */
  static validateTags(tags, maxTags = 10, maxTagLength = 20) {
    if (!Array.isArray(tags)) {
      throw new BadRequestError('标签必须是数组');
    }

    if (tags.length > maxTags) {
      throw new BadRequestError(`最多只能有 ${maxTags} 个标签`);
    }

    for (const tag of tags) {
      if (typeof tag !== 'string') {
        throw new BadRequestError('标签必须是字符串');
      }

      if (tag.trim().length === 0) {
        throw new BadRequestError('标签不能为空');
      }

      if (tag.length > maxTagLength) {
        throw new BadRequestError(`标签长度不能超过 ${maxTagLength} 个字符`);
      }

      // 检查标签格式（只允许字母、数字、中文、下划线、连字符）
      if (!/^[\w\u4e00-\u9fa5-]+$/.test(tag)) {
        throw new BadRequestError(`标签格式无效: ${tag}（只允许字母、数字、中文、下划线、连字符）`);
      }
    }

    // 检查标签是否重复
    const uniqueTags = new Set(tags.map(tag => tag.trim().toLowerCase()));
    if (uniqueTags.size !== tags.length) {
      throw new BadRequestError('标签不能重复');
    }
  }

  /**
   * 验证分页参数
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @param {number} maxLimit - 最大每页数量
   * @throws {BadRequestError}
   */
  static validatePagination(page, limit, maxLimit = 100) {
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) {
      throw new BadRequestError('页码必须是大于0的整数');
    }

    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
      throw new BadRequestError('每页数量必须是大于0的整数');
    }

    if (limit > maxLimit) {
      throw new BadRequestError(`每页数量不能超过 ${maxLimit}`);
    }
  }

  /**
   * 验证排序字段
   * @param {string} sortBy - 排序字段
   * @param {string[]} allowedFields - 允许的排序字段
   * @throws {BadRequestError}
   */
  static validateSortField(sortBy, allowedFields) {
    if (sortBy && !allowedFields.includes(sortBy)) {
      throw new BadRequestError(`排序字段无效，允许的字段: ${allowedFields.join(', ')}`);
    }
  }

  /**
   * 验证日期范围
   * @param {Date|string} startDate - 开始日期
   * @param {Date|string} endDate - 结束日期
   * @throws {BadRequestError}
   */
  static validateDateRange(startDate, endDate) {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        throw new BadRequestError('开始日期格式无效');
      }

      if (isNaN(end.getTime())) {
        throw new BadRequestError('结束日期格式无效');
      }

      if (start > end) {
        throw new BadRequestError('开始日期不能晚于结束日期');
      }

      // 检查日期范围是否过大（例如：超过1年）
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        throw new BadRequestError('日期范围不能超过1年');
      }
    }
  }

  /**
   * 验证文件大小
   * @param {number} fileSize - 文件大小（字节）
   * @param {number} maxSize - 最大文件大小（字节）
   * @throws {BadRequestError}
   */
  static validateFileSize(fileSize, maxSize = 10 * 1024 * 1024) {
    if (fileSize > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      throw new BadRequestError(`文件大小不能超过 ${maxSizeMB}MB`);
    }
  }

  /**
   * 验证文件类型
   * @param {string} mimeType - MIME类型
   * @param {string[]} allowedTypes - 允许的文件类型
   * @throws {BadRequestError}
   */
  static validateFileType(mimeType, allowedTypes) {
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestError(`不支持的文件类型: ${mimeType}，允许的类型: ${allowedTypes.join(', ')}`);
    }
  }
}

export default BusinessRules;

