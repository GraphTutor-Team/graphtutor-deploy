/**
 * GraphTutor V3.0 - CSRF保护中间件
 * 
 * 功能：防止跨站请求伪造攻击（CSRF）
 * 使用Double Submit Cookie模式（适合SPA应用）
 */

import crypto from 'crypto';
import { ForbiddenError } from '../utils/errorHandler.js';
import { warn } from '../utils/logger.js';

// CSRF token配置
const CSRF_TOKEN_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_TOKEN_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_TOKEN_EXPIRES = 24 * 60 * 60 * 1000; // 24小时

/**
 * 是否对 Cookie 启用 Secure（仅 HTTPS 下浏览器才会保存/发送）
 * HTTP 部署（如公网 IP:5000）必须为 false，否则 CSRF 双提交失败 → 403
 */
export function shouldUseSecureCookies() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;

  const baseUrl = (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    ""
  ).replace(/\/$/, "");

  if (baseUrl.startsWith("https://")) return true;
  if (baseUrl.startsWith("http://")) return false;

  return process.env.NODE_ENV === "production";
}

/**
 * 生成CSRF token
 * @returns {string} CSRF token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 验证CSRF token
 * @param {string} cookieToken - Cookie中的token
 * @param {string} headerToken - Header中的token
 * @returns {boolean} 是否有效
 */
export function verifyCsrfToken(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Double Submit Cookie模式：比较两个token是否相同
  return cookieToken === headerToken && cookieToken.length > 0;
}

/**
 * 设置CSRF token到cookie
 * @param {Object} res - Express响应对象
 * @param {string} token - CSRF token
 */
export function setCsrfTokenCookie(res, token) {
  res.cookie(CSRF_TOKEN_COOKIE_NAME, token, {
    httpOnly: false, // 需要前端 JavaScript 访问
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: CSRF_TOKEN_EXPIRES,
    path: "/",
  });
}

/**
 * 从请求中获取CSRF token
 * @param {Object} req - Express请求对象
 * @returns {Object} { cookieToken, headerToken }
 */
export function getCsrfTokens(req) {
  // 从cookie获取（浏览器自动发送）
  const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME] || 
                      req.cookies?.['XSRF-TOKEN'];
  
  // 从header获取（前端手动发送）
  const headerToken = req.headers[CSRF_TOKEN_HEADER_NAME.toLowerCase()] ||
                      req.headers['x-xsrf-token'] ||
                      req.body?._csrf ||
                      req.query?._csrf;

  return { cookieToken, headerToken };
}

/**
 * CSRF保护中间件
 * 验证请求中的CSRF token
 *
 * 排除的请求：
 * - GET, HEAD, OPTIONS请求（只读操作）
 * - 健康检查端点
 * - 静态资源
 * - 小程序请求（带 X-Client: miniprogram 头，无法使用 Cookie 双提交）
 */
export function csrfProtection(req, res, next) {
  // 只保护修改数据的请求
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 小程序端请求：无法携带 Cookie，豁免 CSRF（通过自定义头识别）
  const isMiniprogram = req.headers['x-client'] === 'miniprogram';
  if (isMiniprogram) {
    return next();
  }

  // 排除健康检查等端点（挂载在 /api 下时 req.path 为 /auth/...）
  const excludedPaths = ["/health", "/auth/csrf-token"];
  if (excludedPaths.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
    return next();
  }

  // 获取CSRF token
  const { cookieToken, headerToken } = getCsrfTokens(req);

  // 验证token
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    warn('CSRF验证失败', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token验证失败',
      code: 'CSRF_ERROR',
    });
  }

  return next();
}

/**
 * 生成并返回CSRF token的端点
 * 前端首次加载时调用此接口获取token
 */
export function csrfTokenHandler(req, res) {
  const token = generateCsrfToken();
  
  // 设置cookie
  setCsrfTokenCookie(res, token);

  // 返回token（前端也可以从cookie读取）
  return res.json({
    success: true,
    csrfToken: token,
  });
}

/**
 * 可选：为所有响应自动设置CSRF token cookie
 * 如果请求中没有CSRF token cookie，自动生成并设置
 */
export function csrfTokenMiddleware(req, res, next) {
  const { cookieToken } = getCsrfTokens(req);

  // 如果没有token，生成新的
  if (!cookieToken) {
    const token = generateCsrfToken();
    setCsrfTokenCookie(res, token);
  }

  return next();
}

