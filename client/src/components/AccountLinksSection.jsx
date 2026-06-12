/**
 * 个人中心：登录方式绑定与账号同步说明
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { setStoredToken } from "../api/api";
import { setStoredRefreshToken } from "../utils/tokenRefresh";

function StatusBadge({ linked }) {
  return (
    <span
      className={`badge ${linked ? "badge-success" : "badge-ghost text-slate-500"}`}
    >
      {linked ? "已绑定" : "未绑定"}
    </span>
  );
}

export default function AccountLinksSection({ user, token, setUser }) {
  const links = user?.accountLinks || {};
  const needsLink = user?.needsWebAccountLink;
  const needsMpComplete = user?.needsProfileCompletion;

  const [bindBusy, setBindBusy] = useState("");
  const [bindErr, setBindErr] = useState("");
  const [bindOk, setBindOk] = useState("");

  const [showMergeForm, setShowMergeForm] = useState(false);
  const [mergeEmail, setMergeEmail] = useState("");
  const [mergePassword, setMergePassword] = useState("");
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeErr, setMergeErr] = useState("");

  async function startOAuthBind(provider) {
    setBindErr("");
    setBindOk("");
    setBindBusy(provider);
    try {
      const path =
        provider === "github"
          ? "/auth/oauth/github/url?mode=bind"
          : "/auth/oauth/wechat/url?mode=bind";
      const { data } = await api.get(path);
      if (data?.success && data?.url) {
        window.location.href = data.url;
        return;
      }
      setBindErr(data?.message || "暂无法发起绑定");
    } catch (e) {
      setBindErr(e?.response?.data?.message || "发起绑定失败");
    } finally {
      setBindBusy("");
    }
  }

  async function submitMerge(e) {
    e.preventDefault();
    setMergeErr("");
    if (!mergeEmail || !mergePassword) {
      setMergeErr("请填写邮箱和密码");
      return;
    }
    setMergeBusy(true);
    try {
      const { data } = await api.post("/auth/account/link-existing", {
        email: mergeEmail,
        password: mergePassword,
      });
      if (!data?.success) {
        setMergeErr(data?.message || "绑定失败");
        return;
      }
      if (data.accessToken) setStoredToken(data.accessToken);
      if (data.refreshToken) setStoredRefreshToken(data.refreshToken);
      if (data.user) setUser(data.user);
      setBindOk(data.message || "绑定成功");
      setShowMergeForm(false);
    } catch (e2) {
      setMergeErr(e2?.response?.data?.message || "绑定失败");
    } finally {
      setMergeBusy(false);
    }
  }

  const canBindGithub = token && !links.github?.linked;
  const canBindWechat = token && !links.wechat?.linked;

  return (
    <section className="card mt-6">
      <h2 className="text-base font-bold text-slate-900 mb-2 border-b-2 border-slate-200 pb-2">
        登录方式与账号绑定
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        多种登录方式可绑定到<strong>同一个 GraphTutor 账号</strong>，笔记、错题、学习数据会自动同步。
      </p>

      {needsMpComplete && (
        <div className="alert alert-warning text-sm mb-4">
          您使用微信小程序登录且账号尚未完善，请在小程序内完成「绑定已有账号」或「完善新账号」。
        </div>
      )}

      {needsLink && !needsMpComplete && (
        <div className="alert alert-warning text-sm mb-4 space-y-2">
          <p>
            您当前通过 GitHub/微信 登录，系统创建了<strong>独立临时账号</strong>。
            若您已有邮箱注册的账号，请填写下方表单合并；或先
            <Link to="/register" className="text-blue-600 font-semibold mx-1">
              注册新邮箱
            </Link>
            后再绑定。
          </p>
          {!showMergeForm ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowMergeForm(true)}
            >
              绑定已有邮箱账号
            </button>
          ) : null}
        </div>
      )}

      {bindOk && (
        <div className="alert alert-success text-sm mb-4">{bindOk}</div>
      )}
      {bindErr && (
        <div className="alert alert-error text-sm mb-4">{bindErr}</div>
      )}

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-start gap-3 py-2 border-b border-slate-200">
          <div>
            <div className="text-sm font-semibold text-slate-900">邮箱密码</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {links.email?.linked
                ? links.email.display
                : "未设置真实邮箱（占位地址）"}
            </div>
          </div>
          <StatusBadge linked={links.email?.linked} />
        </div>

        <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-200">
          <div>
            <div className="text-sm font-semibold text-slate-900">GitHub</div>
            <div className="text-xs text-slate-500 mt-0.5">
              绑定后可使用 GitHub 一键登录同一账号
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge linked={links.github?.linked} />
            {canBindGithub && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={!!bindBusy}
                onClick={() => startOAuthBind("github")}
              >
                {bindBusy === "github" ? "跳转中…" : "绑定"}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-200">
          <div>
            <div className="text-sm font-semibold text-slate-900">微信（网站扫码）</div>
            <div className="text-xs text-slate-500 mt-0.5">需配置微信开放平台网站应用</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge linked={links.wechat?.linked} />
            {canBindWechat && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={!!bindBusy}
                onClick={() => startOAuthBind("wechat")}
              >
                {bindBusy === "wechat" ? "跳转中…" : "绑定"}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-200">
          <div>
            <div className="text-sm font-semibold text-slate-900">微信小程序</div>
            <div className="text-xs text-slate-500 mt-0.5">在小程序「完善账号」中绑定</div>
          </div>
          <StatusBadge linked={links.wechatMp?.linked} />
        </div>

        <div className="flex justify-between items-center gap-3 py-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">手机号</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {links.phone?.masked || "短信验证码登录后自动绑定"}
            </div>
          </div>
          <StatusBadge linked={links.phone?.linked} />
        </div>
      </div>

      {showMergeForm && needsLink && (
        <form className="space-y-3 border border-amber-200 bg-amber-50/50 rounded-lg p-4" onSubmit={submitMerge}>
          <h3 className="text-sm font-bold text-slate-900">绑定已有邮箱账号</h3>
          <p className="text-xs text-slate-600">
            输入您在 Web 端注册的邮箱和密码，将把当前 GitHub/微信 登录合并到该账号，临时账号数据会同步过去。
          </p>
          {mergeErr && (
            <div className="text-sm text-red-700 font-medium">{mergeErr}</div>
          )}
          <input
            type="email"
            className="input w-full"
            placeholder="已有账号邮箱"
            value={mergeEmail}
            onChange={(e) => setMergeEmail(e.target.value)}
            disabled={mergeBusy}
          />
          <input
            type="password"
            className="input w-full"
            placeholder="该账号密码"
            value={mergePassword}
            onChange={(e) => setMergePassword(e.target.value)}
            disabled={mergeBusy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => setShowMergeForm(false)}
              disabled={mergeBusy}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={mergeBusy}>
              {mergeBusy ? "绑定中…" : "确认绑定"}
            </button>
          </div>
        </form>
      )}

      <div className="alert alert-info text-xs mt-4 space-y-2">
        <p className="font-semibold">推荐操作流程</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-700">
          <li>
            <strong>已有邮箱账号</strong>：先用邮箱密码登录 → 在本页点击「绑定 GitHub」→ 授权后即同一账号。
          </li>
          <li>
            <strong>先用 GitHub 登录</strong>：若与邮箱账号不是同一 GitHub 公开邮箱，会创建临时账号 → 在本页「绑定已有邮箱账号」合并。
          </li>
          <li>
            <strong>小程序用户</strong>：在小程序完善页选择「绑定已有 Web 账号」，与 Web 数据同步。
          </li>
        </ol>
      </div>
    </section>
  );
}
