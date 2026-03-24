/**
 * GraphTutor V3.0 - 表单验证工具
 * 
 * 功能：提供统一的表单验证逻辑
 */

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { valid: false, message: '邮箱不能为空' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }

  return { valid: true, message: '' };
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @param {Object} options - 选项
 * @returns {Object} { valid: boolean, message: string, strength: string }
 */
export function validatePassword(password, options = {}) {
  const {
    minLength = 6,
    maxLength = 50,
    requireUppercase = false,
    requireLowercase = false,
    requireNumber = false,
    requireSpecial = false,
  } = options;

  if (!password || !password.trim()) {
    return { valid: false, message: '密码不能为空', strength: 'none' };
  }

  if (password.length < minLength) {
    return { 
      valid: false, 
      message: `密码至少需要 ${minLength} 个字符`, 
      strength: 'weak' 
    };
  }

  if (password.length > maxLength) {
    return { 
      valid: false, 
      message: `密码不能超过 ${maxLength} 个字符`, 
      strength: 'weak' 
    };
  }

  // 检查密码强度
  let strength = 'weak';
  let checks = 0;

  if (/[a-z]/.test(password)) checks++;
  if (/[A-Z]/.test(password)) checks++;
  if (/[0-9]/.test(password)) checks++;
  if (/[^a-zA-Z0-9]/.test(password)) checks++;

  if (checks >= 3) strength = 'strong';
  else if (checks >= 2) strength = 'medium';

  // 检查必需字符类型
  const errors = [];
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('至少包含一个大写字母');
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('至少包含一个小写字母');
  }
  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('至少包含一个数字');
  }
  if (requireSpecial && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('至少包含一个特殊字符');
  }

  if (errors.length > 0) {
    return { 
      valid: false, 
      message: errors.join('，'), 
      strength: 'weak' 
    };
  }

  return { valid: true, message: '', strength };
}

/**
 * 验证题目内容
 * @param {string} content - 题目内容
 * @param {Object} options - 选项
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateQuestionContent(content, options = {}) {
  const { minLength = 5, maxLength = 2000 } = options;

  if (!content || !content.trim()) {
    return { valid: false, message: '题干不能为空' };
  }

  if (content.trim().length < minLength) {
    return { valid: false, message: `题干至少需要 ${minLength} 个字符` };
  }

  if (content.length > maxLength) {
    return { valid: false, message: `题干不能超过 ${maxLength} 个字符` };
  }

  return { valid: true, message: '' };
}

/**
 * 验证题目选项
 * @param {Array<string>} options - 选项数组
 * @param {Object} config - 配置
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateQuestionOptions(options, config = {}) {
  const { minCount = 2, maxCount = 10, minLength = 1, maxLength = 500 } = config;

  if (!Array.isArray(options)) {
    return { valid: false, message: '选项必须是数组' };
  }

  if (options.length < minCount) {
    return { valid: false, message: `至少需要 ${minCount} 个选项` };
  }

  if (options.length > maxCount) {
    return { valid: false, message: `选项不能超过 ${maxCount} 个` };
  }

  // 检查每个选项是否为空
  const emptyOptions = options.filter(opt => !opt || !opt.trim());
  if (emptyOptions.length > 0) {
    return { valid: false, message: '选项不能为空' };
  }

  // 检查选项长度
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (opt.length < minLength) {
      return { valid: false, message: `选项 ${i + 1} 至少需要 ${minLength} 个字符` };
    }
    if (opt.length > maxLength) {
      return { valid: false, message: `选项 ${i + 1} 不能超过 ${maxLength} 个字符` };
    }
  }

  return { valid: true, message: '' };
}

/**
 * 验证正确答案索引
 * @param {number} answerIndex - 答案索引
 * @param {number} optionsCount - 选项数量
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateAnswerIndex(answerIndex, optionsCount) {
  if (typeof answerIndex !== 'number' || isNaN(answerIndex)) {
    return { valid: false, message: '答案索引必须是数字' };
  }

  if (answerIndex < 0 || answerIndex >= optionsCount) {
    return { valid: false, message: '答案索引超出范围' };
  }

  return { valid: true, message: '' };
}

/**
 * 验证学科代码
 * @param {string} subjectCode - 学科代码
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateSubjectCode(subjectCode) {
  if (!subjectCode || !subjectCode.trim()) {
    return { valid: false, message: '学科代码不能为空' };
  }

  if (subjectCode.length > 50) {
    return { valid: false, message: '学科代码不能超过 50 个字符' };
  }

  return { valid: true, message: '' };
}

/**
 * 验证题库名称
 * @param {string} name - 题库名称
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateBankName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: '题库名称不能为空' };
  }

  if (name.trim().length < 2) {
    return { valid: false, message: '题库名称至少需要 2 个字符' };
  }

  if (name.length > 100) {
    return { valid: false, message: '题库名称不能超过 100 个字符' };
  }

  return { valid: true, message: '' };
}

/**
 * 验证难度值
 * @param {number} difficulty - 难度值
 * @param {Object} options - 选项
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateDifficulty(difficulty, options = {}) {
  const { min = 1, max = 5 } = options;

  if (typeof difficulty !== 'number' || isNaN(difficulty)) {
    return { valid: false, message: '难度必须是数字' };
  }

  if (difficulty < min || difficulty > max) {
    return { valid: false, message: `难度必须在 ${min}-${max} 之间` };
  }

  return { valid: true, message: '' };
}

/**
 * 验证必填字段
 * @param {Object} data - 数据对象
 * @param {Array<string>} requiredFields - 必填字段列表
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateRequiredFields(data, requiredFields) {
  const errors = {};

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      errors[field] = `${field} 不能为空`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

