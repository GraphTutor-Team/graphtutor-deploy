/**
 * GraphTutor V3.0 - 路由配置（主文件）
 * 
 * 作用：集中管理应用的所有路由配置
 * 关联页面：
 *   - App.jsx (主应用入口，使用此路由配置)
 * 技术栈：
 *   - React Router v6 (Routes, Route, Navigate)
 *   - React Suspense (懒加载)
 *   - ProtectedRoute (路由保护)
 */

import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import AppLayoutPatched from "../layout/AppLayout.patched.jsx";

// 直接导入的页面
import Home from "../pages/Home.jsx";
import NotFound from "../pages/NotFound.jsx";

// 导入拆分后的路由配置
import { publicRoutes } from "./routes/public.jsx";
import { learningRoutes } from "./routes/learning.jsx";
import { socialRoutes } from "./routes/social.jsx";
import { adminRoutes } from "./routes/admin.jsx";
import { bankRoutes } from "./routes/banks.jsx";
import { otherRoutes } from "./routes/other.jsx";

/**
 * 生成应用路由配置
 * @returns {JSX.Element} 路由配置组件
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* 公开路由（登录/注册） */}
      {publicRoutes}

      {/* 统一的页面框架（头部/侧栏/返回栏等都在 AppLayoutPatched 内） */}
      <Route element={<AppLayoutPatched />}>
        {/* 默认重定向到 /home */}
        <Route index element={<Navigate to="/home" replace />} />

        {/* 首页：不强制登录，游客也能看到项目介绍与总览 */}
        <Route path="/home" element={<Home />} />

        {/* 其他功能路由 */}
        {otherRoutes}

        {/* 学习相关路由 */}
        {learningRoutes}

        {/* 社交相关路由 */}
        {socialRoutes}

        {/* 题库和题目管理路由 */}
        {bankRoutes}

        {/* 管理相关路由（部分在布局内） */}
        {adminRoutes.filter(route => 
          route.props.path !== '/admin/users' && 
          route.props.path !== '/admin/operation-logs' && 
          route.props.path !== '/admin/reports' &&
          route.props.path !== '/admin/role-applications'
        )}

        {/* 布局内未匹配的 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* 顶层路由（不在布局内） */}
      {adminRoutes.filter(route => 
        route.props.path === '/admin/users' || 
        route.props.path === '/admin/operation-logs' || 
        route.props.path === '/admin/reports' ||
        route.props.path === '/admin/role-applications'
      )}

      {/* 顶层兜底 404（连布局都没匹配到的情况） */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
