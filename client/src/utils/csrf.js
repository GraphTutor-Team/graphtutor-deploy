/**
 * GraphTutor V3.0 - CSRF Token工具
 * 
 * 功能：获取和管理CSRF token，自动添加到请求中
 */

import api from '../api/api';

let csrfToken = null;
let tokenPromise = null;

/**
 * 从cookie获取CSRF token
 * @returns {string|null} CSRF token
 */
export function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  
  // 尝试从cookie读取
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' || name === 'xsrf-token') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

/**
 * 从服务器获取CSRF token
 * @returns {Promise<string>} CSRF token
 */
export async function fetchCsrfToken() {
  try {
    const response = await api.get('/auth/csrf-token');
    const token = response.data?.csrfToken || getCsrfTokenFromCookie();
    
    if (token) {
      csrfToken = token;
      return token;
    }
    
    throw new Error('无法获取CSRF token');
  } catch (error) {
    console.error('获取CSRF token失败:', error);
    // 尝试从cookie读取
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      return cookieToken;
    }
    throw error;
  }
}

/**
 * 获取CSRF token（带缓存）
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<string>} CSRF token
 */
export async function getCsrfToken(forceRefresh = false) {
  // 如果已有token且不强制刷新，直接返回
  if (csrfToken && !forceRefresh) {
    return csrfToken;
  }

  // 尝试从cookie读取
  const cookieToken = getCsrfTokenFromCookie();
  if (cookieToken && !forceRefresh) {
    csrfToken = cookieToken;
    return cookieToken;
  }

  // 如果正在获取token，等待完成
  if (tokenPromise) {
    return tokenPromise;
  }

  // 获取新token
  tokenPromise = fetchCsrfToken().finally(() => {
    tokenPromise = null;
  });

  return tokenPromise;
}

/**
 * 清除CSRF token缓存
 */
export function clearCsrfToken() {
  csrfToken = null;
  tokenPromise = null;
}

/**
 * 设置CSRF token到请求头
 * @param {Object} config - Axios请求配置
 * @returns {Promise<Object>} 更新后的配置
 */
export async function addCsrfTokenToRequest(config) {
  // 只对修改数据的请求添加CSRF token
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(config.method?.toUpperCase())) {
    return config;
  }

  try {
    const token = await getCsrfToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['X-XSRF-TOKEN'] = token;
    }
  } catch (error) {
    console.warn('添加CSRF token失败:', error);
    // 继续请求，让后端处理
  }

  return config;
}

/**
 * 初始化CSRF token（应用启动时调用）
 */
export async function initCsrfToken() {
  try {
    await getCsrfToken();
  } catch (error) {
    console.warn('初始化CSRF token失败:', error);
  }
}

