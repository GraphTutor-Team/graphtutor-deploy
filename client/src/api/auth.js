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

/** 获取 GitHub OAuth 授权 URL，用于跳转登录 */
export const getGitHubOAuthUrl = () => api.get('/auth/oauth/github/url').then(r => r.data);

/**
 * 更新用户信息
 * @param {Object} data - 用户信息
 * @returns {Promise} API响应
 */
export const updateProfile = (data) => api.put('/auth/me', data).then(r=>r.data);
