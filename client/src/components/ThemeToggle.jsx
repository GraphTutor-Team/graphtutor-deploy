import { useEffect, useState } from 'react';
import { loadTheme, applyTheme } from '../utils/theme';

export default function ThemeToggle(){
  const [{theme, contrast}, setState] = useState({ theme:'auto', contrast:'off' });
  useEffect(()=>{ setState(loadTheme()); }, []);

  function setTheme(t){
    setState(s=>({ ...s, theme:t }));
    applyTheme(t, contrast);
    window.toast?.(`主题：${t}`);
  }
  function setContrast(c){
    setState(s=>({ ...s, contrast:c }));
    applyTheme(theme, c);
    window.toast?.(`高对比度：${c==='on'?'开启':'关闭'}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select className="input" value={theme} onChange={e=>setTheme(e.target.value)}>
        <option value="auto">跟随系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
      <select className="input" value={contrast} onChange={e=>setContrast(e.target.value)}>
        <option value="off">对比：关闭</option>
        <option value="on">对比：开启</option>
      </select>
    </div>
  );
}
