/**
 * GraphTutor V3.0 - 请求限流中间件
 *
 * 环境变量（server/.env）：
 *   RATE_LIMIT_DISABLED=true     关闭限流（仅建议开发/演示服务器）
 *   RATE_LIMIT_WINDOW_MS=900000  窗口毫秒，默认 15 分钟
 *   RATE_LIMIT_API_MAX=100       全 API 上限（默认 100/窗口）
 *   RATE_LIMIT_STRICT_MAX=5      登录等敏感接口上限（默认 5/窗口）
 */

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';

export const RATE_LIMIT_WINDOW_MS = parsePositiveInt(
  process.env.RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000,
);

export const RATE_LIMIT_API_MAX = parsePositiveInt(
  process.env.RATE_LIMIT_API_MAX,
  100,
);

export const RATE_LIMIT_STRICT_MAX = parsePositiveInt(
  process.env.RATE_LIMIT_STRICT_MAX,
  5,
);

/** 从 X-Forwarded-For 或 socket 取客户端 IP（Docker/反代后 trust proxy 须开启） */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * 简单的内存限流器
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = RATE_LIMIT_WINDOW_MS,
    max = 100,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = getClientIp,
  } = options;

  const store = new Map();

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
      store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: message,
        message,
        retryAfter,
        resetTime: new Date(record.resetTime).toISOString(),
      });
    }

    record.count++;
    next();
  };
}

/** 关闭限流时的空中间件 */
export function noopRateLimiter(req, res, next) {
  next();
}

/**
 * 默认的 API 限流器
 */
export const apiRateLimiter = RATE_LIMIT_DISABLED
  ? noopRateLimiter
  : createRateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_API_MAX,
    message: 'API请求过于频繁，请稍后再试',
  });

/**
 * 严格的限流器（用于登录等敏感操作）
 */
export const strictRateLimiter = RATE_LIMIT_DISABLED
  ? noopRateLimiter
  : createRateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_STRICT_MAX,
    message: '操作过于频繁，请15分钟后再试',
  });

/**
 * 基于用户的限流器
 */
export function createUserRateLimiter(options = {}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => req.user?.id || getClientIp(req) || 'unknown',
  });
}
