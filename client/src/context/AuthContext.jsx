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
        const userData = data.user || data;
        if (!cancelled) {
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
        console.warn("/auth/me 失败，清除本地登录状态:", err?.message || err?.response?.status);
        // 超时或网络错误时，不清除token，允许用户继续使用（可能是后端暂时不可用）
        if (err?.message === '请求超时' || err?.code === 'ECONNABORTED') {
          console.warn("后端响应超时，但保留本地token，允许继续使用");
          // 如果有token，保留它，但不设置user（让用户以游客身份继续）
          if (!cancelled) {
            setUser(null);
            // 保留token，不清除
          }
        } else {
          // 其他错误（如401），清除登录状态
          if (!cancelled) {
            setStoredToken(null);
            setUser(null);
            setToken(null);
          }
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
    setUser(u);

    return u;
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
    setUser(u);
    return u;
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
      setUser(u);
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
    setToken(null);
    setUser(null);
  }

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
      setUser,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
