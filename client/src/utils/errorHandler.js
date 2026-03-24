/**
 * GraphTutor V3.0 - 统一错误处理工具
 * 
 * 作用：统一处理各种类型的错误，包括API错误、表单验证错误、网络错误等，提供友好的错误提示
 * 关联页面：
 *   - 全站使用 (所有需要错误处理的页面)
 *   - api/*.js (API调用，使用错误处理)
 *   - utils/toast.js (显示错误提示)
 * 技术栈：
 *   - 错误分类处理
 *   - 错误消息提取
 *   - Toast通知集成
 */

import { toast } from './toast';

/**
 * API错误处理
 * @param {Error} error - 错误对象
 * @param {string} defaultMessage - 默认错误消息
 * @param {Object} options - 选项
 * @returns {string} 错误消息
 */
export function handleApiError(error, defaultMessage = '操作失败', options = {}) {
  const { 
    showToast = true, 
    logError = true,
    extractMessage = true 
  } = options;

  let message = defaultMessage;

  if (extractMessage) {
    // 优先使用后端返回的错误消息
    if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.response?.data?.error) {
      message = error.response.data.error;
    } else if (error?.message) {
      message = error.message;
    } else if (error?.response?.status) {
      // 根据HTTP状态码提供友好提示
      const statusMessages = {
        400: '请求参数错误',
        401: '未授权，请重新登录',
        403: '权限不足',
        404: '资源不存在',
        409: '数据冲突，请检查后重试',
        422: '数据验证失败',
        429: '请求过于频繁，请稍后再试',
        500: '服务器错误，请稍后再试',
        502: '网关错误，请稍后再试',
        503: '服务暂时不可用',
      };
      message = statusMessages[error.response.status] || `请求失败 (${error.response.status})`;
    }
  }

  if (logError) {
    console.error('API Error:', {
      message,
      error,
      url: error?.config?.url,
      status: error?.response?.status,
      data: error?.response?.data,
    });
  }

  if (showToast) {
    toast.error(message);
  }

  return message;
}

/**
 * 表单验证错误处理
 * @param {Object} errors - 验证错误对象
 * @param {Object} options - 选项
 */
export function handleValidationError(errors, options = {}) {
  const { showToast = true, showFirstOnly = true } = options;

  if (!errors || Object.keys(errors).length === 0) {
    return;
  }

  let message = '';
  
  if (showFirstOnly) {
    // 只显示第一个错误
    const firstKey = Object.keys(errors)[0];
    message = errors[firstKey];
  } else {
    // 显示所有错误
    message = Object.entries(errors)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  if (showToast && message) {
    toast.error(message);
  }

  return errors;
}

/**
 * 网络错误处理
 * @param {Error} error - 错误对象
 * @param {string} defaultMessage - 默认错误消息
 */
export function handleNetworkError(error, defaultMessage = '网络连接失败，请检查网络设置') {
  if (error?.code === 'ECONNABORTED') {
    toast.error('请求超时，请稍后再试');
  } else if (error?.message?.includes('Network Error')) {
    toast.error(defaultMessage);
  } else {
    handleApiError(error, defaultMessage);
  }
}

/**
 * 权限错误处理
 * @param {Error} error - 错误对象
 * @param {Function} onUnauthorized - 未授权回调
 */
export function handlePermissionError(error, onUnauthorized) {
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    toast.error('权限不足，请检查您的角色权限');
    if (onUnauthorized && typeof onUnauthorized === 'function') {
      onUnauthorized();
    }
  } else {
    handleApiError(error);
  }
}

/**
 * 提取API响应数据（统一处理不同格式的响应）
 * @param {Object} response - API响应对象
 * @param {string} dataPath - 数据路径（如 'data.items'）
 * @returns {*} 提取的数据
 */
export function extractApiData(response, dataPath = null) {
  if (!response) return null;

  const data = response.data || response;

  if (dataPath) {
    const paths = dataPath.split('.');
    let result = data;
    for (const path of paths) {
      if (result && typeof result === 'object' && path in result) {
        result = result[path];
      } else {
        return null;
      }
    }
    return result;
  }

  // 默认提取逻辑
  if (data.success !== false && (data.data || data.items || data.result)) {
    return data.data || data.items || data.result;
  }

  return data;
}

/**
 * 创建错误对象（用于表单验证）
 * @param {string} field - 字段名
 * @param {string} message - 错误消息
 * @returns {Object} 错误对象
 */
export function createFieldError(field, message) {
  return { [field]: message };
}

/**
 * 合并多个错误对象
 * @param {...Object} errors - 错误对象列表
 * @returns {Object} 合并后的错误对象
 */
export function mergeErrors(...errors) {
  return Object.assign({}, ...errors.filter(Boolean));
}

