/**
 * GraphTutor V3.0 - 服务器端缓存服务
 * 
 * 功能：提供内存缓存机制，减少数据库查询和API响应时间
 */

import { info, warn } from './logger.js';

/**
 * 缓存项类
 */
class CacheItem {
  constructor(data, ttl) {
    this.data = data;
    this.createdAt = Date.now();
    this.expiresAt = Date.now() + ttl;
    this.hits = 0;
    this.lastAccessed = Date.now();
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  hit() {
    this.hits++;
    this.lastAccessed = Date.now();
  }
}

/**
 * LRU缓存类（最近最少使用）
 */
class LRUCache {
  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };

    // 定期清理过期项
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟清理一次
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, new CacheItem(value, ttl));
    this.stats.sets++;
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值或null
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (item.isExpired()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    item.hit();
    this.stats.hits++;
    return item.data;
  }

  /**
   * 检查缓存是否存在且未过期
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item || item.isExpired()) {
      if (item) this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {boolean} 是否删除成功
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  /**
   * 删除最久未使用的项（LRU策略）
   */
  evictLRU() {
    if (this.cache.size === 0) return;

    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 清理过期项
   */
  cleanup() {
    let cleaned = 0;
    for (const [key, item] of this.cache.entries()) {
      if (item.isExpired()) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      info(`缓存清理完成，删除了 ${cleaned} 个过期项`);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      ...this.stats,
    };
  }

  /**
   * 获取缓存项详情
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存项详情
   */
  getItemInfo(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    return {
      key,
      age: Date.now() - item.createdAt,
      expiresIn: item.expiresAt - Date.now(),
      hits: item.hits,
      lastAccessed: item.lastAccessed,
      isExpired: item.isExpired(),
    };
  }

  /**
   * 销毁缓存（清理定时器）
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// 创建默认缓存实例
const defaultCache = new LRUCache(1000, 5 * 60 * 1000); // 最多1000项，默认5分钟过期

/**
 * 设置缓存
 * @param {string} key - 缓存键
 * @param {*} value - 缓存值
 * @param {number} ttl - 过期时间（毫秒）
 * @param {LRUCache} cache - 缓存实例（可选）
 */
export function setCache(key, value, ttl = 5 * 60 * 1000, cache = defaultCache) {
  cache.set(key, value, ttl);
}

/**
 * 获取缓存
 * @param {string} key - 缓存键
 * @param {LRUCache} cache - 缓存实例（可选）
 * @returns {*} 缓存值或null
 */
export function getCache(key, cache = defaultCache) {
  return cache.get(key);
}

/**
 * 检查缓存是否存在
 * @param {string} key - 缓存键
 * @param {LRUCache} cache - 缓存实例（可选）
 * @returns {boolean}
 */
export function hasCache(key, cache = defaultCache) {
  return cache.has(key);
}

/**
 * 删除缓存
 * @param {string} key - 缓存键
 * @param {LRUCache} cache - 缓存实例（可选）
 * @returns {boolean}
 */
export function deleteCache(key, cache = defaultCache) {
  return cache.delete(key);
}

/**
 * 清除所有缓存
 * @param {LRUCache} cache - 缓存实例（可选）
 */
export function clearCache(cache = defaultCache) {
  cache.clear();
}

/**
 * 获取缓存统计
 * @param {LRUCache} cache - 缓存实例（可选）
 * @returns {Object}
 */
export function getCacheStats(cache = defaultCache) {
  return cache.getStats();
}

/**
 * 创建新的缓存实例
 * @param {number} maxSize - 最大缓存项数
 * @param {number} defaultTTL - 默认过期时间（毫秒）
 * @returns {LRUCache}
 */
export function createCache(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
  return new LRUCache(maxSize, defaultTTL);
}

/**
 * 生成缓存键
 * @param {string} prefix - 前缀
 * @param {Object} params - 参数对象
 * @returns {string} 缓存键
 */
export function generateCacheKey(prefix, params = {}) {
  const paramStr = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return paramStr ? `${prefix}:${paramStr}` : prefix;
}

/**
 * 批量删除缓存（支持通配符）
 * @param {string} pattern - 匹配模式
 * @param {LRUCache} cache - 缓存实例（可选）
 * @returns {number} 删除的数量
 */
export function deleteCacheByPattern(pattern, cache = defaultCache) {
  let deleted = 0;
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));

  for (const key of cache.cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
      deleted++;
    }
  }

  return deleted;
}

// 导出默认缓存实例
export { defaultCache };

