/**
 * 忘记密码：邮箱验证码重置（开发环境验证码见服务器日志）
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [noPasswordHint, setNoPasswordHint] = useState("");

  async function sendCode(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    setNoPasswordHint("");

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr("请输入有效邮箱");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/password/forgot", { email });
      if (data?.success === false) {
        if (data?.code === "NO_PASSWORD") {
          setNoPasswordHint(data.message);
          return;
        }
        setErr(data?.message || "发送失败");
        return;
      }
      setInfo(data?.message || "验证码已发送，请查收邮箱（开发环境请查看服务器日志）");
      setStep(2);
    } catch (e2) {
      const body = e2?.response?.data;
      if (body?.code === "NO_PASSWORD") {
        setNoPasswordHint(body.message);
      } else {
        setErr(body?.message || e2?.message || "发送失败");
      }
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setErr("");
    setInfo("");

    if (!/^\d{6}$/.test(code)) {
      setErr("请输入 6 位数字验证码");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErr("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("两次输入的密码不一致");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/password/reset", {
        email,
        code,
        newPassword,
      });
      if (!data?.success) {
        setErr(data?.message || "重置失败");
        return;
      }
      setInfo(data.message || "密码已重置");
      setTimeout(() => nav("/login", { replace: true }), 800);
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "重置失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md surface p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">忘记密码</h1>
          <p className="text-sm text-slate-600">
            {step === 1
              ? "输入注册邮箱，我们将发送验证码"
              : "输入验证码并设置新密码"}
          </p>
        </div>

        {err && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-sm">
            {err}
          </div>
        )}
        {info && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded-lg text-sm">
            {info}
          </div>
        )}
        {noPasswordHint && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg text-sm space-y-3">
            <p>{noPasswordHint}</p>
            <Link to="/login" className="inline-block font-semibold text-blue-600 hover:text-blue-700">
              返回登录
            </Link>
          </div>
        )}

        {step === 1 && !noPasswordHint && (
          <form className="space-y-4" onSubmit={sendCode}>
            <div className="flex flex-col gap-2">
              <label className="label">邮箱</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={busy}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? "发送中…" : "获取验证码"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={resetPassword}>
            <div className="text-sm text-slate-600">
              邮箱：<span className="font-mono">{email}</span>
              <button
                type="button"
                className="ml-2 text-blue-600 hover:underline"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                更换邮箱
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label">验证码</label>
              <input
                type="text"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 位数字"
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label">新密码</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位"
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label">确认新密码</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                disabled={busy}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? "提交中…" : "重置密码"}
            </button>
          </form>
        )}

        <div className="text-sm text-center text-slate-600 pt-2 border-t border-slate-200">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
