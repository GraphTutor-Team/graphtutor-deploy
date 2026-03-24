/**
 * GraphTutor V3.0 - 统一数据验证工具
 * 
 * 功能：提供统一的数据验证规则和验证器
 */

/**
 * 验证规则定义
 */
export const ValidationRules = {
  // 字符串验证
  string: {
    required: (message = '此字段为必填项') => (value) => {
      if (value === null || value === undefined || value === '') {
        throw new Error(message);
      }
      return true;
    },
    minLength: (min, message) => (value) => {
      if (value && value.length < min) {
        throw new Error(message || `长度不能少于 ${min} 个字符`);
      }
      return true;
    },
    maxLength: (max, message) => (value) => {
      if (value && value.length > max) {
        throw new Error(message || `长度不能超过 ${max} 个字符`);
      }
      return true;
    },
    pattern: (regex, message) => (value) => {
      if (value && !regex.test(value)) {
        throw new Error(message || '格式不正确');
      }
      return true;
    },
  },

  // 数字验证
  number: {
    required: (message = '此字段为必填项') => (value) => {
      if (value === null || value === undefined || value === '') {
        throw new Error(message);
      }
      return true;
    },
    min: (min, message) => (value) => {
      const num = Number(value);
      if (!isNaN(num) && num < min) {
        throw new Error(message || `值不能小于 ${min}`);
      }
      return true;
    },
    max: (max, message) => (value) => {
      const num = Number(value);
      if (!isNaN(num) && num > max) {
        throw new Error(message || `值不能大于 ${max}`);
      }
      return true;
    },
    range: (min, max, message) => (value) => {
      const num = Number(value);
      if (!isNaN(num) && (num < min || num > max)) {
        throw new Error(message || `值必须在 ${min} 到 ${max} 之间`);
      }
      return true;
    },
    integer: (message = '必须是整数') => (value) => {
      const num = Number(value);
      if (isNaN(num) || !Number.isInteger(num)) {
        throw new Error(message);
      }
      return true;
    },
  },

  // 数组验证
  array: {
    required: (message = '此字段为必填项') => (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(message);
      }
      return true;
    },
    minLength: (min, message) => (value) => {
      if (Array.isArray(value) && value.length < min) {
        throw new Error(message || `至少需要 ${min} 项`);
      }
      return true;
    },
    maxLength: (max, message) => (value) => {
      if (Array.isArray(value) && value.length > max) {
        throw new Error(message || `最多只能有 ${max} 项`);
      }
      return true;
    },
  },

  // 对象验证
  object: {
    required: (message = '此字段为必填项') => (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(message);
      }
      return true;
    },
  },

  // 邮箱验证
  email: (value, message = '邮箱格式不正确') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value.trim())) {
      throw new Error(message);
    }
    return true;
  },

  // URL验证
  url: (value, message = 'URL格式不正确') => {
    try {
      if (value && new URL(value)) {
        return true;
      }
    } catch {
      throw new Error(message);
    }
    return true;
  },

  // ObjectId验证
  objectId: (value, message = '无效的ID格式') => {
    if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
      throw new Error(message);
    }
    return true;
  },

  // 枚举值验证
  enum: (allowedValues, message) => (value) => {
    if (value && !allowedValues.includes(value)) {
      throw new Error(message || `值必须是以下之一: ${allowedValues.join(', ')}`);
    }
    return true;
  },
};

/**
 * 验证器类
 */
export class Validator {
  constructor() {
    this.errors = [];
  }

  /**
   * 验证单个值
   * @param {*} value - 要验证的值
   * @param {Function[]} rules - 验证规则数组
   * @param {string} fieldName - 字段名（用于错误消息）
   * @returns {boolean} 是否通过验证
   */
  validate(value, rules, fieldName = '') {
    if (!Array.isArray(rules)) {
      rules = [rules];
    }

    for (const rule of rules) {
      try {
        if (typeof rule === 'function') {
          rule(value);
        } else if (typeof rule === 'object' && rule.validator) {
          rule.validator(value);
        }
      } catch (error) {
        const errorMessage = fieldName 
          ? `${fieldName}: ${error.message}`
          : error.message;
        this.errors.push(errorMessage);
        return false;
      }
    }

    return true;
  }

  /**
   * 验证对象
   * @param {Object} data - 要验证的数据对象
   * @param {Object} schema - 验证模式 { field: [rules] }
   * @returns {boolean} 是否通过验证
   */
  validateObject(data, schema) {
    this.errors = [];
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      if (!this.validate(value, rules, field)) {
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * 获取验证错误
   * @returns {string[]} 错误消息数组
   */
  getErrors() {
    return this.errors;
  }

  /**
   * 获取第一个错误
   * @returns {string|null} 第一个错误消息
   */
  getFirstError() {
    return this.errors.length > 0 ? this.errors[0] : null;
  }

  /**
   * 清除错误
   */
  clear() {
    this.errors = [];
  }

  /**
   * 是否有错误
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }
}

/**
 * 创建验证器实例
 * @returns {Validator}
 */
export function createValidator() {
  return new Validator();
}

/**
 * 常用验证模式
 */
export const CommonSchemas = {
  // 邮箱验证
  email: [
    ValidationRules.string.required('邮箱不能为空'),
    ValidationRules.email,
    ValidationRules.string.maxLength(254, '邮箱长度不能超过254个字符'),
  ],

  // 密码验证
  password: [
    ValidationRules.string.required('密码不能为空'),
    ValidationRules.string.minLength(6, '密码至少需要6个字符'),
    ValidationRules.string.maxLength(50, '密码不能超过50个字符'),
    ValidationRules.string.pattern(/^\S+$/, '密码不能包含空格'),
  ],

  // 题目内容验证
  questionContent: [
    ValidationRules.string.required('题干不能为空'),
    ValidationRules.string.minLength(5, '题干至少需要5个字符'),
    ValidationRules.string.maxLength(2000, '题干不能超过2000个字符'),
  ],

  // 题目选项验证
  questionOptions: [
    ValidationRules.array.required('至少需要2个选项'),
    ValidationRules.array.minLength(2, '至少需要2个选项'),
    ValidationRules.array.maxLength(10, '最多只能有10个选项'),
  ],

  // 难度验证
  difficulty: [
    ValidationRules.number.range(1, 5, '难度必须在1到5之间'),
  ],

  // 页码验证
  page: [
    ValidationRules.number.min(1, '页码必须大于0'),
    ValidationRules.number.integer('页码必须是整数'),
  ],

  // 每页数量验证
  limit: [
    ValidationRules.number.min(1, '每页数量必须大于0'),
    ValidationRules.number.max(100, '每页数量不能超过100'),
    ValidationRules.number.integer('每页数量必须是整数'),
  ],
};

