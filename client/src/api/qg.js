import { API_BASE } from '../utils/download';

export async function genFromText({ text, node='misc', difficulty=1, upsert=false, limit=12 }){
  const r = await fetch(`${API_BASE}/qg/generate-from-text`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ text, node, difficulty, upsert, limit })
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function genFromFile({ file, node='misc', difficulty=1, upsert=false, limit=12 }){
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${API_BASE}/qg/generate-from-file?node=${encodeURIComponent(node)}&difficulty=${difficulty}&upsert=${upsert?1:0}&limit=${limit}`, {
    method:'POST',
    body: fd
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}
