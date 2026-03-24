export function downloadFile(filename, text, type='application/json;charset=utf-8'){
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
export function toast(msg){
  if (window.toast) window.toast(msg);
  else alert(msg);
}
export function getStoredToken(){
  return localStorage.getItem('gt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
}
export async function jsonReq(url, opts={}){
  // 自动添加认证头
  const token = localStorage.getItem('gt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
  const headers = {
    ...opts.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const r = await fetch(url, {
    ...opts,
    headers,
  });
  if(!r.ok) throw new Error(await r.text().catch(()=>r.statusText));
  const ct = r.headers.get('content-type')||'';
  return ct.includes('application/json') ? r.json() : r.text();
}
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';
