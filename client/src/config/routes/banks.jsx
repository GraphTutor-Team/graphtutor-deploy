/**
 * GraphTutor V3.0 - 题库和题目管理路由配置
 * 
 * 作用：定义题库和题目管理相关的路由
 */

import { Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import SuspenseFallback from "../../components/common/SuspenseFallback.jsx";
import {
  LazyBankList,
  LazyBankDetail,
  LazyBankForm,
  LazyBankImport,
  LazyBankStats,
  LazyQuestionList,
  LazyQuestionEditor,
  LazyQuestionDetail,
  LazyQuestionWizard,
  LazyQuestionImport,
} from "../../utils/lazyLoad.js";

export const bankRoutes = [
  <Route
    key="banks"
    path="/banks"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载题库列表..." />}>
          <LazyBankList />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="banks-create"
    path="/banks/create"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载题库表单..." />}>
          <LazyBankForm />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="banks-detail"
    path="/banks/:id"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载题库详情..." />}>
          <LazyBankDetail />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="banks-edit"
    path="/banks/:id/edit"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载题库编辑..." />}>
          <LazyBankForm />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="banks-stats"
    path="/banks/:id/stats"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载统计仪表板..." />}>
          <LazyBankStats />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="banks-import"
    path="/banks/import"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载导入页面..." />}>
          <LazyBankImport />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="questions"
    path="/questions"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载题目列表..." />}>
          <LazyQuestionList />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="questions-create"
    path="/questions/create"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载题目编辑器..." />}>
          <LazyQuestionEditor />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="questions-id"
    path="/questions/:id"
    element={<Navigate to="/questions/:id/detail" replace />}
  />,
  <Route
    key="questions-edit"
    path="/questions/:id/edit"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载题目编辑器..." />}>
          <LazyQuestionEditor />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="questions-detail"
    path="/questions/:id/detail"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载题目详情..." />}>
          <LazyQuestionDetail />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="questions-wizard"
    path="/questions/wizard"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载创建向导..." />}>
          <LazyQuestionWizard />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="questions-import"
    path="/questions/import"
    element={
      <ProtectedRoute requireRole={['admin', 'question_manager']}>
        <Suspense fallback={<SuspenseFallback text="加载导入页面..." />}>
          <LazyQuestionImport />
        </Suspense>
      </ProtectedRoute>
    }
  />,
];

