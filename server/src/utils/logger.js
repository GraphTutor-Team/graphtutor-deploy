/**
 * GraphTutor V3.0 - 日志工具
 * 
 * 功能：统一的日志记录工具，支持不同级别的日志
 */

/**
 * 日志级别
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

/**
 * 当前日志级别（可通过环境变量配置）
 */
const currentLogLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

/**
 * 格式化日志消息
 */
function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (data) {
    return `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`;
  }
  return `${prefix} ${message}`;
}

/**
 * 错误日志
 */
export function error(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message, data));
  }
}

/**
 * 警告日志
 */
export function warn(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, data));
  }
}

/**
 * 信息日志
 */
export function info(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.log(formatLog('INFO', message, data));
  }
}

/**
 * 调试日志
 */
export function debug(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.log(formatLog('DEBUG', message, data));
  }
}

/**
 * API请求日志
 */
export function apiLog(req, res, duration) {
  const logData = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || 'anonymous',
  };

  if (res.statusCode >= 500) {
    error(`API ${req.method} ${req.url}`, logData);
  } else if (res.statusCode >= 400) {
    warn(`API ${req.method} ${req.url}`, logData);
  } else if (duration > 1000) {
    warn(`Slow API ${req.method} ${req.url}`, logData);
  } else {
    info(`API ${req.method} ${req.url}`, logData);
  }
}

/**
 * 数据库查询日志
 */
export function dbLog(operation, collection, duration, data = null) {
  if (duration > 500) {
    warn(`Slow DB query: ${operation} on ${collection}`, {
      duration: `${duration}ms`,
      ...data,
    });
  } else {
    debug(`DB query: ${operation} on ${collection}`, {
      duration: `${duration}ms`,
      ...data,
    });
  }
}

