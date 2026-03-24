/**
 * GraphTutor V3.0 - Redis连接和客户端
 * 
 * 功能：管理Redis连接，提供Redis客户端实例
 */

import { createClient } from 'redis';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB, REDIS_URL, USE_REDIS } from '../config.js';
import { error as logError, info, warn } from './logger.js';

let redisClient = null;
let isConnected = false;

/**
 * 创建Redis客户端
 * @returns {Promise<Object>} Redis客户端
 */
export async function createRedisClient() {
  if (!USE_REDIS) {
    warn('Redis未启用，使用内存缓存');
    return null;
  }

  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    const clientOptions = REDIS_URL 
      ? { url: REDIS_URL }
      : {
          socket: {
            host: REDIS_HOST,
            port: REDIS_PORT,
          },
          password: REDIS_PASSWORD || undefined,
          database: REDIS_DB,
        };

    const client = createClient(clientOptions);

    // 错误处理
    client.on('error', (err) => {
      logError('Redis客户端错误', { error: err.message });
      isConnected = false;
    });

    // 连接成功
    client.on('connect', () => {
      info('Redis连接中...');
    });

    client.on('ready', () => {
      info('Redis已就绪');
      isConnected = true;
    });

    client.on('end', () => {
      warn('Redis连接已关闭');
      isConnected = false;
    });

    // 连接Redis
    await client.connect();
    
    redisClient = client;
    return client;
  } catch (err) {
    logError('Redis连接失败', { error: err.message });
    warn('将使用内存缓存作为后备');
    return null;
  }
}

/**
 * 获取Redis客户端（如果已连接）
 * @returns {Object|null} Redis客户端
 */
export function getRedisClient() {
  return (redisClient && isConnected) ? redisClient : null;
}

/**
 * 关闭Redis连接
 */
export async function closeRedisConnection() {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      info('Redis连接已关闭');
    } catch (err) {
      logError('关闭Redis连接失败', { error: err.message });
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
}

/**
 * 检查Redis是否可用
 * @returns {boolean}
 */
export function isRedisAvailable() {
  return USE_REDIS && redisClient && isConnected;
}

/**
 * 初始化Redis连接
 */
export async function initRedis() {
  if (!USE_REDIS) {
    return null;
  }

  try {
    const client = await createRedisClient();
    if (client) {
      // 测试连接
      await client.ping();
      info('Redis初始化成功');
      return client;
    }
  } catch (err) {
    logError('Redis初始化失败', { error: err.message });
    return null;
  }
}

