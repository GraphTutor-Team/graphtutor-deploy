// server/src/middleware/validation.js
// 输入验证与清理中间件：防止 XSS、NoSQL 注入、ReDoS 等安全风险

/**
 * 验证并清理字符串输入
 * @param {string} str - 待验证的字符串
 * @param {object} options - 验证选项
 * @returns {string|null} - 清理后的字符串或 null
 */
export function sanitizeString(str, options = {}) {
  if (str == null) return null;
  if (typeof str !== 'string') return String(str);

  const {
    maxLength = 1000,
    trim = true,
    allowEmpty = false,
  } = options;

  let cleaned = str;
  if (trim) {
    cleaned = cleaned.trim();
  }

  // 限制长度防止 ReDoS
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  if (!allowEmpty && cleaned.length === 0) {
    return null;
  }

  return cleaned;
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * 验证并清理正则查询字符串（防止 ReDoS）
 */
export function sanitizeRegexQuery(query, maxLength = 100) {
  if (!query || typeof query !== 'string') return null;
  const cleaned = query.trim().slice(0, maxLength);
  
  // 转义特殊字符，防止正则注入
  return cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 验证整数范围
 */
export function validateInt(value, options = {}) {
  const {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    defaultValue = null,
  } = options;

  if (value == null) return defaultValue;
  
  const num = parseInt(value, 10);
  if (!Number.isFinite(num)) return defaultValue;
  
  if (num < min || num > max) return defaultValue;
  
  return num;
}

/**
 * 验证并清理数组
 */
export function sanitizeArray(arr, options = {}) {
  if (!Array.isArray(arr)) return [];
  
  const {
    maxLength = 1000,
    itemValidator = null,
  } = options;

  let cleaned = arr.slice(0, maxLength);
  
  if (itemValidator && typeof itemValidator === 'function') {
    cleaned = cleaned.filter(itemValidator);
  }
  
  return cleaned;
}

/**
 * 中间件：验证请求体中的邮箱字段
 */
export function validateEmailField(fieldName = 'email') {
  return (req, res, next) => {
    const email = req.body?.[fieldName];
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: `无效的邮箱格式：${fieldName}`,
      });
    }
    next();
  };
}

/**
 * 中间件：验证并清理查询参数中的搜索字符串
 */
export function sanitizeSearchQuery(fieldName = 'q') {
  return (req, res, next) => {
    if (req.query?.[fieldName]) {
      req.query[fieldName] = sanitizeRegexQuery(req.query[fieldName], 100);
    }
    next();
  };
}

/**
 * 中间件：验证分页参数
 */
export function validatePagination() {
  return (req, res, next) => {
    if (req.query?.skip) {
      req.query.skip = validateInt(req.query.skip, {
        min: 0,
        max: 10000,
        defaultValue: 0,
      });
    }
    if (req.query?.limit) {
      req.query.limit = validateInt(req.query.limit, {
        min: 1,
        max: 100,
        defaultValue: 20,
      });
    }
    next();
  };
}

