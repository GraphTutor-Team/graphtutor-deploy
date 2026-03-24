export async function listNodes({ parentId='ROOT', q='' } = {}){
  const qs = new URLSearchParams({ parentId, q }).toString();
  const r = await fetch(`/api/graph/nodes?${qs}`);
  if(!r.ok) throw new Error('nodes_list_failed');
  return await r.json();
}

export async function createOrUpdateNode({ id, name, parentId=null, order=0 }){
  const r = await fetch('/api/graph/nodes', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ id, name, parentId, order })
  });
  if(!r.ok) throw new Error('nodes_upsert_failed');
  return await r.json();
}

export async function patchNode(id, payload){
  const r = await fetch(`/api/graph/nodes/${encodeURIComponent(id)}`, {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!r.ok) throw new Error('nodes_patch_failed');
  return await r.json();
}

export async function deleteNode(id){
  const r = await fetch(`/api/graph/nodes/${encodeURIComponent(id)}`, { method:'DELETE' });
  if(!r.ok) throw new Error('nodes_delete_failed');
  return await r.json();
}

export async function getTree(){
  const r = await fetch('/api/graph/tree');
  if(!r.ok) throw new Error('tree_failed');
  return await r.json();
}

export async function getStats(){
  const r = await fetch('/api/graph/stats');
  if(!r.ok) throw new Error('stats_failed');
  return await r.json();
}
