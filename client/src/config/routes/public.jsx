/**
 * GraphTutor V3.0 - 公开路由配置
 * 
 * 作用：定义不需要登录的公开路由
 */

import { Route } from "react-router-dom";
import Login from "../../pages/Login.jsx";
import Register from "../../pages/Register.jsx";
import OAuthCallback from "../../pages/OAuthCallback.jsx";

export const publicRoutes = [
  <Route key="login" path="/login" element={<Login />} />,
  <Route key="register" path="/register" element={<Register />} />,
  <Route key="oauth-callback" path="/oauth/callback" element={<OAuthCallback />} />,
];

