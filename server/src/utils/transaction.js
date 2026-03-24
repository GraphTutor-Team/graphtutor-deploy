/**
 * GraphTutor V3.0 - 数据库事务处理工具
 * 
 * 功能：提供统一的事务处理机制，确保数据一致性
 */

import mongoose from 'mongoose';
import { error as logError, info, warn } from './logger.js';

/**
 * 执行数据库事务
 * @param {Function} callback - 事务回调函数，接收session参数
 * @param {Object} options - 选项
 * @param {number} options.maxRetries - 最大重试次数（默认3）
 * @param {number} options.retryDelay - 重试延迟（毫秒，默认100）
 * @returns {Promise<*>} 事务执行结果
 */
export async function withTransaction(callback, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 100,
  } = options;

  let retries = 0;
  let lastError = null;

  while (retries < maxRetries) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      info('Transaction committed successfully');
      return result;
    } catch (err) {
      await session.abortTransaction();
      
      // 如果是可重试的错误（如写冲突），进行重试
      if (isRetryableError(err) && retries < maxRetries - 1) {
        retries++;
        lastError = err;
        warn(`Transaction failed, retrying (${retries}/${maxRetries})`, {
          error: err.message,
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
        continue;
      }

      // 不可重试或达到最大重试次数
      logError('Transaction failed', {
        error: err.message,
        retries,
        stack: err.stack,
      });
      throw err;
    } finally {
      await session.endSession();
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

/**
 * 判断错误是否可重试
 * @param {Error} err - 错误对象
 * @returns {boolean} 是否可重试
 */
function isRetryableError(err) {
  // MongoDB写冲突错误
  if (err.code === 11000) {
    return true;
  }

  // 网络错误
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return true;
  }

  // 事务冲突错误
  if (err.errorLabels && err.errorLabels.includes('TransientTransactionError')) {
    return true;
  }

  return false;
}

/**
 * 事务操作包装器
 * 用于包装需要事务的操作
 * @param {Function} operation - 操作函数
 * @param {Object} options - 选项
 * @returns {Function} 包装后的函数
 */
export function transactional(operation, options = {}) {
  return async (...args) => {
    return withTransaction(async (session) => {
      return await operation(...args, session);
    }, options);
  };
}

/**
 * 批量操作事务
 * 确保所有操作要么全部成功，要么全部失败
 * @param {Array<Function>} operations - 操作函数数组
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 所有操作的结果
 */
export async function batchTransaction(operations, options = {}) {
  return withTransaction(async (session) => {
    const results = [];
    
    for (const operation of operations) {
      const result = await operation(session);
      results.push(result);
    }

    return results;
  }, options);
}

/**
 * 条件事务
 * 根据条件决定是否使用事务
 * @param {Function} callback - 回调函数
 * @param {boolean} useTransaction - 是否使用事务
 * @returns {Promise<*>} 执行结果
 */
export async function conditionalTransaction(callback, useTransaction = true) {
  if (useTransaction) {
    return withTransaction(callback);
  } else {
    return await callback(null);
  }
}

/**
 * 嵌套事务支持
 * 注意：MongoDB不支持真正的嵌套事务，此函数用于模拟
 * @param {Function} callback - 回调函数
 * @param {Object} parentSession - 父事务session（可选）
 * @returns {Promise<*>} 执行结果
 */
export async function nestedTransaction(callback, parentSession = null) {
  if (parentSession) {
    // 如果已有父事务，在同一个session中执行
    return await callback(parentSession);
  } else {
    // 否则创建新事务
    return withTransaction(callback);
  }
}

/**
 * 事务超时控制
 * @param {Function} callback - 回调函数
 * @param {number} timeoutMs - 超时时间（毫秒）
 * @returns {Promise<*>} 执行结果
 */
export async function transactionWithTimeout(callback, timeoutMs = 30000) {
  return Promise.race([
    withTransaction(callback),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * 事务状态检查
 * @param {Object} session - MongoDB session
 * @returns {Object} 事务状态
 */
export function getTransactionState(session) {
  if (!session) {
    return { inTransaction: false, state: 'no-session' };
  }

  return {
    inTransaction: session.inTransaction(),
    state: session.inTransaction() ? 'active' : 'committed',
  };
}

