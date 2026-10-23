/**
 * GraphTutor V3.0 - 认证上下文
 * 
 * 作用：提供全局认证状态管理，包括用户登录、登出、token刷新、用户信息更新等功能
 * 关联页面：
 *   - 全站使用 (所有需要认证的页面)
 *   - pages/Login.jsx (登录页面)
 *   - pages/Register.jsx (注册页面)
 *   - components/ProtectedRoute.jsx (路由保护组件)
 *   - api/api.js (API客户端，使用token)
 *   - utils/tokenRefresh.js (token刷新工具)
 * 技术栈：
 *   - React Context API
 *   - React Hooks (useState, useEffect, useMemo)
 *   - JWT Token管理
 *   - Token自动刷新
 *   - 多token key兼容
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { getStoredToken, setStoredToken } from "../api/api";
import { 
  getStoredRefreshToken, 
  setStoredRefreshToken, 
  clearAllTokens,
  setupTokenRefreshInterceptor,
  proactiveRefreshToken,
} from "../utils/tokenRefresh";

const AuthContext = createContext(null);
const USER_CACHE_KEY = "user";

function idOf(value, depth = 0) {
  if (value == null || value === "" || depth > 2) return "";
  if (typeof value === "object") {
    if (value.id || value._id) return idOf(value.id || value._id, depth + 1);
    const text = typeof value.toString === "function" ? value.toString() : "";
    return text && text !== "[object Object]" ? text : "";
  }
  return String(value);
}

function normalizeAuthUser(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = idOf(raw.id || raw._id || raw.userId);
  if (!id) return null;
  const { password, passwordHash, type, exp, iat, ...rest } = raw;
  return { ...rest, id, _id: id };
}

function readCachedUser() {
  if (typeof window === "undefined") return null;
  try {
    return normalizeAuthUser(JSON.parse(window.localStorage.getItem(USER_CACHE_KEY) || "null"));
  } catch {
    return null;
  }
}

function writeCachedUser(user) {
  const normalized = normalizeAuthUser(user);
  if (!normalized || typeof window === "undefined") return normalized;
  window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalized));
  return normalized;
}

function clearCachedUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_CACHE_KEY);
}

function userFromAccessToken(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return normalizeAuthUser(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken());
  const [loading, setLoading] = useState(true);

  // 初始化token刷新拦截器
  useEffect(() => {
    setupTokenRefreshInterceptor();

    // 监听token过期事件
    const handleTokenExpired = () => {
      clearAllTokens();
      clearCachedUser();
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:token-expired', handleTokenExpired);

    // 定期检查token是否即将过期（每5分钟检查一次）
    const checkInterval = setInterval(() => {
      proactiveRefreshToken().then((refreshed) => {
        if (refreshed) {
          const newToken = getStoredToken();
          if (newToken && newToken !== token) {
            setToken(newToken);
          }
        }
      });
    }, 5 * 60 * 1000); // 5分钟

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
      clearInterval(checkInterval);
    };
  }, [token]);

  // 启动：如果本地有 token，就试着拉 /auth/me
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function bootstrap() {
      const t = getStoredToken();
      if (!t) {
        setLoading(false);
        return;
      }

      // 先设置token，确保后续请求能带上
      setToken(t);

      try {
        // 设置超时（3秒，更快响应）
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('请求超时'));
          }, 3000);
        });

        const apiPromise = api.get("/auth/me");
        const res = await Promise.race([apiPromise, timeoutPromise]);
        
        clearTimeout(timeoutId);
        
        const data = res.data || {};
        // 后端返回格式为 { success: true, user: {...} }
        const userData = writeCachedUser(data.user || data) || userFromAccessToken(t);
        if (!cancelled && userData) {
          setUser(userData);
          // 确保token同步
          const currentToken = getStoredToken();
          if (currentToken && currentToken !== t) {
            setToken(currentToken);
          } else {
            setToken(t);
          }
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        const status = err?.response?.status;
        console.warn("/auth/me 失败:", err?.message || status);
        if (status === 401) {
          if (!cancelled) {
            setStoredToken(null);
            clearCachedUser();
            setUser(null);
            setToken(null);
          }
        } else if (!cancelled) {
          setUser(readCachedUser() || userFromAccessToken(t));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // 通用解析登录返回结构
  function extractLoginPayload(resData) {
    const body = resData || {};
    // 可能嵌套在 data 里面
    const root = body.data && typeof body.data === "object" ? body.data : body;

    const tokenCandidate =
      root.token ||
      root.accessToken ||
      root.jwt ||
      root.id_token ||
      (root.auth && (root.auth.token || root.auth.accessToken));

    const refreshTokenCandidate =
      root.refreshToken ||
      (root.auth && root.auth.refreshToken);

    // 后端返回格式为 { success: true, token, refreshToken, user: {...} }
    const userCandidate =
      root.user || root.profile || root.account || null;

    return { 
      token: tokenCandidate, 
      refreshToken: refreshTokenCandidate,
      user: userCandidate 
    };
  }

  // 登录封装：推荐 Login.jsx 调用这个
  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });

    if (res.data?.success === false) {
      throw new Error(res.data?.message || "登录失败");
    }

    const { token: t, refreshToken: rt, user: u } = extractLoginPayload(res.data);

    if (!t || !u) {
      console.error("登录接口返回内容：", res.data);
      throw new Error(
        res.data?.message ||
          "登录接口返回格式不符合预期，需要包含 token 和 user。"
      );
    }

    // 统一设置token和user，确保同步
    setStoredToken(t);
    if (rt) {
      setStoredRefreshToken(rt);
    }
    setToken(t);
    const remembered = writeCachedUser(u);
    setUser(remembered);

    return remembered;
  }

  // 手机号验证码登录
  async function loginWithSms(phone, code) {
    const res = await api.post("/auth/sms/login", { phone, code });
    const { token: t, refreshToken: rt, user: u } = extractLoginPayload(res.data);

    if (!t || !u) {
      const msg = res.data?.message || "登录失败";
      throw new Error(msg);
    }

    setStoredToken(t);
    if (rt) setStoredRefreshToken(rt);
    setToken(t);
    const remembered = writeCachedUser(u);
    setUser(remembered);
    return remembered;
  }

  // 注册（如果你项目在用）
  async function register(payload) {
    const res = await api.post("/auth/register", payload);
    const { token: t, refreshToken: rt, user: u } = extractLoginPayload(res.data);

    if (t && u) {
      setStoredToken(t);
      if (rt) {
        setStoredRefreshToken(rt);
      }
      setToken(t);
      const remembered = writeCachedUser(u);
      setUser(remembered);
      return remembered;
    }

    return u;
  }

  async function logout() {
    // 调用后端登出接口，撤销refresh token
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch (error) {
        console.error("登出接口调用失败:", error);
      }
    }

    // 清除所有token和用户信息
    clearAllTokens();
    clearCachedUser();
    setToken(null);
    setUser(null);
  }

  const updateUser = useCallback((next) => {
    if (typeof next === "function") {
      setUser((prev) => {
        const resolved = next(prev);
        if (!resolved) {
          clearCachedUser();
          return null;
        }
        return writeCachedUser(resolved);
      });
      return;
    }
    if (!next) {
      clearCachedUser();
      setUser(null);
      return;
    }
    setUser(writeCachedUser(next));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      loginWithSms,
      register,
      logout,
      setUser: updateUser,
    }),
    [user, token, loading, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
