// client/src/api/graph.js
// Full Graph API (CRUD + reorder + import/export). ESM-safe.

const toJSON = async (r) => {
  if (!r.ok) throw new Error(`graph_api_error ${r.status}`);
  return r.json();
};

export async function listNodes({ parentId = "", q = "", tree = false } = {}) {
  const qs = new URLSearchParams({
    ...(parentId ? { parentId } : {}),
    ...(q ? { q } : {}),
    ...(tree ? { tree: 1 } : {}),
  }).toString();
  const r = await fetch(`/api/graph/nodes${qs ? `?${qs}` : ""}`);
  return toJSON(r);
}

export async function graphStats() {
  const r = await fetch(`/api/graph/stats`);
  return toJSON(r);
}

export async function createNode({ key, name, parentId = null, order = 0, meta = {} }) {
  const r = await fetch(`/api/graph/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, name, parentId, order, meta }),
  });
  return toJSON(r);
}

export async function updateNode(id, patch) {
  const r = await fetch(`/api/graph/nodes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {}),
  });
  return toJSON(r);
}

export async function deleteNode(id, { cascade = false } = {}) {
  const r = await fetch(`/api/graph/nodes/${encodeURIComponent(id)}${cascade ? "?cascade=1" : ""}`, {
    method: "DELETE",
  });
  return toJSON(r);
}

/**
 * 批量更新节点顺序。后端接口：POST /api/graph/nodes/reorder，请求体为 [{ key, order }, ...]
 * @param {Array<{ key: string, order: number }>} items - 节点 key 与目标 order 的数组
 */
export async function reorderNodes(items) {
  const arr = Array.isArray(items) ? items : [];
  const r = await fetch(`/api/graph/nodes/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arr),
  });
  return toJSON(r);
}

export async function exportGraph() {
  const r = await fetch(`/api/graph/export`);
  return toJSON(r);
}

export async function importGraph(items, { mode = "upsert" } = {}) {
  const r = await fetch(`/api/graph/import?mode=${encodeURIComponent(mode)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items || []),
  });
  return toJSON(r);
}
