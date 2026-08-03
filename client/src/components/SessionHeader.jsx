import ProgressBar from './ProgressBar.jsx';

export default function SessionHeader({ userId, sessionId, answered, total, onQuit }){
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold">测验会话</div>
        <div className="text-xs text-slate-500">用户：{userId}</div>
        <div className="text-xs text-slate-500">会话：{sessionId?.slice(-6)}</div>
        <div className="ml-auto w-48"><ProgressBar value={answered} total={total} /></div>
        <button className="btn btn-ghost" onClick={onQuit}>放弃本次</button>
      </div>
    </div>
  );
}
