// Non-destructive add-on component
import { useNavigate, Link } from 'react-router-dom';
import HelpTip from './HelpTip';

export default function PageHeader({ title, desc, subtitle, backTo='/', actions=[], help=null }){
  const nav = useNavigate();
  const description = desc ?? subtitle;
  return (
    <div className="mb-2 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="btn btn-ghost shrink-0"
            onClick={()=>nav(backTo)}
            aria-label="返回"
          >
            ← 返回
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {help && <HelpTip title="使用说明" content={help} />}
          {actions.map((a,i)=> a?.to
            ? <Link key={i} to={a.to} className={`btn ${a.variant||'btn-primary'}`}>{a.label}</Link>
            : <button key={i} type="button" onClick={a.onClick} className={`btn ${a.variant||'btn-primary'}`}>{a.label}</button>
          )}
        </div>
      </div>
    </div>
  );
}
