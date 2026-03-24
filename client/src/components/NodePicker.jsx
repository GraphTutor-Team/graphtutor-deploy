import { useEffect, useMemo, useState } from 'react';
import { listNodes } from '../api/graph';

export default function NodePicker({ value='', onChange }){
  const [tree, setTree] = useState([]);
  const [q, setQ] = useState('');

  useEffect(()=>{
    (async ()=>{
      try{
        const t = await listNodes({ tree:true });
        setTree(t||[]);
      }catch{ /* ignore */ }
    })();
  }, []);

  const flat = useMemo(()=>{
    const out = [];
    const walk = (arr, d=0)=> arr.forEach(n=>{ out.push({ d, n }); (n.children||[]).length && walk(n.children, d+1); });
    walk(tree, 0);
    if(!q) return out;
    const k = q.toLowerCase();
    return out.filter(x => (`${x.n.name} ${x.n.key}`).toLowerCase().includes(k));
  }, [tree, q]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2">
      <div className="text-xs text-slate-500 mb-2">选择知识点（单选）</div>
      <input className="input w-full mb-2" placeholder="搜索..." value={q} onChange={e=>setQ(e.target.value)} />
      <div className="max-h-64 overflow-auto text-sm">
        <label className="flex items-center gap-2 py-1 px-2">
          <input type="radio" name="nodepick" checked={!value} onChange={()=>onChange?.('')} />
          <span className="text-slate-500">（全部）</span>
        </label>
        {flat.map(({d,n})=>(
          <label key={n._id} className="flex items-center gap-2 py-1 px-2" style={{ paddingLeft: `${(d+1)*8}px` }}>
            <input type="radio" name="nodepick" checked={value===n.key} onChange={()=>onChange?.(n.key)} />
            <span>{n.name}</span>
            <span className="text-xs text-slate-500">({n.key})</span>
          </label>
        ))}
      </div>
    </div>
  );
}
