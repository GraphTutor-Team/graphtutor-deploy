/**
 * GraphTutor V3.0 - Token自动刷新工具
 * 
 * 功能：自动检测token过期并刷新，避免用户频繁登录
 */

import api from '../api/api';
import { getStoredToken, setStoredToken } from '../api/api';

const REFRESH_TOKEN_KEY = 'gt_refresh_token';
let isRefreshing = false;
let refreshPromise = null;

/**
 * 获取存储的refresh token
 */
export function getStoredRefreshToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 存储refresh token
 */
export function setStoredRefreshToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * 清除所有token
 */
export function clearAllTokens() {
  setStoredToken(null);
  setStoredRefreshToken(null);
}

/**
 * 刷新access token
 * @returns {Promise<string|null>} 新的access token或null
 */
async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await api.post('/auth/refresh', { refreshToken });
    const data = response.data;

    if (data.success && data.accessToken) {
      // 更新access token
      setStoredToken(data.accessToken);
      
      // 如果返回了新的refresh token，也更新它
      if (data.refreshToken) {
        setStoredRefreshToken(data.refreshToken);
      }

      return data.accessToken;
    }

    return null;
  } catch (error) {
    console.error('刷新token失败:', error);
    // 刷新失败，清除所有token
    clearAllTokens();
    return null;
  }
}

/**
 * 带自动刷新的API请求
 * 当遇到401错误时，自动尝试刷新token并重试请求
 */
export function setupTokenRefreshInterceptor() {
  // 响应拦截器：处理401错误并自动刷新token
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // 如果是401错误且不是刷新token的请求，尝试刷新token
      if (error.response?.status === 401 && !originalRequest._retry) {
        // 如果已经在刷新中，等待刷新完成
        if (isRefreshing) {
          try {
            const newToken = await refreshPromise;
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        // 标记正在刷新
        isRefreshing = true;
        originalRequest._retry = true;

        // 开始刷新token
        refreshPromise = refreshAccessToken();

        try {
          const newToken = await refreshPromise;
          
          if (newToken) {
            // 刷新成功，重试原请求
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            isRefreshing = false;
            refreshPromise = null;
            return api(originalRequest);
          } else {
            // 刷新失败，清除token并跳转登录
            clearAllTokens();
            isRefreshing = false;
            refreshPromise = null;
            
            // 触发登录页面跳转（由应用层处理）
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.dispatchEvent(new CustomEvent('auth:token-expired'));
            }
            
            return Promise.reject(error);
          }
        } catch (refreshError) {
          isRefreshing = false;
          refreshPromise = null;
          clearAllTokens();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
}

/**
 * 检查token是否即将过期（提前5分钟刷新）
 * @param {string} token - JWT token
 * @returns {boolean} 是否即将过期
 */
export function isTokenExpiringSoon(token) {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // 转换为毫秒
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // 如果剩余时间少于5分钟，认为即将过期
    return exp - now < fiveMinutes;
  } catch (error) {
    console.error('解析token失败:', error);
    return true;
  }
}

/**
 * 主动刷新token（在token即将过期时调用）
 */
export async function proactiveRefreshToken() {
  const accessToken = getStoredToken();
  const refreshToken = getStoredRefreshToken();

  if (!accessToken || !refreshToken) {
    return false;
  }

  // 如果token即将过期，主动刷新
  if (isTokenExpiringSoon(accessToken)) {
    const newToken = await refreshAccessToken();
    return !!newToken;
  }

  return false;
}

