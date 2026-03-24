import { useEffect, useRef, useState } from 'react';
export default function TimerBadge({ running=true }){
  const [ms, setMs] = useState(0);
  const ref = useRef(null);
  useEffect(()=>{
    if(!running) return;
    const t0 = performance.now();
    ref.current = setInterval(()=> setMs(performance.now()-t0), 100);
    return ()=> clearInterval(ref.current);
  }, [running]);
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const ss = String(s%60).padStart(2,'0');
  return <span className="px-2 py-1 rounded-md bg-slate-800 text-white text-xs">{m}:{ss}</span>;
}
