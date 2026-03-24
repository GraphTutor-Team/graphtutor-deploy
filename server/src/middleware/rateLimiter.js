/**
 * GraphTutor V3.0 - 请求限流中间件
 * 
 * 功能：防止API滥用，限制请求频率
 * 使用内存存储（生产环境建议使用Redis）
 */

/**
 * 简单的内存限流器
 * @param {Object} options - 配置选项
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求数
 * @param {string} options.message - 限流时的错误消息
 * @returns {Function} Express中间件
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 默认15分钟
    max = 100, // 默认最多100次请求
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => {
      // 默认使用IP地址作为key
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  } = options;

  // 内存存储（生产环境建议使用Redis）
  const store = new Map();

  // 定期清理过期记录
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (value.resetTime < now) {
        store.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = store.get(key);

    if (!record || record.resetTime < now) {
      // 创建新记录
      store.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (record.count >= max) {
      // 超过限制
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: message,
        retryAfter,
        resetTime: new Date(record.resetTime).toISOString()
      });
    }

    // 增加计数
    record.count++;
    next();
  };
}

/**
 * 默认的API限流器（15分钟内最多100次请求）
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'API请求过于频繁，请稍后再试'
});

/**
 * 严格的限流器（用于登录等敏感操作）
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '操作过于频繁，请15分钟后再试'
});

/**
 * 基于用户的限流器
 */
export function createUserRateLimiter(options = {}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      // 优先使用用户ID，否则使用IP
      return req.user?.id || req.ip || 'unknown';
    }
  });
}

