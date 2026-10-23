/**
 * GraphTutor V3.0 - 认证中间件
 * 
 * 作用：提供JWT token验证、用户认证和管理员权限检查的中间件
 * 关联页面：
 *   - routes/*.js (所有路由文件，使用此中间件)
 *   - models/User.js (用户模型)
 *   - config.js (JWT密钥配置)
 * 技术栈：
 *   - JWT (jsonwebtoken)
 *   - Express中间件
 *   - Token解析和验证
 *   - 权限检查
 */

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { JWT_SECRET } from "../config.js";

/**
 * 从请求中解析 token：
 * - Authorization: Bearer xxx
 * - cookies.token
 * - query.token
 */
function getTokenFromReq(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    return authHeader.slice(7).trim();
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}

async function attachUserFromToken(req) {
  const token = getTokenFromReq(req);
  if (!token) return { ok: false, reason: "missing" };

  const payload = jwt.verify(token, JWT_SECRET);
  const userId =
    payload.id ||
    payload._id ||
    payload.userId ||
    payload.sub ||
    payload.uid;

  let userDoc = null;
  if (userId) {
    try {
      userDoc = await User.findById(userId).lean();
    } catch (dbErr) {
      console.error("数据库查询失败:", dbErr.message);
    }
  }

  const baseUser = userDoc || payload || {};
  let userRole = baseUser.role || payload.role || "student";
  if (userRole === "user") {
    userRole = "student";
  }

  req.user = {
    id: baseUser._id?.toString?.() || baseUser.id || userId || null,
    email: baseUser.email || payload.email || null,
    role: userRole,
    isAdmin:
      baseUser.isAdmin === true ||
      userRole === "admin" ||
      payload.isAdmin === true,
  };
  return { ok: true };
}

/**
 * 认证中间件：验证 JWT，挂 req.user
 */
export async function requireAuth(req, res, next) {
  try {
    const result = await attachUserFromToken(req);
    if (!result.ok) {
      return res.status(401).json({
        message: result.reason === "missing" ? "未提供认证 token" : "token 无效或已过期",
      });
    }
    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      console.error("JWT 验证失败:", err.message);
      return res.status(401).json({ message: "token 无效或已过期" });
    }
    console.error("requireAuth 中间件错误:", err.message);
    return res.status(500).json({ message: "认证失败，请稍后重试" });
  }
}

/** 有合法登录就挂上 req.user；没有或无效时继续，由路由自己决定要不要拒绝。 */
export async function optionalAuth(req, res, next) {
  try {
    await attachUserFromToken(req);
  } catch (err) {
    if (err.name !== "JsonWebTokenError" && err.name !== "TokenExpiredError") {
      console.error("optionalAuth 中间件错误:", err.message);
    }
  }
  return next();
}

/**
 * 管理员权限：
 * - req.user.isAdmin === true
 * - 或者 req.user.role === 'admin'
 * V3.0: 保持向后兼容，逻辑不变
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "未认证用户" });
  }

  if (req.user.isAdmin || req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "需要管理员权限" });
}

/**
 * V3.0 新增：出题负责人权限中间件
 * - req.user.role === 'question_manager' 或 'admin'
 */
export function requireQuestionManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "未认证用户" });
  }

  const allowedRoles = ["question_manager", "admin"];
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({ message: "需要出题负责人或管理员权限" });
}

/**
 * V3.0 新增：通用角色权限中间件
 * @param {string[]} allowedRoles - 允许的角色数组
 * @returns {Function} Express中间件函数
 * 
 * 使用示例：
 * router.get('/path', requireRole(['admin', 'question_manager']), handler);
 */
export function requireRole(allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error("requireRole: allowedRoles 必须是非空数组");
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "未认证用户" });
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      message: `需要以下角色之一: ${allowedRoles.join(", ")}`,
    });
  };
}
