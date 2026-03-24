/**
 * GraphTutor V3.0 - 请求验证中间件
 * 
 * 功能：统一验证请求参数、查询参数和请求体
 */

import { createValidator, ValidationRules, CommonSchemas } from '../utils/validator.js';
import { ValidationError } from '../utils/errorHandler.js';

/**
 * 验证请求体
 * @param {Object} schema - 验证模式 { field: [rules] }
 * @returns {Function} Express中间件
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const validator = createValidator();
    
    if (!validator.validateObject(req.body, schema)) {
      const errors = validator.getErrors();
      return next(new ValidationError('请求体验证失败', errors));
    }

    next();
  };
}

/**
 * 验证查询参数
 * @param {Object} schema - 验证模式 { field: [rules] }
 * @returns {Function} Express中间件
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const validator = createValidator();
    
    if (!validator.validateObject(req.query, schema)) {
      const errors = validator.getErrors();
      return next(new ValidationError('查询参数验证失败', errors));
    }

    // 将验证后的值写回req.query
    for (const [field, rules] of Object.entries(schema)) {
      if (req.query[field] !== undefined) {
        // 如果是数字类型，转换类型
        const firstRule = Array.isArray(rules) ? rules[0] : rules;
        if (firstRule === ValidationRules.number.integer || 
            firstRule === ValidationRules.number.min ||
            firstRule === ValidationRules.number.max) {
          req.query[field] = Number(req.query[field]);
        }
      }
    }

    next();
  };
}

/**
 * 验证路径参数
 * @param {Object} schema - 验证模式 { field: [rules] }
 * @returns {Function} Express中间件
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const validator = createValidator();
    
    if (!validator.validateObject(req.params, schema)) {
      const errors = validator.getErrors();
      return next(new ValidationError('路径参数验证失败', errors));
    }

    next();
  };
}

/**
 * 验证文件上传
 * @param {Object} options - 选项
 * @param {number} options.maxSize - 最大文件大小（字节）
 * @param {string[]} options.allowedTypes - 允许的文件类型
 * @param {number} options.maxFiles - 最大文件数量
 * @returns {Function} Express中间件
 */
export function validateFile(options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 默认5MB
    allowedTypes = [],
    maxFiles = 1,
  } = options;

  return (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return next(new ValidationError('未上传文件'));
    }

    if (files.length > maxFiles) {
      return next(new ValidationError(`最多只能上传 ${maxFiles} 个文件`));
    }

    for (const file of files) {
      // 检查文件大小
      if (file.size > maxSize) {
        return next(new ValidationError(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`));
      }

      // 检查文件类型
      if (allowedTypes.length > 0) {
        const fileType = file.mimetype || file.type;
        if (!allowedTypes.includes(fileType)) {
          return next(new ValidationError(`不支持的文件类型: ${fileType}`));
        }
      }
    }

    next();
  };
}

/**
 * 组合验证（同时验证body、query、params）
 * @param {Object} schemas - 验证模式 { body, query, params }
 * @returns {Function} Express中间件
 */
export function validate(schemas) {
  const middlewares = [];

  if (schemas.body) {
    middlewares.push(validateBody(schemas.body));
  }

  if (schemas.query) {
    middlewares.push(validateQuery(schemas.query));
  }

  if (schemas.params) {
    middlewares.push(validateParams(schemas.params));
  }

  return (req, res, next) => {
    let index = 0;
    const runNext = (err) => {
      if (err) return next(err);
      index++;
      if (index < middlewares.length) {
        middlewares[index](req, res, runNext);
      } else {
        next();
      }
    };
    if (middlewares.length > 0) {
      middlewares[0](req, res, runNext);
    } else {
      next();
    }
  };
}

// 导出常用验证模式
export { CommonSchemas, ValidationRules };

