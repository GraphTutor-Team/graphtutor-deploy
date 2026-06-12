/**
 * GraphTutor V3.0 - 个人中心页面
 * 
 * 作用：展示并编辑当前登录用户的个人信息，包括头像、学校、专业、年级、个人简介等，显示学习统计
 * 关联页面：
 *   - context/AuthContext.jsx (用户信息和更新)
 *   - api/api.js (用户信息API)
 *   - components/UserStatsCard.jsx (用户统计卡片)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - 表单编辑
 *   - 图片上传
 *   - 数据保存
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import UserStatsCard from "../components/UserStatsCard";
import AccountLinksSection from "../components/AccountLinksSection";
import api from "../api/api";

export default function Profile() {
  const { user, token, setUser, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 个人资料表单
  const [form, setForm] = useState({
    name: "",
    avatarUrl: "",
    school: "",
    major: "",
    grade: "",
    studentId: "",
    bio: "",
    advancementTarget: "",
  });

  // 密码修改表单
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const needsSetPassword = user?.hasPassword === false;

  useEffect(() => {
    if (searchParams.get("bindSuccess") === "1") {
      setSuccess("GitHub/微信 已成功绑定到当前账号");
      searchParams.delete("bindSuccess");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 头像预览相关
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 学习角色：从 user.learningAvatar / user 派生，单独更新时用
  const [updatingRole, setUpdatingRole] = useState(false);

  // 从 user / 后端初始化表单
  useEffect(() => {
    async function init() {
      // 如果还没登录，ProtectedRoute 会拦截，这里只是兜底
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // 尝试从后端拉最新信息（确保字段齐全）
        const r = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!r.ok) {
          console.warn("GET /api/auth/me status:", r.status);
        }

        const data = await r.json().catch(() => null);
        const u = data?.user || user;

        if (!u) {
          setLoading(false);
          return;
        }

        setForm({
          name: u.name || "",
          avatarUrl: u.avatarUrl || "",
          school: u.school || "",
          major: u.major || "",
          grade: u.grade || "",
          studentId: u.studentId || "",
          bio: u.bio || "",
          advancementTarget: u.advancementTarget ?? "",
        });
        
        // 设置头像预览
        if (u.avatarUrl) {
          setAvatarPreview(u.avatarUrl);
        }

        // 顺便把最新 user 回写到全局（以防有变化）
        if (data?.user && token) {
          setUser(data.user);
          // token 已经在 AuthContext 中，不需要重复设置
        }
      } catch (e) {
        console.error("加载个人信息失败:", e);
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // 清除错误和成功消息
    if (error) setError("");
    if (success) setSuccess("");
    
    // 如果是头像URL，实时更新预览
    if (name === "avatarUrl") {
      if (value.trim()) {
        setAvatarPreview(value.trim());
        setAvatarError("");
      } else {
        setAvatarPreview("");
      }
    }
  }

  // 验证图片URL是否有效（允许base64，但建议使用网络地址）
  function validateImageUrl(url) {
    if (!url || !url.trim()) return { valid: true, message: "" };
    
    // 检查是否是base64格式
    if (url.startsWith("data:image/")) {
      return { valid: true, message: "💡 提示：建议使用网络图片地址（http:// 或 https://），base64格式会占用较多存储空间" };
    }
    
    try {
      const urlObj = new URL(url);
      const validProtocols = ["http:", "https:"];
      if (!validProtocols.includes(urlObj.protocol)) {
        return { valid: true, message: "💡 提示：建议使用 http:// 或 https:// 开头的网络图片地址" };
      }
      
      // 检查是否是常见的图片格式
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
      const pathname = urlObj.pathname.toLowerCase();
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
      
      if (!hasImageExtension && !pathname.includes("image") && !url.includes("avatar")) {
        return { valid: true, message: "💡 提示：建议使用图片链接（.jpg, .png等）" };
      }
      
      return { valid: true, message: "" };
    } catch (e) {
      // 不是标准URL，可能是base64或其他格式，允许但提示
      return { valid: true, message: "💡 提示：建议使用网络图片地址（http:// 或 https://）" };
    }
  }

  // 处理图片加载错误
  function handleAvatarError() {
    setAvatarError("图片加载失败，请检查链接是否正确");
    setAvatarPreview("");
  }

  // 处理图片加载成功
  function handleAvatarLoad() {
    setAvatarError("");
  }

  // 处理本地上传
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("只支持 JPG、PNG、GIF、WEBP 格式的图片");
      return;
    }

    // 验证文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("图片大小不能超过 5MB");
      return;
    }

    setUploadingAvatar(true);
    setAvatarError("");

    // 使用 FileReader 转换为 base64（简单方案）
    // 实际项目中建议上传到服务器或云存储
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        // 使用 base64 作为头像（临时方案）
        // 注意：base64 可能很长，实际项目中建议上传到服务器
        setForm((prev) => ({ ...prev, avatarUrl: base64 }));
        setAvatarPreview(base64);
        setUploadingAvatar(false);
      }
    };
    reader.onerror = () => {
      setAvatarError("图片读取失败，请重试");
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    // 清除密码错误
    if (passwordError) setPasswordError("");
    
    // 如果是新密码字段，实时验证
    if (name === "newPassword" && value) {
      const validation = validatePasswordStrength(value);
      // 验证结果会在UI中显示
    }
  }

  // 验证密码强度（使用统一的验证函数）
  function validatePasswordStrength(password) {
    if (!password) {
      return { valid: false, message: "密码不能为空", strength: null };
    }
    
    if (password.length < 6) {
      return { valid: false, message: "密码至少需要 6 位", strength: null };
    }
    
    if (password.length > 50) {
      return { valid: false, message: "密码不能超过 50 位", strength: null };
    }
    
    if (/\s/.test(password)) {
      return { valid: false, message: "密码不能包含空格", strength: null };
    }
    
    if (password.length < 8) {
      return { valid: true, strength: "weak", message: "密码强度：弱（建议至少 8 位）" };
    }
    
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    
    if (hasNumber && hasLetter && hasSpecial && (hasUpper || hasLower)) {
      return { valid: true, strength: "strong", message: "密码强度：强 ✓" };
    }
    if ((hasNumber && hasLetter) || (hasLetter && hasSpecial) || (hasNumber && hasSpecial)) {
      return { valid: true, strength: "medium", message: "密码强度：中" };
    }
    return { valid: true, strength: "weak", message: "密码强度：弱（建议包含字母、数字和特殊字符）" };
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!token) return;

    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const r = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.success) {
        setError(
          data?.message || `保存失败（状态码 ${r.status}）`
        );
        return;
      }

      // 更新全局 user 信息
      if (data.user) {
        setUser(data.user);
        // token 已经在 AuthContext 中，不需要重复设置
      }
      
      setSuccess("个人资料保存成功！");
      // 3秒后清除成功消息
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      console.error("保存个人信息失败:", e);
      setError("保存失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChangeSubmit(e) {
    e.preventDefault();
    if (!token) return;

    setPasswordError("");

    // 验证新密码格式
    const passwordValidation = validatePasswordStrength(passwordForm.newPassword);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.message);
      return;
    }

    // 验证确认密码
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }

    // 验证新密码不能与旧密码相同
    if (passwordForm.oldPassword === passwordForm.newPassword) {
      setPasswordError("新密码不能与当前密码相同");
      return;
    }

    setChangingPassword(true);
    try {
      const payload = needsSetPassword
        ? { newPassword: passwordForm.newPassword }
        : {
            oldPassword: passwordForm.oldPassword,
            newPassword: passwordForm.newPassword,
          };

      const { data } = await api.put("/auth/me/password", payload);

      if (!data?.success) {
        setPasswordError(data?.message || "操作失败");
        return;
      }

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordSection(false);

      if (needsSetPassword) {
        setSuccess(data.message || "密码设置成功");
        setUser((prev) => (prev ? { ...prev, hasPassword: true } : prev));
        return;
      }

      alert("密码修改成功！为了安全，请重新登录。");
      setTimeout(() => {
        logout();
      }, 500);
    } catch (e) {
      console.error("修改密码失败:", e);
      setPasswordError(e?.response?.data?.message || "操作失败，请稍后再试");
    } finally {
      setChangingPassword(false);
    }
  }

  if (!user) {
    return (
      <div className="p-6 text-sm font-semibold text-slate-700">
        请先登录后再查看个人中心。
      </div>
    );
  }

  // 头像展示：优先用 avatarUrl，没有就用首字母
  const avatarFallback =
    (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-4">
      <PageHeader
        title="个人中心"
        subtitle="查看并完善你的个人信息，这些资料仅用于学习记录展示，不涉及隐私。"
      />

      {/* 学习统计卡片 */}
      {user?._id || user?.id ? (
        <UserStatsCard userId={user._id || user.id} />
      ) : null}

      {/* 学习角色养成（学习元宇宙 MVP） */}
      {user && (
        <section className="card">
          <h2 className="text-base font-bold text-slate-900 mb-4 border-b-2 border-slate-200 pb-2">
            学习角色
          </h2>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">当前角色</span>
              <select
                value={user?.learningRole ?? "学者"}
                onChange={async (e) => {
                  const role = e.target.value;
                  if (!token || !["学者", "探险家", "书虫", "奋斗者"].includes(role)) return;
                  setUpdatingRole(true);
                  try {
                    const r = await fetch("/api/auth/me", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ learningRole: role }),
                    });
                    const data = await r.json().catch(() => null);
                    if (data?.user) setUser(data.user);
                  } catch (err) {
                    console.error("更新学习角色失败:", err);
                  } finally {
                    setUpdatingRole(false);
                  }
                }}
                disabled={updatingRole}
                className="input w-auto min-w-[120px]"
              >
                <option value="学者">学者</option>
                <option value="探险家">探险家</option>
                <option value="书虫">书虫</option>
                <option value="奋斗者">奋斗者</option>
              </select>
              <span className="text-xs text-slate-500">
                {updatingRole ? "保存中…" : "答题、打卡可获得经验并升级"}
              </span>
            </div>
            {(() => {
              const avatar = user?.learningAvatar;
              const level = avatar?.level ?? user?.learningLevel ?? 1;
              const progress = avatar?.progressInLevel ?? 0;
              const expToNext = avatar?.expToNextLevel ?? 100;
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Lv.{level}</span>
                    <span>当前等级经验 {Math.round(progress * 100)}% · 距下一级还需 {expToNext} 经验</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, progress * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {loading ? (
        <div className="card text-sm">
          正在加载个人信息…
        </div>
      ) : (
        <>
          {/* 顶部：头像 + 基本账户信息 */}
          <section className="card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-slate-300">
                {form.avatarUrl ? (
                  // 头像 URL
                  <img
                    src={form.avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-slate-900">
                    {avatarFallback}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-slate-900">
                  {form.name || user.email}
                </div>
                <div className="text-sm font-semibold text-slate-700 font-mono">
                  {user.email}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-semibold text-slate-700">
                    角色：
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 text-xs font-bold ml-1 border border-slate-300">
                      {user.role === "admin" ? "管理员" : 
                       user.role === "question_manager" ? "出题负责人" : 
                       user.role === "student" ? "学习者" : "普通用户"}
                    </span>
                  </div>
                  {user.role !== "admin" && (
                    <Link
                      to="/role/apply"
                      className="btn btn-sm btn-ghost text-xs"
                    >
                      申请角色
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* 顶部快捷按钮：文字都改成中文说明 */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Link
                to="/home"
                className="btn btn-ghost text-xs"
              >
                返回首页
              </Link>
              <Link
                to="/exam"
                className="btn btn-ghost text-xs"
              >
                前往考试页面
              </Link>
              <Link
                to="/quiz"
                className="btn btn-ghost text-xs"
              >
                进入练习模式
              </Link>
            </div>
          </section>

          {/* 错误和成功提示 */}
          {error && (
            <div className="alert alert-error text-sm font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success text-sm font-semibold">
              {success}
            </div>
          )}

          {/* 可编辑的个人资料表单 */}
          <section className="card">
            <h2 className="text-base font-bold text-slate-900 mb-4 border-b-2 border-slate-200 pb-2">
              个人资料
            </h2>

            <form className="space-y-3" onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 姓名 */}
                <div className="flex flex-col gap-2 text-sm">
                  <label className="label">
                    昵称 / 姓名
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="请输入你的称呼（用于页面展示）"
                  />
                </div>

                {/* 头像 URL */}
                <div className="flex flex-col gap-2 text-sm md:col-span-2">
                  <label className="label">
                    头像设置
                  </label>
                  
                  {/* 头像预览区域 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-slate-300 relative">
                        {avatarPreview || form.avatarUrl ? (
                          <img
                            src={avatarPreview || form.avatarUrl}
                            alt="头像预览"
                            className="w-full h-full object-cover"
                            onError={handleAvatarError}
                            onLoad={handleAvatarLoad}
                          />
                        ) : (
                          <span className="text-2xl font-bold text-slate-900">
                            {avatarFallback}
                          </span>
                        )}
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      {/* URL输入 */}
                      <div>
                        <input
                          name="avatarUrl"
                          value={form.avatarUrl}
                          onChange={handleChange}
                          className="input w-full"
                          placeholder="输入图片链接（http:// 或 https://）"
                          type="url"
                        />
                        {form.avatarUrl && (() => {
                          const validation = validateImageUrl(form.avatarUrl);
                          return validation.message && (
                            <div className="text-xs font-medium mt-1 text-amber-700">
                              {validation.message}
                            </div>
                          );
                        })()}
                        {avatarError && (
                          <div className="text-xs font-medium text-red-700 mt-1">
                            {avatarError}
                          </div>
                        )}
                      </div>
                      
                      {/* 本地上传 */}
                      <div className="flex items-center gap-2">
                        <label className="btn btn-ghost text-xs cursor-pointer">
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                          📁 本地上传
                        </label>
                        {form.avatarUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, avatarUrl: "" }));
                              setAvatarPreview("");
                              setAvatarError("");
                            }}
                            className="btn btn-ghost text-xs"
                            disabled={uploadingAvatar}
                          >
                            清除
                          </button>
                        )}
                        <span className="text-xs font-medium text-slate-600">
                          支持 JPG、PNG、GIF、WEBP，最大 5MB
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs font-medium text-slate-600">
                    💡 提示：可以输入网络图片链接，或点击"本地上传"选择图片。留空则使用首字母头像。
                  </div>
                </div>

                {/* 学校 */}
                <div className="flex flex-col gap-2 text-sm">
                  <label className="label">
                    学校
                  </label>
                  <input
                    name="school"
                    value={form.school}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="例如：XX职业技术学院"
                  />
                </div>

                {/* 专业 */}
                <div className="flex flex-col gap-2 text-sm">
                  <label className="label">
                    专业
                  </label>
                  <input
                    name="major"
                    value={form.major}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="例如：软件技术 / 计算机科学与技术"
                  />
                </div>

                {/* 年级 */}
                <div className="flex flex-col gap-2 text-sm">
                  <label className="label">
                    年级
                  </label>
                  <input
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="例如：大二 / 研一 等"
                  />
                </div>

                {/* 升学目标 */}
                <div className="flex flex-col gap-2 text-sm">
                  <label className="label">
                    升学目标
                  </label>
                  <select
                    name="advancementTarget"
                    value={form.advancementTarget}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    <option value="">不填</option>
                    <option value="考研">考研</option>
                    <option value="考公">考公</option>
                    <option value="留学">留学</option>
                    <option value="就业">就业</option>
                    <option value="其他">其他</option>
                  </select>
                  <span className="text-xs text-slate-500">用于学习分析页「升学报告」的默认目标与对比</span>
                </div>

                {/* 学号 */}
                <div className="flex flex-col gap-2 text-sm">
                  <label className="label">
                    学号
                  </label>
                  <input
                    name="studentId"
                    value={form.studentId}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="可选填写，便于导出报表时标识"
                  />
                </div>
              </div>

              {/* 简介 */}
              <div className="flex flex-col gap-2 text-sm">
                <label className="label">
                  个人简介 / 备注
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  className="input w-full min-h-[80px]"
                  placeholder="简单写几句：你当前主要学习哪些课程、准备什么考试等（便于答辩展示）"
                />
              </div>

              {/* 底部按钮：文字改成"保存资料"等 */}
              <div className="flex flex-wrap justify-end gap-2 text-sm pt-2">
                <Link
                  to="/home"
                  className="btn btn-ghost text-xs"
                >
                  取消并返回首页
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? "保存中…" : "保存个人资料"}
                </button>
              </div>
            </form>
          </section>

          {/* 账户安全设置 */}
          <section className="card">
            <h2 className="text-base font-bold text-slate-900 mb-4 border-b-2 border-slate-200 pb-2">
              账户安全
            </h2>

            {/* 账户信息 */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-900">登录邮箱</span>
                <span className="text-sm font-medium text-slate-700 font-mono">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-900">账户角色</span>
                <span className="badge badge-primary">
                  {user.role === "admin" ? "管理员" : "普通用户"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-slate-900">注册时间</span>
                <span className="text-sm font-medium text-slate-700">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : "未知"}
                </span>
              </div>
            </div>

            {/* 密码修改 / 设置区域 */}
            {!showPasswordSection ? (
              <div className="space-y-3">
                {needsSetPassword && (
                  <div className="alert alert-info text-sm">
                    您当前通过
                    {user?.passwordlessLoginHint || "第三方"}
                    登录，尚未设置密码。设置后可使用邮箱密码登录。
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(true)}
                  className="btn btn-outline w-full"
                >
                  {needsSetPassword ? "设置密码" : "修改密码"}
                </button>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handlePasswordChangeSubmit}>
                {passwordError && (
                  <div className="alert alert-error text-sm font-semibold">
                    {passwordError}
                  </div>
                )}

                {!needsSetPassword && (
                <div className="flex flex-col gap-2">
                  <label className="label">
                    当前密码
                  </label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordForm.oldPassword}
                    onChange={handlePasswordChange}
                    className="input w-full"
                    placeholder="请输入当前密码"
                    required
                  />
                </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="label">
                    {needsSetPassword ? "登录密码" : "新密码"}
                    <span className="text-xs font-normal text-slate-500 ml-2">（至少 6 位）</span>
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="input w-full"
                    placeholder="请输入新密码（至少 6 位）"
                    required
                    minLength={6}
                    maxLength={50}
                  />
                  {passwordForm.newPassword && (
                    <div className="text-xs font-medium">
                      {(() => {
                        const validation = validatePasswordStrength(passwordForm.newPassword);
                        const colorClass = 
                          !validation.valid ? "text-red-700" :
                          validation.strength === "strong" ? "text-emerald-700" :
                          validation.strength === "medium" ? "text-amber-700" :
                          "text-red-700";
                        return (
                          <span className={colorClass}>{validation.message}</span>
                        );
                      })()}
                    </div>
                  )}
                  {passwordForm.newPassword && (
                    <div className="text-xs font-medium text-slate-600 space-y-1">
                      <div className="font-semibold">密码格式要求：</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>至少 6 位字符（建议 8 位以上）</li>
                        <li>不能包含空格</li>
                        <li>建议包含字母和数字</li>
                        <li>建议包含大小写字母</li>
                        <li>建议包含特殊字符（!@#$%^&*等）</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="label">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="input w-full"
                    placeholder="请再次输入新密码"
                    required
                    minLength={6}
                    maxLength={50}
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <div className="text-xs font-medium text-red-700">
                      两次输入的密码不一致
                    </div>
                  )}
                  {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword && (
                    <div className="text-xs font-medium text-emerald-700">
                      ✓ 密码一致
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setPasswordForm({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                      setPasswordError("");
                    }}
                    className="btn btn-ghost flex-1"
                    disabled={changingPassword}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={
                      changingPassword ||
                      !passwordForm.newPassword ||
                      !passwordForm.confirmPassword ||
                      (!needsSetPassword && !passwordForm.oldPassword)
                    }
                    className="btn btn-primary flex-1"
                  >
                    {changingPassword
                      ? needsSetPassword
                        ? "设置中…"
                        : "修改中…"
                      : needsSetPassword
                        ? "确认设置密码"
                        : "确认修改密码"}
                  </button>
                </div>

                <div className="alert alert-info text-xs font-medium">
                  <strong>安全提示：</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {needsSetPassword ? (
                      <>
                        <li>设置密码后，可使用邮箱和密码登录</li>
                        <li>设置密码不会退出当前登录</li>
                      </>
                    ) : (
                      <>
                        <li>密码修改成功后需要重新登录</li>
                        <li>建议使用至少 8 位密码，包含字母和数字</li>
                        <li>不要使用与其他网站相同的密码</li>
                      </>
                    )}
                  </ul>
                </div>
              </form>
            )}
          </section>

          <AccountLinksSection user={user} token={token} setUser={setUser} />
        </>
      )}
    </div>
  );
}
