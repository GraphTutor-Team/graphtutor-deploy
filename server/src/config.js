

import dotenv from "dotenv";

dotenv.config();

// 命名导出：可以按需解构导入
export const PORT = process.env.PORT || 5000;
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "dev-refresh-secret";
export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/graphtutor";

// Redis配置
export const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;
export const REDIS_DB = parseInt(process.env.REDIS_DB || "0", 10);
export const REDIS_URL = process.env.REDIS_URL || null;
export const USE_REDIS = process.env.USE_REDIS !== 'false'; // 默认启用

// GitHub OAuth（第三方登录）
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
/** 前端根 URL，用于 OAuth 回调重定向（须与浏览器访问地址一致） */
export const FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5000";

// 微信开放平台（网站应用扫码登录）
export const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
export const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";

// 微信小程序（wx.login → jscode2session，与开放平台网站应用凭证不同）
export const MINIPROGRAM_APP_ID =
  process.env.MINIPROGRAM_APP_ID || process.env.WX_MINIPROGRAM_APPID || "";
export const MINIPROGRAM_APP_SECRET =
  process.env.MINIPROGRAM_APP_SECRET || process.env.WX_MINIPROGRAM_SECRET || "";

// 短信验证码（手机号登录）
export const SMS_CODE_TTL_SECONDS = parseInt(process.env.SMS_CODE_TTL_SECONDS || "300", 10);
export const SMS_SEND_INTERVAL_SECONDS = parseInt(process.env.SMS_SEND_INTERVAL_SECONDS || "60", 10);
export const SMS_PROVIDER = process.env.SMS_PROVIDER || "mock";

// 默认导出
const config = {
  PORT,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  MONGODB_URI,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  REDIS_URL,
  USE_REDIS,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  FRONTEND_URL,
  WECHAT_APP_ID,
  WECHAT_APP_SECRET,
  MINIPROGRAM_APP_ID,
  MINIPROGRAM_APP_SECRET,
  SMS_CODE_TTL_SECONDS,
  SMS_SEND_INTERVAL_SECONDS,
  SMS_PROVIDER,
};

export default config;
