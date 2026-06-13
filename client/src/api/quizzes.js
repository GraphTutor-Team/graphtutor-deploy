// client/src/api/quizzes.js
// 会话测验相关请求

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

export async function startSession({ userId, size, difficulty, node, bankId, subjectCode }) {
  return request('/quizzes/session/start', {
    method: 'POST',
    body: JSON.stringify({ userId, size, difficulty, node, bankId, subjectCode }),
  });
}

export async function getSession(id, opts = {}) {
  const params = new URLSearchParams();
  if (opts.reveal) params.set('reveal', '1');
  const qs = params.toString();
  const tail = qs ? `?${qs}` : '';
  return request(`/quizzes/session/${id}${tail}`);
}

export async function listSessions({ userId, status } = {}) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (status) params.set('status', status);
  const qs = params.toString();
  const tail = qs ? `?${qs}` : '';
  return request(`/quizzes${tail}`);
}

export async function submitAnswer({
  sessionId,
  questionId,
  answerIndex,
  userAnswer,
  answer,
  timeSpentMs,
  userId,
}) {
  return request(`/quizzes/session/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({
      questionId,
      answerIndex,
      userAnswer,
      answer,
      timeSpentMs,
      userId,
    }),
  });
}

export async function finishSession(sessionId) {
  return request(`/quizzes/session/${sessionId}/finish`, {
    method: 'POST',
  });
}

export async function deleteSession(sessionId) {
  return request(`/quizzes/session/${sessionId}`, {
    method: 'DELETE',
  });
}
