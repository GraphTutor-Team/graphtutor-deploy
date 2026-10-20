import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/study-plans', label: '学习计划' },
  { to: '/check-in', label: '每日打卡' },
  { to: '/goals', label: '学习目标' },
  { to: '/quiz', label: '去练习' },
];

/** 计划、打卡、目标三页共用的切换条 */
export default function PlanHubNav() {
  const { pathname } = useLocation();

  return (
    <div className="mb-4 flex flex-wrap gap-2 text-sm">
      {LINKS.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={
              active
                ? 'px-3 py-1.5 rounded-lg border border-blue-600 bg-blue-50 text-blue-700'
                : 'px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
