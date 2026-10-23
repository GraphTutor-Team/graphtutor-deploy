import api from './api.js';

function fail(error, fallback) {
  const status = error?.response?.status;
  return new Error(status ? `${fallback}` : (error?.message || fallback));
}

async function call(request, fallback) {
  try {
    const res = await request();
    return res.data;
  } catch (error) {
    throw fail(error, fallback);
  }
}

export async function listNodes({ parentId = 'ROOT', q = '' } = {}) {
  return call(
    () => api.get('/graph/nodes', { params: { parentId, q } }),
    'nodes_list_failed',
  );
}

export async function createOrUpdateNode({ id, name, parentId = null, order = 0 }) {
  return call(
    () => api.post('/graph/nodes', { id, name, parentId, order }),
    'nodes_upsert_failed',
  );
}

export async function patchNode(id, payload) {
  return call(
    () => api.patch(`/graph/nodes/${encodeURIComponent(id)}`, payload),
    'nodes_patch_failed',
  );
}

export async function deleteNode(id) {
  return call(
    () => api.delete(`/graph/nodes/${encodeURIComponent(id)}`),
    'nodes_delete_failed',
  );
}

export async function getTree() {
  return call(() => api.get('/graph/tree'), 'tree_failed');
}

export async function getStats() {
  return call(() => api.get('/graph/stats'), 'stats_failed');
}
