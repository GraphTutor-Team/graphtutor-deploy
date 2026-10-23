import api from './api.js';

function fail(error) {
  const data = error?.response?.data;
  const message = typeof data === 'string'
    ? data
    : (data?.error || data?.message || error?.message || '出题失败');
  return new Error(message);
}

export async function genFromText({ text, node = 'misc', difficulty = 1, upsert = false, limit = 12 }) {
  try {
    const res = await api.post('/qg/generate-from-text', { text, node, difficulty, upsert, limit });
    return res.data;
  } catch (error) {
    throw fail(error);
  }
}

export async function genFromFile({ file, node = 'misc', difficulty = 1, upsert = false, limit = 12 }) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await api.post('/qg/generate-from-file', fd, {
      params: { node, difficulty, upsert: upsert ? 1 : 0, limit },
    });
    return res.data;
  } catch (error) {
    throw fail(error);
  }
}
