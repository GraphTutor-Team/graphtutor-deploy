import { useState } from 'react';

export default function HelpTip({ title='说明', children }){
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-block">
      <button className="btn" onClick={()=>setOpen(true)}>？</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setOpen(false)} />
          <div className="relative z-10 max-w-xl w-[92vw] rounded-xl p-4 bg-white dark:bg-slate-900 shadow-md">
            <div className="text-lg font-semibold mb-2">{title}</div>
            <div className="prose prose-sm dark:prose-invert">
              {children}
            </div>
            <div className="text-right mt-4">
              <button className="btn" onClick={()=>setOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
