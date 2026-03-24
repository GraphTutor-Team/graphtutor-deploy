export default function MarkdownPreview({ text='' }){
  const lines = String(text||'').split(/\r?\n/);
  const out = [];
  let inCode = false, buf = [];
  for (const line of lines){
    if (line.trim().startsWith('```')){
      if (!inCode){ inCode = true; buf = []; }
      else { inCode = false; out.push({type:'code', text:buf.join('\n')}); buf=[]; }
      continue;
    }
    if (inCode){ buf.push(line); continue; }
    out.push({ type:'text', text: line });
  }
  if (buf.length){ out.push({ type:'code', text: buf.join('\n') }); }
  return (
    <div className="space-y-2">
      {out.map((b,i)=> b.type==='code'
        ? <pre key={i} className="rounded-xl p-2 bg-slate-900 text-slate-100 overflow-auto"><code>{b.text}</code></pre>
        : <div key={i} className="whitespace-pre-wrap">{b.text}</div>)}
    </div>
  );
}
