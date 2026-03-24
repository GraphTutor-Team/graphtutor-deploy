import ThemeToggle from './ThemeToggle';

export default function TopNav(){
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <a className="btn btn-ghost" href="/">GraphTutor</a>
        <a className="btn btn-ghost" href="/quiz">练习</a>
        <a className="btn btn-ghost" href="/quiz2">会话测验</a>
        <a className="btn btn-ghost" href="/bank">题库</a>
        <a className="btn btn-ghost" href="/nodes">知识点</a>
        <a className="btn btn-ghost" href="/result">结果</a>
        <a className="btn btn-ghost" href="/admin">Admin</a>
        <a className="btn btn-ghost" href="/ai">AI</a>
        <a className="btn btn-ghost" href="/settings">设置</a>
      </div>
      <ThemeToggle/>
    </div>
  );
}
