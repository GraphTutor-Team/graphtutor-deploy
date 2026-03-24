/**
 * GraphTutor V3.0 - 管理相关路由配置
 * 
 * 作用：定义管理功能相关的路由
 */

import { Route } from "react-router-dom";
import { Suspense } from "react";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import SuspenseFallback from "../../components/common/SuspenseFallback.jsx";
import Admin from "../../pages/Admin.jsx";
import AdminUsers from "../../pages/AdminUsers.jsx";
import AdminTools from "../../pages/AdminTools.jsx";
import {
  LazyAIConsole,
  LazyManagerDashboard,
  LazySubjectManagement,
  LazyRoleApplication,
  LazyRoleApplicationManagement,
  LazyUserManagement,
  LazyOperationLogs,
  LazyReports,
} from "../../utils/lazyLoad.js";

export const adminRoutes = [
  <Route
    key="admin"
    path="/admin"
    element={
      <ProtectedRoute requireAdmin>
        <Admin />
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-users"
    path="/admin/users"
    element={
      <ProtectedRoute requireAdmin>
        <Suspense fallback={<SuspenseFallback text="加载用户管理..." />}>
          <LazyUserManagement />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-users-old"
    path="/admin/users-old"
    element={
      <ProtectedRoute requireAdmin>
        <AdminUsers />
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-operation-logs"
    path="/admin/operation-logs"
    element={
      <ProtectedRoute requireAdmin>
        <Suspense fallback={<SuspenseFallback text="加载操作日志..." />}>
          <LazyOperationLogs />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-reports"
    path="/admin/reports"
    element={
      <ProtectedRoute requireAdmin>
        <Suspense fallback={<SuspenseFallback text="加载统计报表..." />}>
          <LazyReports />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-role-applications"
    path="/admin/role-applications"
    element={
      <ProtectedRoute requireAdmin>
        <Suspense fallback={<SuspenseFallback text="加载申请管理页面..." />}>
          <LazyRoleApplicationManagement />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-tools"
    path="/_new/admin-tools"
    element={
      <ProtectedRoute requireAdmin>
        <AdminTools />
      </ProtectedRoute>
    }
  />,
  <Route
    key="ai"
    path="/ai"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载AI控制台..." />}>
          <LazyAIConsole />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="manager-dashboard"
    path="/manager/dashboard"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载工作台..." />}>
          <LazyManagerDashboard />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="subjects"
    path="/subjects"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学科管理..." />}>
          <LazySubjectManagement />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="role-apply"
    path="/role/apply"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载角色申请页面..." />}>
          <LazyRoleApplication />
        </Suspense>
      </ProtectedRoute>
    }
  />,
];

