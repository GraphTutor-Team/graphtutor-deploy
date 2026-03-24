import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  const base = 'px-3 py-1 rounded-lg text-sm font-medium hover:bg-slate-100';
  const active = 'bg-slate-900 text-white';

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between">
        <Link to="/" className="text-lg font-semibold">GraphTutor</Link>
        <div className="flex gap-2">
          {[
            ['/', '首页'],
            ['/graph', '知识图谱'],
            ['/quiz', '自适应练习']
          ].map(([path, name]) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => (isActive ? `${base} ${active}` : base)}>
              {name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
