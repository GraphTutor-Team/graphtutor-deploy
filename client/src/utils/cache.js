/**
 * GraphTutor V3.0 - 数据缓存工具
 * 
 * 功能：提供数据缓存机制，减少API请求
 */

const CACHE_PREFIX = 'graphtutor_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 缓存项结构
 */
class CacheItem {
  constructor(data, ttl = DEFAULT_TTL) {
    this.data = data;
    this.expiresAt = Date.now() + ttl;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

/**
 * 内存缓存
 */
const memoryCache = new Map();

/**
 * 设置缓存
 */
export function setCache(key, data, ttl = DEFAULT_TTL) {
  const cacheKey = CACHE_PREFIX + key;
  const item = new CacheItem(data, ttl);
  
  // 内存缓存
  memoryCache.set(cacheKey, item);
  
  // 本地存储缓存（仅存储小数据）
  try {
    if (data && JSON.stringify(data).length < 100000) { // 小于100KB
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        expiresAt: item.expiresAt,
      }));
    }
  } catch (e) {
    console.warn('LocalStorage cache failed:', e);
  }
}

/**
 * 获取缓存
 */
export function getCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  
  // 先检查内存缓存
  const memoryItem = memoryCache.get(cacheKey);
  if (memoryItem && !memoryItem.isExpired()) {
    return memoryItem.data;
  }
  
  // 检查本地存储
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const item = JSON.parse(stored);
      if (item.expiresAt > Date.now()) {
        // 恢复到内存缓存
        memoryCache.set(cacheKey, new CacheItem(item.data, item.expiresAt - Date.now()));
        return item.data;
      } else {
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (e) {
    console.warn('LocalStorage cache read failed:', e);
  }
  
  return null;
}

/**
 * 清除缓存
 */
export function clearCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  memoryCache.delete(cacheKey);
  try {
    localStorage.removeItem(cacheKey);
  } catch (e) {
    console.warn('LocalStorage cache clear failed:', e);
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache() {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('LocalStorage cache clear all failed:', e);
  }
}

/**
 * 清理过期缓存
 */
export function cleanExpiredCache() {
  // 清理内存缓存
  memoryCache.forEach((item, key) => {
    if (item.isExpired()) {
      memoryCache.delete(key);
    }
  });
  
  // 清理本地存储
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (item.expiresAt <= Date.now()) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (e) {
    console.warn('LocalStorage cache clean failed:', e);
  }
}

// 定期清理过期缓存
setInterval(cleanExpiredCache, 60000); // 每分钟清理一次

