export default function ProgressBar({ value=0, total=10 }){
  const pct = total>0 ? Math.min(100, Math.round(value*100/total)) : 0;
  return (
    <div className="w-full h-2 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
      <div className="h-2 bg-blue-600" style={{ width:`${pct}%` }} />
    </div>
  );
}
