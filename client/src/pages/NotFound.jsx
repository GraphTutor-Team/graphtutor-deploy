/**
 * GraphTutor V3.0 - 404页面
 * 
 * 作用：当用户访问不存在的路由时显示404错误页面，提供返回首页的链接
 * 关联页面：
 *   - config/routes.jsx (路由配置，使用此组件作为404页面)
 *   - pages/Home.jsx (首页，404页面链接到此)
 * 技术栈：
 *   - React Router (Link导航)
 *   - 简洁的错误页面设计
 */

import { Link } from 'react-router-dom';

export default function NotFound(){
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-slate-900">404</h1>
        <h2 className="text-2xl font-bold text-slate-900">页面不存在</h2>
        <p className="text-base font-semibold text-slate-700">你要找的页面可能被移动或暂时不可用。</p>
        <Link to="/home" className="btn btn-primary">回到首页</Link>
      </div>
    </div>
  );
}
