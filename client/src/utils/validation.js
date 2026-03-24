/**
 * GraphTutor V3.0 - 表单验证工具函数
 * 
 * 功能：提供统一的表单验证方法
 */

/**
 * 验证邮箱格式
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * 验证学科代码格式（大写字母、数字、连字符）
 */
export function validateSubjectCode(code) {
  const re = /^[A-Z0-9-]+$/;
  return re.test(code);
}

/**
 * 验证题目ID格式（SUBJECT_CODE-YEAR-SEQ）
 */
export function validateQuestionId(qid) {
  const re = /^[A-Z0-9-]+-\d{4}-\d+$/;
  return re.test(qid);
}

/**
 * 验证颜色格式（十六进制）
 */
export function validateColor(color) {
  const re = /^#[0-9A-Fa-f]{6}$/;
  return re.test(color);
}

/**
 * 验证难度值（1-5）
 */
export function validateDifficulty(difficulty) {
  const num = parseInt(difficulty);
  return !isNaN(num) && num >= 1 && num <= 5;
}

/**
 * 验证必填字段
 */
export function validateRequired(value, fieldName = '字段') {
  if (value === null || value === undefined || value === '') {
    return `${fieldName}不能为空`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName}不能为空`;
  }
  return null;
}

/**
 * 验证字符串长度
 */
export function validateLength(value, min, max, fieldName = '字段') {
  if (value === null || value === undefined) {
    return null;
  }
  const length = typeof value === 'string' ? value.length : String(value).length;
  if (min && length < min) {
    return `${fieldName}至少需要${min}个字符`;
  }
  if (max && length > max) {
    return `${fieldName}不能超过${max}个字符`;
  }
  return null;
}

/**
 * 验证数字范围
 */
export function validateNumberRange(value, min, max, fieldName = '字段') {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return `${fieldName}必须是数字`;
  }
  if (min !== undefined && num < min) {
    return `${fieldName}不能小于${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName}不能大于${max}`;
  }
  return null;
}

/**
 * 验证题目选项
 */
export function validateQuestionOptions(options, answerIndex) {
  if (!Array.isArray(options)) {
    return '选项必须是数组';
  }
  
  const validOptions = options.filter((opt) => opt && opt.trim());
  if (validOptions.length < 2) {
    return '至少需要2个有效选项';
  }
  
  if (answerIndex < 0 || answerIndex >= validOptions.length) {
    return '正确答案索引无效';
  }
  
  return null;
}

/**
 * 组合多个验证函数
 */
export function validateAll(value, validators, fieldName) {
  for (const validator of validators) {
    const error = validator(value, fieldName);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * 验证表单数据
 */
export function validateForm(formData, rules) {
  const errors = {};
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = formData[field];
    
    for (const rule of fieldRules) {
      const error = rule(value, field);
      if (error) {
        errors[field] = error;
        break; // 只显示第一个错误
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

