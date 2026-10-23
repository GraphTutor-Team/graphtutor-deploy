// 图谱节点接口。写入走统一 api 客户端，才会带上 CSRF 和登录 token。
import api from './api.js';

function fail(error, fallback) {
  const data = error?.response?.data;
  const status = error?.response?.status;
  const message = data?.error || data?.message || (status ? `${fallback} ${status}` : error?.message || fallback);
  return new Error(message);
}

async function call(request, fallback) {
  try {
    const res = await request();
    return res.data;
  } catch (error) {
    throw fail(error, fallback);
  }
}

export async function findNodeName(key) {
  if (!key) return "";
  try {
    const data = await call(
      () => api.get('/graph/nodes', { params: { key, limit: 1 } }),
      'graph_api_error',
    );
    const list = Array.isArray(data) ? data : data?.nodes || [];
    return list.find((node) => String(node.key) === String(key))?.name || "";
  } catch {
    return "";
  }
}

export async function listNodes({ parentId = "", q = "", tree = false } = {}) {
  return call(
    () => api.get('/graph/nodes', {
      params: {
        ...(parentId ? { parentId } : {}),
        ...(q ? { q } : {}),
        ...(tree ? { tree: 1 } : {}),
      },
    }),
    'graph_api_error',
  );
}

export async function graphStats() {
  return call(() => api.get('/graph/stats'), 'graph_api_error');
}

export async function createNode({ key, name, parentId = null, order = 0, meta = {} }) {
  return call(
    () => api.post('/graph/nodes', { key, name, parentId, order, meta }),
    'graph_api_error',
  );
}

export async function updateNode(id, patch) {
  return call(
    () => api.put(`/graph/nodes/${encodeURIComponent(id)}`, patch || {}),
    'graph_api_error',
  );
}

export async function deleteNode(id, { cascade = false } = {}) {
  return call(
    () => api.delete(`/graph/nodes/${encodeURIComponent(id)}`, {
      params: cascade ? { cascade: 1 } : undefined,
    }),
    'graph_api_error',
  );
}

/**
 * 批量更新节点顺序。后端接口：POST /api/graph/nodes/reorder，请求体为 [{ key, order }, ...]
 * @param {Array<{ key: string, order: number }>} items - 节点 key 与目标 order 的数组
 */
export async function reorderNodes(items) {
  const arr = Array.isArray(items) ? items : [];
  return call(() => api.post('/graph/nodes/reorder', arr), 'graph_api_error');
}

export async function exportGraph() {
  return call(() => api.get('/graph/export'), 'graph_api_error');
}

export async function importGraph(items, { mode = "upsert" } = {}) {
  return call(
    () => api.post('/graph/import', items || [], { params: { mode } }),
    'graph_api_error',
  );
}
