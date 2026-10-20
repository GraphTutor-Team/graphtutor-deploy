/**
 * GraphTutor V3.0 - 受保护路由组件
 * 
 * 作用：提供路由保护功能，未登录用户跳转到登录页，支持管理员权限和角色权限检查
 * 关联页面：
 *   - config/routes.jsx (路由配置，使用此组件)
 *   - context/AuthContext.jsx (获取认证状态)
 *   - pages/Login.jsx (未登录时跳转)
 * 技术栈：
 *   - React Router (Navigate, useLocation)
 *   - React Context (useAuth)
 *   - 权限检查逻辑
 *   - 路由重定向
 */

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPrompt from "./common/LoginPrompt";

const PAGE_NAMES = [
  ["/friends/discover", "发现好友"],
  ["/friend-challenges", "好友挑战"],
  ["/learning-posts", "学习动态"],
  ["/study-plans", "学习计划"],
  ["/review-plans", "复习计划"],
  ["/learning-path", "学习路径"],
  ["/skill-tree", "技能树"],
  ["/check-in", "每日打卡"],
  ["/recommendations", "智能推荐"],
  ["/questions/import", "题目导入"],
  ["/questions/create", "创建题目"],
  ["/questions", "题目"],
  ["/banks/import", "题库导入"],
  ["/banks/create", "创建题库"],
  ["/banks", "题库"],
  ["/manager/dashboard", "工作台"],
  ["/admin/users", "用户管理"],
  ["/admin/role-applications", "角色申请"],
  ["/admin/operation-logs", "操作日志"],
  ["/admin/reports", "报表"],
  ["/_new/admin-tools", "管理工具"],
  ["/admin", "后台管理"],
  ["/quiz2", "未完成练习"],
  ["/quiz", "练习"],
  ["/review", "错题复习"],
  ["/exam", "考试"],
  ["/result", "练习结果"],
  ["/notes", "学习笔记"],
  ["/favorites", "我的收藏"],
  ["/analytics", "学习数据"],
  ["/goals", "学习目标"],
  ["/achievements", "学习成就"],
  ["/graph", "知识图谱"],
  ["/nodes", "知识点"],
  ["/messages", "消息"],
  ["/friends", "好友"],
  ["/groups", "群组"],
  ["/community", "社区"],
  ["/leaderboard", "排行榜"],
  ["/mentor", "师徒"],
  ["/profile", "个人资料"],
  ["/settings", "系统设置"],
  ["/shop", "成就商城"],
  ["/notifications", "通知"],
  ["/subjects", "学科"],
  ["/ai", "AI 出题"],
  ["/role/apply", "角色申请"],
  ["/statistics", "统计"],
];

function pageName(pathname) {
  const hit = PAGE_NAMES
    .slice()
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return hit?.[1] || "这个功能";
}

function Denied({ title, description }) {
  return (
    <div className="page-shell">
      <section className="surface max-w-lg mx-auto text-center !py-10">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
        <div className="mt-6">
          <Link to="/home" className="btn btn-primary">回首页</Link>
        </div>
      </section>
    </div>
  );
}

/**
 * 受保护路由组件
 * @param {Object} props
 * @param {ReactNode} props.children - 子组件
 * @param {boolean} props.requireAdmin - 需要管理员权限
 * @param {Array<string>} props.requireRole - 需要的角色列表（V3.0新增）
 */
export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireRole = null,
}) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // 可选：loading 时先不跳转，避免闪一下
  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-500">
        正在检查登录状态…
      </div>
    );
  }

  // 未登录：留在当前地址，侧栏和页面还在，只提示登录
  if (!token || !user) {
    const name = pageName(location.pathname);
    return (
      <LoginPrompt
        title={`${name}需要登录`}
        description="左侧可以继续切换其他页面。登录后会回到这里。"
      />
    );
  }

  // V3.0: 角色映射（向后兼容）
  const userRole = user.role === 'user' ? 'student' : user.role;

  // 需要管理员权限但不是 admin
  if (requireAdmin && userRole !== 'admin') {
    return (
      <Denied
        title="需要管理员权限"
        description="当前账号打不开这个页面。可以回首页，或换一个有权限的账号。"
      />
    );
  }

  // V3.0: 需要特定角色
  if (requireRole && Array.isArray(requireRole) && requireRole.length > 0) {
    if (!requireRole.includes(userRole)) {
      return (
        <Denied
          title="没有访问权限"
          description="当前账号打不开这个页面。可以回首页，或换一个有权限的账号。"
        />
      );
    }
  }

  return children;
}
