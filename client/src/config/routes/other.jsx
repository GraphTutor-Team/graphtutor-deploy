/**
 * GraphTutor V3.0 - 其他路由配置
 * 
 * 作用：定义其他功能相关的路由
 */

import { Route } from "react-router-dom";
import { Suspense } from "react";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import SuspenseFallback from "../../components/common/SuspenseFallback.jsx";
import Graph from "../../pages/Graph.jsx";
import Nodes from "../../pages/Nodes.jsx";
import Profile from "../../pages/Profile.jsx";
import AccountLink from "../../pages/AccountLink.jsx";
import Settings from "../../pages/Settings.jsx";
import Organizations from "../../pages/Organizations.jsx";
import GenFromFile from "../../pages/GenFromFile.jsx";
import AIGenerator from "../../pages/AIGenerator.jsx";
import { LazyNotifications, LazyShop } from "../../utils/lazyLoad.js";

export const otherRoutes = [
  <Route
    key="organizations"
    path="/organizations"
    element={
      <ProtectedRoute>
        <Organizations />
      </ProtectedRoute>
    }
  />,
  <Route
    key="graph"
    path="/graph"
    element={
      <ProtectedRoute>
        <Graph />
      </ProtectedRoute>
    }
  />,
  <Route
    key="nodes"
    path="/nodes"
    element={
      <ProtectedRoute>
        <Nodes />
      </ProtectedRoute>
    }
  />,
  <Route
    key="importgen"
    path="/importgen"
    element={
      <ProtectedRoute>
        <GenFromFile />
      </ProtectedRoute>
    }
  />,
  <Route
    key="ai-old"
    path="/ai-old"
    element={
      <ProtectedRoute>
        <AIGenerator />
      </ProtectedRoute>
    }
  />,
  <Route
    key="settings"
    path="/settings"
    element={
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    }
  />,
  <Route
    key="profile"
    path="/profile"
    element={
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    }
  />,
  <Route
    key="account-link"
    path="/account/link"
    element={
      <ProtectedRoute>
        <AccountLink />
      </ProtectedRoute>
    }
  />,
  <Route
    key="shop"
    path="/shop"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载成就商城..." />}>
          <LazyShop />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="notifications"
    path="/notifications"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载通知..." />}>
          <LazyNotifications />
        </Suspense>
      </ProtectedRoute>
    }
  />,
];

