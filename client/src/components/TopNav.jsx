import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function TopNav() {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Link className="btn btn-ghost" to="/">GraphTutor</Link>
        <Link className="btn btn-ghost" to="/quiz">练习</Link>
        <Link className="btn btn-ghost" to="/quiz2">会话测验</Link>
        <Link className="btn btn-ghost" to="/bank">题库</Link>
        <Link className="btn btn-ghost" to="/nodes">知识点</Link>
        <Link className="btn btn-ghost" to="/result">结果</Link>
        <Link className="btn btn-ghost" to="/admin">Admin</Link>
        <Link className="btn btn-ghost" to="/ai">AI</Link>
        <Link className="btn btn-ghost" to="/settings">设置</Link>
      </div>
      <ThemeToggle />
    </div>
  );
}
