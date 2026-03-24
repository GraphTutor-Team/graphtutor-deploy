/**
 * GraphTutor V3.0 - API响应时间监控中间件
 * 
 * 功能：记录API响应时间，用于性能监控
 */

/**
 * API响应时间监控中间件
 * @param {Object} options - 配置选项
 * @param {number} options.slowThreshold - 慢请求阈值（毫秒），超过此值会记录警告（目标 < 500ms）
 * @returns {Function} Express中间件
 */
export function responseTimeLogger(options = {}) {
  const { slowThreshold = 500 } = options;

  return (req, res, next) => {
    const startTime = Date.now();

    // 在响应真正发送前设置 X-Response-Time（不能在 finish 里 setHeader，否则 ERR_HTTP_HEADERS_SENT）
    const originalEnd = res.end;
    res.end = function (...args) {
      if (!res.headersSent) {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);
      }
      return originalEnd.apply(this, args);
    };

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (duration > slowThreshold) {
        console.warn(`[SLOW >${slowThreshold}ms] ${req.method} ${req.url} - ${duration}ms - ${res.statusCode}`);
      } else {
        console.log(`[API] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
      }
    });

    next();
  };
}

/**
 * 默认的响应时间监控器（500ms 目标阈值）
 */
export const defaultResponseTimeLogger = responseTimeLogger({
  slowThreshold: 500
});

