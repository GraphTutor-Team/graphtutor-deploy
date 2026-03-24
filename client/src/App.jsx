/**
 * GraphTutor V3.0 - 应用主入口
 * 
 * 作用：应用根组件，负责路由和认证提供者设置
 * 关联页面：
 *   - config/routes.jsx (路由配置)
 *   - context/AuthContext.jsx (认证上下文)
 *   - layout/AppLayout.patched.jsx (应用布局)
 * 技术栈：
 *   - React Router v6 (BrowserRouter)
 *   - React Context API (AuthProvider)
 *   - React Suspense (懒加载)
 */

import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LearningDataProvider } from "./context/LearningDataContext";
import { AppRoutes } from "./config/routes";

/**
 * 应用主组件
 * @returns {JSX.Element} 应用根组件
 */
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <LearningDataProvider>
          <AppRoutes />
        </LearningDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
