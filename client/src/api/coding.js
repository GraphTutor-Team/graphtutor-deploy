import api from './api.js';

function fail(error) {
  const data = error?.response?.data;
  const status = error?.response?.status;
  return new Error(data?.message || data?.error || (status ? `HTTP ${status}` : error?.message || '请求失败'));
}

export async function getCodingRunStatus() {
  try {
    const res = await api.get('/v3/coding/status');
    return res.data;
  } catch (error) {
    throw fail(error);
  }
}

export async function runJavaCode({ code, stdin = '' }) {
  try {
    const res = await api.post('/v3/coding/run', { code, stdin, language: 'java' });
    return res.data;
  } catch (error) {
    throw fail(error);
  }
}
