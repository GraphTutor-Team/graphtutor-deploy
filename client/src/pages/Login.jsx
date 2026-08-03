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
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-bg-page)' }}>
      <div className="w-full max-w-md animate-rise-in">
        <div className="mb-8 text-center">
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            GraphTutor
          </p>
          <p className="mt-2 text-sm text-slate-500">
            知识图谱驱动的智能学习
          </p>
        </div>

        <div className="surface space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">登录</h1>
            <p className="mt-1 text-sm text-slate-500">使用邮箱密码或 GitHub</p>
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm animate-fade-in">
              {err}
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
                <label className="label mb-0">密码</label>
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
                  className="input pr-12"
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
              className="btn btn-primary w-full !py-3"
              disabled={busy || githubBusy}
            >
              {busy ? "登录中…" : "登录"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-slate-400">或</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={githubBusy || busy}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {githubBusy ? (
              "跳转中…"
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                使用 GitHub 登录
              </>
            )}
          </button>

          <div className="text-sm text-slate-500 text-center pt-2 border-t border-slate-100 space-y-2">
            <p>
              已有邮箱账号想用 GitHub？
              <span className="text-slate-600"> 登录后可在个人中心绑定</span>
            </p>
            <p>
              还没有账号？
              <Link
                to="/register"
                className="ml-1.5 font-semibold text-blue-600 hover:text-blue-700"
              >
                邮箱注册
              </Link>
            </p>
            <p className="pt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <Link to="/home?guide=1" className="text-blue-600 hover:underline font-medium">
                使用教程
              </Link>
              <span className="text-slate-300">·</span>
              <Link to="/quiz" className="text-blue-600 hover:underline font-medium">
                先去练习
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
