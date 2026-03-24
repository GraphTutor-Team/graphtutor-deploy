import React from 'react';
let setMsg = null;
export default function Toast(){
  const [msg, _setMsg] = React.useState('');
  React.useEffect(()=>{ setMsg = (m)=>{ _setMsg(m); setTimeout(()=>_setMsg(''), 2000); }; },[]);
  if (!msg) return null;
  return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-1.5 rounded-full shadow-lg">{msg}</div>;
}
export function toast(m){ if (setMsg) setMsg(m); }
if (typeof window !== 'undefined') window.toast = (m)=>toast(m);