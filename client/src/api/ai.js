// client/src/api/ai.js
// AI 出题 API

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
  } catch {}

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
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
