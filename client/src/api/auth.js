/**
 * GraphTutor V3.0 - 认证API客户端
 * 
 * 作用：提供用户认证相关的API调用函数，包括登录和注册
 * 关联页面：
 *   - pages/Login.jsx (登录页面)
 *   - pages/Register.jsx (注册页面)
 *   - context/AuthContext.jsx (认证上下文，使用此API)
 *   - api/api.js (API基础配置)
 * 技术栈：
 *   - Axios (HTTP请求)
 *   - RESTful API
 *   - Promise链式调用
 */

import api from './api';
export const login = (data) => api.post('/auth/login', data).then(r=>r.data);
export const register = (data) => api.post('/auth/register', data).then(r=>r.data);

/** 获取 GitHub OAuth 授权 URL；mode=bind 时绑定到当前登录账号 */
export const getGitHubOAuthUrl = (mode = "login") =>
  api.get(`/auth/oauth/github/url${mode === "bind" ? "?mode=bind" : ""}`).then((r) => r.data);

/** 获取微信 OAuth 授权 URL */
export const getWechatOAuthUrl = (mode = "login") =>
  api.get(`/auth/oauth/wechat/url${mode === "bind" ? "?mode=bind" : ""}`).then((r) => r.data);

/** 将 OAuth 临时账号合并到已有邮箱账号 */
export const linkExistingAccount = (data) =>
  api.post("/auth/account/link-existing", data).then((r) => r.data);

/**
 * 更新用户信息
 * @param {Object} data - 用户信息
 * @returns {Promise} API响应
 */
export const updateProfile = (data) => api.put('/auth/me', data).then(r=>r.data);
