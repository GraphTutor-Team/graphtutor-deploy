/**
 * GraphTutor V3.0 - OAuth 回调页（方式1：URL 带 token 重定向）
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setStoredToken } from "../api/api";
import { setStoredRefreshToken } from "../utils/tokenRefresh";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const customMessage = searchParams.get("message");
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const needsAccountLink = searchParams.get("needsAccountLink");
    const bindSuccess = searchParams.get("bindSuccess");

    if (error) {
      const messages = {
        github_not_configured: "GitHub 登录未配置",
        wechat_not_configured: "微信登录未配置",
        missing_code: "授权未完成",
        token_exchange_failed: "获取访问权限失败",
        user_fetch_failed: "获取用户信息失败",
        server_error: "服务器错误，请稍后重试",
        github_email_conflict: "该 GitHub 已绑定其他邮箱账号，请在个人中心绑定或联系管理员",
        bind_failed: customMessage
          ? decodeURIComponent(customMessage)
          : "绑定失败",
      };
      setMessage(messages[error] || decodeURIComponent(customMessage || error));
      setStatus("error");
      return;
    }

    if (accessToken && refreshToken) {
      setStoredToken(accessToken);
      setStoredRefreshToken(refreshToken);

      if (bindSuccess === "github" || bindSuccess === "wechat") {
        window.location.replace("/profile?bindSuccess=1");
        return;
      }

      if (needsAccountLink === "1") {
        window.location.replace("/account/link");
        return;
      }

      setStatus("success");
      window.location.replace("/home");
      return;
    }

    setMessage("未收到登录凭证");
    setStatus("error");
  }, [searchParams]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 text-center space-y-4">
          <div className="text-red-500 text-lg font-medium">{message}</div>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 text-center">
        <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600">登录成功，正在跳转…</p>
      </div>
    </div>
  );
}
