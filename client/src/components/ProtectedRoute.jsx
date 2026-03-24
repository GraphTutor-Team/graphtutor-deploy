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

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  // 未登录
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // V3.0: 角色映射（向后兼容）
  const userRole = user.role === 'user' ? 'student' : user.role;

  // 需要管理员权限但不是 admin
  if (requireAdmin && userRole !== 'admin') {
    return (
      <Navigate
        to="/home"
        replace
        state={{ error: '需要管理员权限' }}
      />
    );
  }

  // V3.0: 需要特定角色
  if (requireRole && Array.isArray(requireRole) && requireRole.length > 0) {
    if (!requireRole.includes(userRole)) {
      return (
        <Navigate
          to="/home"
          replace
          state={{ error: `需要以下角色之一: ${requireRole.join(', ')}` }}
        />
      );
    }
  }

  return children;
}
