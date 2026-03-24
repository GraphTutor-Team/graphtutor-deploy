/**
 * GraphTutor V3.0 - API客户端基础配置
 * 
 * 作用：封装Axios实例，统一配置baseURL、token认证、请求拦截器和错误处理
 * 关联页面：
 *   - 全站使用 (所有API调用都使用此实例)
 *   - api/*.js (所有API客户端文件)
 *   - constants/index.js (API配置常量)
 * 技术栈：
 *   - Axios (HTTP客户端)
 *   - 请求拦截器 (添加token)
 *   - 响应拦截器 (统一错误处理)
 *   - Token管理 (多key兼容)
 */

import axios from "axios";
import { API_CONFIG } from "../constants/index.js";

// 兼容多个 token key：优先 gt_token，其次老的 token / authToken
const TOKEN_KEYS = API_CONFIG.TOKEN_KEYS;

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

// 读取本地 token（兼容旧 key）
export function getStoredToken() {
  if (typeof window === "undefined") return null;
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

// 写入 / 清除 token：所有 key 都同步一次，保证旧代码不炸
export function setStoredToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    TOKEN_KEYS.forEach((k) => window.localStorage.setItem(k, token));
  } else {
    TOKEN_KEYS.forEach((k) => window.localStorage.removeItem(k));
  }
}

// 请求拦截：自动带上 Authorization 头和 CSRF token
api.interceptors.request.use(
  async (config) => {
    const token = getStoredToken();
    if (token) {
      // eslint-disable-next-line no-param-reassign
      config.headers = config.headers || {};
      // eslint-disable-next-line no-param-reassign
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加CSRF token（异步）
    const { addCsrfTokenToRequest } = await import('../utils/csrf.js');
    return addCsrfTokenToRequest(config);
  },
  (error) => Promise.reject(error)
);

// 响应拦截：401 兜底；503 统一为「后端未启动」提示
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      console.warn("API 401 未授权:", error.config?.url);
    }
    if (error?.response?.status === 503) {
      const msg = error.response?.data?.message || error.response?.data?.error;
      error.message = msg || "后端服务未启动，请在项目根目录运行: npm run server";
    }
    return Promise.reject(error);
  }
);

export default api;
