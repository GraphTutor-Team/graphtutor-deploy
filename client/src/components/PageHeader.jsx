// Non-destructive add-on component
import { useNavigate, Link } from 'react-router-dom';
import HelpTip from './HelpTip';

export default function PageHeader({ title, desc, subtitle, backTo='/', actions=[], help=null }){
  const nav = useNavigate();
  const description = desc ?? subtitle;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button 
            className="btn btn-ghost hover:bg-blue-50 hover:text-blue-700 transition-colors" 
            onClick={()=>nav(backTo)} 
            aria-label="返回"
          >
            ← 返回
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">{title}</h1>
            {description && <p className="text-sm font-medium text-slate-600 mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {help && <HelpTip title="使用说明" content={help} />}
          {actions.map((a,i)=> a?.to
            ? <Link key={i} to={a.to} className={`btn ${a.variant||'btn-primary'} hover:shadow-md transition-all`}>{a.label}</Link>
            : <button key={i} onClick={a.onClick} className={`btn ${a.variant||'btn-primary'} hover:shadow-md transition-all`}>{a.label}</button>
          )}
        </div>
      </div>
    </div>
  );
}
