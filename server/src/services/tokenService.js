/**
 * GraphTutor V3.0 - Token服务
 * 
 * 功能：管理JWT access token和refresh token的生成、验证、刷新
 */

import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '../config.js';
import { error as logError, info } from '../utils/logger.js';

// Access token有效期：15分钟
const ACCESS_TOKEN_EXPIRES_IN = '15m';
// Refresh token有效期：30天（存储在数据库中）

/**
 * 生成access token
 * @param {Object} user - 用户对象
 * @returns {string} access token
 */
export function generateAccessToken(user) {
  const payload = {
    id: user._id?.toString() || user.id,
    userId: user._id?.toString() || user.id,
    _id: user._id?.toString() || user.id,
    role: user.role || 'student',
    email: user.email,
    type: 'access', // 标记为access token
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

/**
 * 生成refresh token并存储到数据库
 * @param {Object} user - 用户对象
 * @param {Object} deviceInfo - 设备信息 { userAgent, ip }
 * @returns {Promise<string>} refresh token
 */
export async function generateRefreshToken(user, deviceInfo = {}) {
  try {
    const userId = user._id || user.id;
    const token = await RefreshToken.createToken(userId, deviceInfo);
    return token;
  } catch (err) {
    logError('生成refresh token失败', { error: err.message });
    throw new Error('生成refresh token失败');
  }
}

/**
 * 验证access token
 * @param {string} token - access token
 * @returns {Object|null} payload或null
 */
export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    
    // 确保是access token
    if (payload.type !== 'access') {
      return null;
    }
    
    return payload;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { expired: true };
    }
    return null;
  }
}

/**
 * 验证refresh token
 * @param {string} token - refresh token
 * @returns {Promise<Object|null>} token文档或null
 */
export async function verifyRefreshToken(token) {
  try {
    const tokenDoc = await RefreshToken.verifyToken(token);
    return tokenDoc;
  } catch (err) {
    logError('验证refresh token失败', { error: err.message });
    return null;
  }
}

/**
 * 刷新access token
 * @param {string} refreshTokenString - refresh token
 * @returns {Promise<Object>} { accessToken, refreshToken } 或 null
 */
export async function refreshTokens(refreshTokenString) {
  try {
    // 验证refresh token
    const tokenDoc = await verifyRefreshToken(refreshTokenString);
    if (!tokenDoc) {
      return null;
    }

    const user = tokenDoc.userId;
    if (!user) {
      return null;
    }

    // 生成新的access token
    const accessToken = generateAccessToken(user);

    // 可选：刷新refresh token（每次刷新都生成新的refresh token，旧token自动失效）
    // 或者：保持原refresh token不变，只刷新access token
    // 这里采用保持原refresh token的方式，减少数据库操作
    
    return {
      accessToken,
      refreshToken: refreshTokenString, // 返回原refresh token
    };
  } catch (err) {
    logError('刷新token失败', { error: err.message });
    return null;
  }
}

/**
 * 撤销refresh token（登出时使用）
 * @param {string} refreshTokenString - refresh token
 * @returns {Promise<boolean>} 是否成功
 */
export async function revokeRefreshToken(refreshTokenString) {
  try {
    const result = await RefreshToken.revokeToken(refreshTokenString);
    return !!result;
  } catch (err) {
    logError('撤销refresh token失败', { error: err.message });
    return false;
  }
}

/**
 * 撤销用户的所有refresh token（修改密码、账户安全等场景）
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否成功
 */
export async function revokeUserRefreshTokens(userId) {
  try {
    const result = await RefreshToken.revokeUserTokens(userId);
    return result.modifiedCount > 0;
  } catch (err) {
    logError('撤销用户所有refresh token失败', { error: err.message });
    return false;
  }
}

/**
 * 生成token对（access token + refresh token）
 * @param {Object} user - 用户对象
 * @param {Object} deviceInfo - 设备信息
 * @returns {Promise<Object>} { accessToken, refreshToken }
 */
export async function generateTokenPair(user, deviceInfo = {}) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user, deviceInfo);
  
  return {
    accessToken,
    refreshToken,
  };
}

/**
 * 从请求中提取设备信息
 * @param {Object} req - Express请求对象
 * @returns {Object} 设备信息
 */
export function extractDeviceInfo(req) {
  return {
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: req.ip || req.connection.remoteAddress || 'unknown',
  };
}

