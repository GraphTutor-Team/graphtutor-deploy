// AI 出题 API。写入走统一 api 客户端，才会带上 CSRF。
import api from './api.js';

async function request(path, options = {}) {
  const method = (options.method || 'GET').toLowerCase();
  let data;
  if (options.body != null && options.body !== '') {
    data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
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
    const msg = body?.error || body?.message || (status ? `HTTP ${status}` : error?.message || '请求失败');
    throw new Error(msg);
  }
}

// 直接调用 /api/ai/generate
export async function generateQuestionsWithAI(payload) {
  return request('/ai/generate', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

// 查询 provider 列表
export async function getAIProviders() {
  return request('/ai/providers');
}

// 兼容旧代码：生成题库并写入 Question 集合
export async function generateBank(payload) {
  return generateQuestionsWithAI({
    ...(payload || {}),
    upsert: true,
  });
}
