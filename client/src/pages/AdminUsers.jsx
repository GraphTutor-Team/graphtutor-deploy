// client/src/pages/AdminUsers.jsx
// 功能：后台 - 用户管理页面
// - 管理员查看所有用户
// - 给用户分配角色（普通用户 / 管理员）
// - 高亮当前登录的自己，防止手滑

import { useEffect, useMemo, useState } from "react";
import BackBar from "../components/BackBar";
import Toolbar from "../components/Toolbar.jsx";
import HelpHint from "../components/HelpHint.jsx";
import Skeleton from "../components/Skeleton.jsx";
import Empty from "../components/Empty.jsx";
import { jsonReq, toast, API_BASE } from "../utils/download";
import { useAuth } from "../context/AuthContext";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");           // 搜索关键词
  const [busyId, setBusyId] = useState(""); // 某一行正在更新角色

  // 拉取用户列表
  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const data = await jsonReq(`${API_BASE}/users`);
      // 后端返回 { success, data: [...] }，做兼容处理
      const rows = Array.isArray(data?.data) ? data.data : data;
      setList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("加载用户列表失败:", e);
      setError(e.message || "加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // 本地搜索过滤
  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const kw = q.trim().toLowerCase();
    return list.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const name = (u.name || "").toLowerCase();
      return email.includes(kw) || name.includes(kw);
    });
  }, [list, q]);

  // 修改角色
  async function handleChangeRole(id, nextRole) {
    setError("");
    setBusyId(id);
    try {
      const body = JSON.stringify({ role: nextRole });
      const data = await jsonReq(`${API_BASE}/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      toast(data.message || "角色更新成功");

      // 更新本地列表
      setList((prev) =>
        prev.map((u) =>
          (u._id === id || u.id === id)
            ? { ...u, role: nextRole }
            : u
        )
      );
    } catch (e) {
      console.error("更新用户角色失败:", e);
      setError(e.message || "更新用户角色失败");
    } finally {
      setBusyId("");
    }
  }

  function isSelf(u) {
    if (!currentUser) return false;
    const uid = currentUser.id || currentUser._id;
    return (
      u._id === uid ||
      u.id === uid ||
      u.email === currentUser.email
    );
  }

  function formatTime(t) {
    if (!t) return "";
    try {
      return new Date(t).toLocaleString();
    } catch {
      return String(t);
    }
  }

  if (!currentUser) {
    return (
      <div>
        <BackBar title="用户管理" href="/admin" />
        <div className="card">
          <p className="text-sm text-slate-600 mb-3">
            请先使用管理员账号登录，才能访问用户管理页面。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackBar title="用户管理" href="/admin" />

      <div className="space-y-4">
        {/* 顶部说明 & 搜索 */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">用户列表与角色分配</div>
            <button
              type="button"
              onClick={loadUsers}
              className="btn btn-ghost text-sm"
            >
              刷新
            </button>
          </div>

          <Toolbar>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">搜索</span>
              <input
                className="border rounded-lg px-2 py-1 text-sm w-60"
                placeholder="按邮箱 / 姓名搜索"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </Toolbar>

          <HelpHint title="使用说明">
            <p className="mb-1">
              本页面用于<span className="font-semibold">管理员</span>
              给组员分配账号权限：
            </p>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              <li>
                <span className="font-mono">普通用户</span>：只能做题、查看自己的结果；
              </li>
              <li>
                <span className="font-mono">管理员</span>：可以访问后台管理页，导入 / 导出题库，管理知识点、分析数据等；
              </li>
              <li>当前登录账号所在行会高亮显示，避免误操作。</li>
              <li>不能把系统中最后一个管理员降级为普通用户（后端已做保护）。</li>
            </ul>
          </HelpHint>
        </div>

        {/* 用户表格 */}
        <div className="card space-y-3">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty text="暂无用户数据，或搜索条件下无结果。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white border-b-2 border-slate-300">
                  <tr>
                    <th className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900">邮箱</th>
                    <th className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900">姓名</th>
                    <th className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900">角色</th>
                    <th className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900">创建时间</th>
                    <th className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const self = isSelf(u);
                    return (
                      <tr
                        key={u._id || u.id}
                        className={
                          "border-t border-slate-100" +
                          (self ? " bg-amber-50/60" : " hover:bg-slate-50/60")
                        }
                      >
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {u.email}
                          {self && (
                            <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                              当前账号
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {u.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] " +
                              (u.role === "admin"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-50 text-slate-700 border border-slate-200")
                            }
                          >
                            {u.role === "admin" ? "管理员" : "普通用户"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                          {formatTime(u.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={u.role || "user"}
                            disabled={busyId === (u._id || u.id)}
                            onChange={(e) =>
                              handleChangeRole(
                                u._id || u.id,
                                e.target.value
                              )
                            }
                          >
                            <option value="user">普通用户</option>
                            <option value="admin">管理员</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
