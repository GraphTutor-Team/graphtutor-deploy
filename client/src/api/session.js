import api from './api.js';

function fail(error, fallback) {
  const data = error?.response?.data;
  return new Error(data?.error || data?.message || fallback);
}

async function call(request, fallback) {
  try {
    const res = await request();
    return res.data;
  } catch (error) {
    throw fail(error, fallback);
  }
}

export async function createSession({ userId = 'demo-user', total = 10, difficulty = 1, node = null } = {}) {
  return call(
    () => api.post('/quizzes/session', { userId, total, difficulty, node }),
    'create_session_failed',
  );
}

export async function sessionNext(sessionId) {
  return call(
    () => api.get(`/quizzes/session/${encodeURIComponent(sessionId)}/next`),
    'session_next_failed',
  );
}

export async function sessionAnswer(sessionId, { userId = 'demo-user', questionId, answerIndex, timeSpentMs = 0 }) {
  return call(
    () => api.post(`/quizzes/session/${encodeURIComponent(sessionId)}/answer`, {
      userId,
      questionId,
      answerIndex,
      timeSpentMs,
    }),
    'session_answer_failed',
  );
}

export async function sessionFinish(sessionId) {
  return call(
    () => api.post(`/quizzes/session/${encodeURIComponent(sessionId)}/finish`),
    'session_finish_failed',
  );
}
