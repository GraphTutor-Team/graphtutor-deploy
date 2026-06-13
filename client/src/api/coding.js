const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function getCodingRunStatus() {
  return request('/v3/coding/status');
}

export async function runJavaCode({ code, stdin = '' }) {
  return request('/v3/coding/run', {
    method: 'POST',
    body: JSON.stringify({ code, stdin, language: 'java' }),
  });
}
