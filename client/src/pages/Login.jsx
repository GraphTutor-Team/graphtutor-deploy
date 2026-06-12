/**
 * GraphTutor V3.0 - 用户登录页面
 *
 * 支持：邮箱密码、GitHub OAuth
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);

  const from = location.state?.from || "/home";

  async function handleGitHubLogin() {
    setGithubBusy(true);
    setErr("");
    try {
      const { data } = await api.get("/auth/oauth/github/url");
      if (data?.success && data?.url) {
        window.location.href = data.url;
        return;
      }
      setErr("GitHub 登录暂不可用");
    } catch (e) {
      const msg = e?.response?.data?.message || "获取 GitHub 登录地址失败";
      setErr(msg);
    } finally {
      setGithubBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr("请输入有效邮箱");
      return;
    }
    if (!password || password.length < 6) {
      setErr("密码至少 6 位");
      return;
    }

    setBusy(true);
    try {
      await authLogin(email, password);
      nav(from, { replace: true });
    } catch (e2) {
      console.error("登录失败：", e2);
      setErr(e2?.message || "登录失败，请检查邮箱和密码");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            登录 GraphTutor
          </h1>
          <p className="text-sm font-medium text-slate-600">
            使用邮箱密码或 GitHub 登录
          </p>
        </div>

        {err && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-sm animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {err}
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <label className="label">邮箱</label>
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || githubBusy}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="label">密码</label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                忘记密码？
              </Link>
            </div>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                className="input pr-10"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy || githubBusy}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 hover:text-slate-700"
                onClick={() => setShow((s) => !s)}
              >
                {show ? "隐藏" : "显示"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={busy || githubBusy}
          >
            {busy ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                登录中…
              </>
            ) : (
              "登录"
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white/90 text-slate-500">或</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGitHubLogin}
          disabled={githubBusy || busy}
          className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-4 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {githubBusy ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              跳转中…
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              使用 GitHub 登录
            </>
          )}
        </button>

        <div className="text-sm text-slate-600 text-center pt-4 border-t border-slate-200 space-y-2">
          <p>
            <span className="text-slate-500">已有邮箱账号想用 GitHub 登录？</span>
            <Link to="/login" className="ml-1 text-blue-600 font-semibold hover:text-blue-700">
              先邮箱登录
            </Link>
            <span className="text-slate-500"> → 个人中心绑定 GitHub</span>
          </p>
          <p>
            <span>还没有账号？</span>
            <Link
              to="/register"
              className="ml-2 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              邮箱注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
