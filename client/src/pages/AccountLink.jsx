/**
 * 绑定已有邮箱账号（GitHub/微信 OAuth 临时账号合并）
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import { setStoredToken } from "../api/api";
import { setStoredRefreshToken } from "../utils/tokenRefresh";

export default function AccountLink() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!email || !password) {
      setErr("请填写邮箱和密码");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/auth/account/link-existing", {
        email,
        password,
      });
      if (!data?.success) {
        setErr(data?.message || "绑定失败");
        return;
      }
      if (data.accessToken) setStoredToken(data.accessToken);
      if (data.refreshToken) setStoredRefreshToken(data.refreshToken);
      if (data.user) setUser(data.user);
      navigate("/profile", { replace: true, state: { linkSuccess: true } });
    } catch (e2) {
      setErr(e2?.response?.data?.message || "绑定失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md surface p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">绑定已有账号</h1>
          <p className="text-sm text-slate-600">
            您通过 GitHub/微信 登录创建了临时账号。输入已有邮箱账号密码即可合并，学习数据会同步到原账号。
          </p>
        </div>

        {user?.passwordlessLoginHint && (
          <div className="text-xs text-center text-slate-500">
            当前登录方式：{user.passwordlessLoginHint}
          </div>
        )}

        {err && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-sm">
            {err}
          </div>
        )}

        <form className="space-y-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <label className="label">已有账号邮箱</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label">密码</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="该邮箱账号的密码"
              disabled={busy}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "绑定中…" : "确认绑定并同步数据"}
          </button>
        </form>

        <div className="text-sm text-slate-600 space-y-2 border-t border-slate-200 pt-4">
          <p>
            还没有邮箱账号？
            <Link to="/register" className="text-blue-600 font-semibold ml-1">
              先注册
            </Link>
          </p>
          <p>
            若您<strong>已有邮箱账号</strong>，更推荐：先用邮箱登录 → 个人中心 → 绑定 GitHub。
            <Link to="/login" className="text-blue-600 font-semibold ml-1">
              去登录
            </Link>
          </p>
          <Link to="/profile" className="block text-center text-slate-500 hover:text-slate-700">
            返回个人中心
          </Link>
        </div>
      </div>
    </div>
  );
}
