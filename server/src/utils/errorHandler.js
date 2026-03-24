/**
 * GraphTutor V3.0 - 统一错误处理工具
 * 
 * 功能：统一处理各种错误，提供友好的错误响应
 */

import { error as logError, warn } from './logger.js';

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * 未授权错误类
 */
export class UnauthorizedError extends AppError {
  constructor(message = '未授权，请重新登录') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 禁止访问错误类
 */
export class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * 未找到错误类
 */
export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * 冲突错误类
 */
export class ConflictError extends AppError {
  constructor(message = '数据冲突') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * 统一错误处理函数
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
export function handleError(err, req, res, next) {
  // 如果是应用错误，直接使用
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: err.message,
      code: err.code,
    };

    // 开发环境添加详细信息
    if (process.env.NODE_ENV === 'development') {
      response.details = err.details;
      response.stack = err.stack;
    }

    // 验证错误添加错误列表
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    logError(`API Error: ${req.method} ${req.url}`, {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
    });

    return res.status(err.statusCode).json(response);
  }

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map(e => e.message);
    const response = {
      success: false,
      error: '数据验证失败',
      code: 'VALIDATION_ERROR',
      errors,
    };

    if (process.env.NODE_ENV === 'development') {
      response.details = err.errors;
    }

    warn(`Validation Error: ${req.method} ${req.url}`, { errors });
    return res.status(400).json(response);
  }

  // ObjectId 转换错误
  if (err.name === 'CastError') {
    const response = {
      success: false,
      error: `无效的参数：${err.path || 'unknown'}`,
      code: 'INVALID_ID',
    };

    warn(`Cast Error: ${req.method} ${req.url}`, { path: err.path });
    return res.status(400).json(response);
  }

  // MongoDB 唯一键冲突
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'unknown';
    const response = {
      success: false,
      error: `${field}已存在`,
      code: 'DUPLICATE_KEY',
      field,
    };

    warn(`Duplicate Key Error: ${req.method} ${req.url}`, { field });
    return res.status(409).json(response);
  }

  // JWT 相关错误
  if (err.name === 'JsonWebTokenError') {
    const response = {
      success: false,
      error: '无效的身份凭证，请重新登录',
      code: 'INVALID_TOKEN',
    };

    warn(`JWT Error: ${req.method} ${req.url}`);
    return res.status(401).json(response);
  }

  if (err.name === 'TokenExpiredError') {
    const response = {
      success: false,
      error: '登录已过期，请重新登录',
      code: 'TOKEN_EXPIRED',
    };

    warn(`Token Expired: ${req.method} ${req.url}`);
    return res.status(401).json(response);
  }

  // 默认错误处理
  const response = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
    code: 'INTERNAL_ERROR',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = {
      name: err.name,
      message: err.message,
    };
  }

  logError(`Unhandled Error: ${req.method} ${req.url}`, {
    error: err.message,
    stack: err.stack,
  });

  return res.status(500).json(response);
}

/**
 * 异步错误包装器
 * 用于包装异步路由处理函数，自动捕获错误
 * @param {Function} fn - 异步函数
 * @returns {Function} Express中间件函数
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 创建成功响应
 * @param {*} data - 响应数据
 * @param {string} message - 成功消息
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} 响应对象
 */
export function successResponse(data = null, message = '操作成功', statusCode = 200) {
  return {
    success: true,
    message,
    data,
    statusCode,
  };
}

/**
 * 创建分页响应
 * @param {Array} items - 数据项
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总数量
 * @param {string} message - 消息
 * @returns {Object} 分页响应对象
 */
export function paginatedResponse(items, page, limit, total, message = '获取成功') {
  return {
    success: true,
    message,
    data: items,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

