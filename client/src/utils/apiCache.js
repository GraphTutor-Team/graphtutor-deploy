/**
 * GraphTutor V3.0 - API缓存装饰器
 * 
 * 功能：为API请求添加缓存功能
 */

import { getCache, setCache, clearCache } from './cache.js';

/**
 * 带缓存的API请求
 */
export async function cachedApiRequest(apiFunction, cacheKey, options = {}) {
  const { ttl = 5 * 60 * 1000, forceRefresh = false } = options;
  
  // 如果不强制刷新，先检查缓存
  if (!forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }
  
  // 执行API请求
  try {
    const data = await apiFunction();
    
    // 缓存结果
    setCache(cacheKey, data, ttl);
    
    return data;
  } catch (error) {
    // 如果请求失败，尝试返回缓存数据
    const cached = getCache(cacheKey);
    if (cached !== null) {
      console.warn('API request failed, using cached data:', error);
      return cached;
    }
    throw error;
  }
}

/**
 * 生成缓存键
 */
export function generateCacheKey(prefix, params = {}) {
  const paramStr = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}_${paramStr}`;
}

