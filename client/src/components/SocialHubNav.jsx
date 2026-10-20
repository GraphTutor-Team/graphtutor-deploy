import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/messages', label: '消息' },
  { to: '/friends', label: '好友' },
  { to: '/groups', label: '群组' },
  { to: '/community', label: '社区' },
];

/** 消息、好友、群组、社区共用的切换条 */
export default function SocialHubNav() {
  const { pathname } = useLocation();

  return (
    <div className="mb-4 flex flex-wrap gap-2 text-sm">
      {LINKS.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
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
