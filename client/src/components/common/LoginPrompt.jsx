/**
 * 未登录占位：引导登录，并链回首页教程 / 练习
 */

import { Link, useLocation } from 'react-router-dom';

export default function LoginPrompt({
  title = '请先登录',
  description = '登录后可使用练习记录、错题本、好友与群组等功能。',
  className = 'page-shell',
}) {
  const location = useLocation();
  const from = `${location.pathname}${location.search || ''}`;

  return (
    <div className={className || undefined}>
      <section className="surface max-w-lg mx-auto text-center !py-10">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/login"
            state={{ from }}
            className="btn btn-primary"
          >
            去登录
          </Link>
          <Link to="/register" className="btn btn-outline">
            注册账号
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <Link to="/home?guide=1" className="text-blue-600 dark:text-blue-400 hover:underline">
            查看使用教程
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/quiz" className="text-blue-600 dark:text-blue-400 hover:underline">
            先去练习（游客）
          </Link>
        </div>
      </section>
    </div>
  );
}
