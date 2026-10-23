// 题库管理 API：CRUD + 出题 + 导入导出 + 批量上架
import api from './api.js';

async function request(path, options = {}) {
  const method = (options.method || 'GET').toLowerCase();
  let data;
  if (options.body != null && options.body !== '') {
    if (typeof options.body === 'string') {
      try {
        data = JSON.parse(options.body);
      } catch {
        data = options.body;
      }
    } else {
      data = options.body;
    }
  }
  try {
    const res = await api.request({
      url: path,
      method,
      data,
      headers: options.headers,
    });
    return res.data;
  } catch (error) {
    const body = error?.response?.data;
    const status = error?.response?.status;
    const err = new Error(body?.error || body?.message || (status ? `HTTP ${status}` : error?.message || '请求失败'));
    err.status = status;
    throw err;
  }
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
    return await request('/questions/import/json', {
      method: 'POST',
      body: text,
    });
  } catch (e) {
    if (e.status === 404 || e.message === 'not-implemented') {
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

  try {
    const res = await api.get(`/questions/export${tail}`, { responseType: 'text' });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  } catch (error) {
    const status = error?.response?.status;
    throw new Error(status ? `导出题库失败 HTTP ${status}` : (error?.message || '导出题库失败'));
  }
}

// 导出题库 CSV（可选）
export async function exportQuestionsCSV({ node } = {}) {
  const params = new URLSearchParams();
  if (node) params.set('node', node);
  const qs = params.toString();
  const tail = qs ? `?${qs}` : '';

  try {
    const res = await api.get(`/questions/export/csv${tail}`, { responseType: 'text' });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  } catch (error) {
    const status = error?.response?.status;
    throw new Error(status ? `导出题库 CSV 失败 HTTP ${status}` : (error?.message || '导出题库 CSV 失败'));
  }
}

// 批量上架题目
export async function bulkUpsert(items) {
  try {
    return await request('/questions/bulk-upsert', {
      method: 'POST',
      body: JSON.stringify(items || []),
    });
  } catch (error) {
    if (error.status === 404) {
      throw new Error('bulk-upsert-not-implemented');
    }
    throw error;
  }
}
