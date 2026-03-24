/**
 * GraphTutor V3.0 - Redis缓存适配器
 * 
 * 功能：提供与内存缓存兼容的Redis缓存接口
 */

import { getRedisClient, isRedisAvailable } from './redis.js';
import { getCache as getMemoryCache, setCache as setMemoryCache } from './cache.js';
import { error as logError, info, warn } from './logger.js';

/**
 * 设置缓存（Redis优先，内存缓存作为后备）
 * @param {string} key - 缓存键
 * @param {*} value - 缓存值
 * @param {number} ttl - 过期时间（毫秒）
 */
export async function setCache(key, value, ttl = 5 * 60 * 1000) {
  const client = getRedisClient();
  
  if (client) {
    try {
      // 序列化值
      const serialized = JSON.stringify(value);
      
      // 设置到Redis（TTL转换为秒）
      const ttlSeconds = Math.ceil(ttl / 1000);
      await client.setEx(key, ttlSeconds, serialized);
      
      info(`Redis缓存设置: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (err) {
      logError('Redis缓存设置失败', { key, error: err.message });
      // 降级到内存缓存
      setMemoryCache(key, value, ttl);
    }
  } else {
    // 使用内存缓存
    setMemoryCache(key, value, ttl);
  }
}

/**
 * 获取缓存（Redis优先，内存缓存作为后备）
 * @param {string} key - 缓存键
 * @returns {Promise<*>} 缓存值或null
 */
export async function getCache(key) {
  const client = getRedisClient();
  
  if (client) {
    try {
      const serialized = await client.get(key);
      
      if (serialized === null) {
        // Redis中没有，尝试内存缓存
        return getMemoryCache(key);
      }
      
      // 反序列化
      const value = JSON.parse(serialized);
      info(`Redis缓存命中: ${key}`);
      return value;
    } catch (err) {
      logError('Redis缓存获取失败', { key, error: err.message });
      // 降级到内存缓存
      return getMemoryCache(key);
    }
  } else {
    // 使用内存缓存
    return getMemoryCache(key);
  }
}

/**
 * 检查缓存是否存在
 * @param {string} key - 缓存键
 * @returns {Promise<boolean>}
 */
export async function hasCache(key) {
  const client = getRedisClient();
  
  if (client) {
    try {
      const exists = await client.exists(key);
      return exists === 1;
    } catch (err) {
      logError('Redis缓存检查失败', { key, error: err.message });
      return false;
    }
  } else {
    return getMemoryCache(key) !== null;
  }
}

/**
 * 删除缓存
 * @param {string} key - 缓存键
 * @returns {Promise<boolean>}
 */
export async function deleteCache(key) {
  const client = getRedisClient();
  
  if (client) {
    try {
      const deleted = await client.del(key);
      return deleted > 0;
    } catch (err) {
      logError('Redis缓存删除失败', { key, error: err.message });
      return false;
    }
  } else {
    // 使用内存缓存
    const { deleteCache: deleteMemoryCache } = await import('./cache.js');
    return deleteMemoryCache(key);
  }
}

/**
 * 批量删除缓存（支持模式匹配）
 * @param {string} pattern - 匹配模式（如 'api:*'）
 * @returns {Promise<number>} 删除的数量
 */
export async function deleteCacheByPattern(pattern) {
  const client = getRedisClient();
  
  if (client) {
    try {
      // Redis使用SCAN和DEL
      const keys = [];
      for await (const key of client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(key);
      }
      
      if (keys.length > 0) {
        await client.del(keys);
        info(`Redis批量删除缓存: ${pattern}，删除了 ${keys.length} 项`);
        return keys.length;
      }
      
      return 0;
    } catch (err) {
      logError('Redis批量删除缓存失败', { pattern, error: err.message });
      return 0;
    }
  } else {
    // 使用内存缓存
    const { deleteCacheByPattern: deleteMemoryByPattern } = await import('./cache.js');
    return deleteMemoryByPattern(pattern);
  }
}

/**
 * 清除所有缓存（谨慎使用）
 * @returns {Promise<boolean>}
 */
export async function clearCache() {
  const client = getRedisClient();
  
  if (client) {
    try {
      await client.flushDb();
      warn('Redis缓存已全部清除');
      return true;
    } catch (err) {
      logError('Redis清除缓存失败', { error: err.message });
      return false;
    }
  } else {
    const { clearCache: clearMemoryCache } = await import('./cache.js');
    clearMemoryCache();
    return true;
  }
}

/**
 * 获取缓存统计信息
 * @returns {Promise<Object>}
 */
export async function getCacheStats() {
  const client = getRedisClient();
  
  if (client) {
    try {
      const info = await client.info('stats');
      const keyspace = await client.info('keyspace');
      const dbSize = await client.dbSize();
      
      // 解析Redis信息
      const stats = {
        type: 'redis',
        connected: true,
        dbSize,
        info: {
          totalKeys: dbSize,
        },
      };
      
      return stats;
    } catch (err) {
      logError('获取Redis统计失败', { error: err.message });
      return { type: 'redis', connected: false };
    }
  } else {
    const { getCacheStats: getMemoryStats } = await import('./cache.js');
    return { type: 'memory', ...getMemoryStats() };
  }
}

/**
 * 设置缓存（同步版本，用于兼容现有代码）
 * @param {string} key - 缓存键
 * @param {*} value - 缓存值
 * @param {number} ttl - 过期时间（毫秒）
 */
export function setCacheSync(key, value, ttl = 5 * 60 * 1000) {
  // 异步执行，不阻塞
  setCache(key, value, ttl).catch(err => {
    logError('异步缓存设置失败', { key, error: err.message });
  });
}

/**
 * 获取缓存（同步版本，用于兼容现有代码）
 * 注意：Redis是异步的，此方法可能返回null，建议使用异步版本
 * @param {string} key - 缓存键
 * @returns {*} 缓存值或null
 */
export function getCacheSync(key) {
  // Redis是异步的，这里只能返回内存缓存
  return getMemoryCache(key);
}

