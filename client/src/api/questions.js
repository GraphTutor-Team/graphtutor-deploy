// 题库管理 API：CRUD + 出题 + 导入导出 + 批量上架

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // 某些导出接口是纯文本
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function listQuestions({
  q,
  node,
  difficulty,
  skip = 0,
  limit = 20,
} = {}) {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });
  if (q) params.set('q', q);
  if (node) params.set('node', node);
  if (difficulty) params.set('difficulty', String(difficulty));

  return request(`/questions?${params.toString()}`);
}

export async function getQuestion(id) {
  return request(`/questions/${encodeURIComponent(id)}`);
}

export async function createQuestion(payload) {
  return request('/questions', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function updateQuestion(id, payload) {
  return request(`/questions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload || {}),
  });
}

export async function deleteQuestion(id) {
  return request(`/questions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// 即时练习“下一题”
export async function nextQuestion({ userId, node, difficulty } = {}) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (node) params.set('node', node);
  if (difficulty) params.set('difficulty', String(difficulty));
  const qs = params.toString();
  const tail = qs ? `?${qs}` : '';
  return request(`/questions/next${tail}`);
}

// 从 JSON 文本导入题库
export async function importQuestionsJSON(text) {
  if (typeof text !== 'string') {
    text = JSON.stringify(text ?? []);
  }

  try {
    const res = await fetch(`${BASE}/questions/import/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    });

    if (res.status === 404) {
      throw new Error('not-implemented');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const msg = data?.error || data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return await res.json();
  } catch (e) {
    if (e.message === 'not-implemented') {
      let items;
      try {
        items = JSON.parse(text);
      } catch {
        throw new Error('无法解析题库 JSON 文本');
      }
      return bulkUpsert(items);
    }
    throw e;
  }
}

// 导出题库 JSON（后端如果实现，对应 GET /questions/export）
export async function exportQuestions({ node } = {}) {
  const params = new URLSearchParams();
  if (node) params.set('node', node);
  const qs = params.toString();
  const tail = qs ? `?${qs}` : '';

  const res = await fetch(`${BASE}/questions/export${tail}`);
  if (!res.ok) {
    throw new Error(`导出题库失败 HTTP ${res.status}`);
  }
  return res.text();
}

// 导出题库 CSV（可选）
export async function exportQuestionsCSV({ node } = {}) {
  const params = new URLSearchParams();
  if (node) params.set('node', node);
  const qs = params.toString();
  const tail = qs ? `?${qs}` : '';

  const res = await fetch(`${BASE}/questions/export/csv${tail}`);
  if (!res.ok) {
    throw new Error(`导出题库 CSV 失败 HTTP ${res.status}`);
  }
  return res.text();
}

// 批量上架题目
export async function bulkUpsert(items) {
  const res = await fetch(`${BASE}/questions/bulk-upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items || []),
  });

  if (res.status === 404) {
    throw new Error('bulk-upsert-not-implemented');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return await res.json();
}
