// 会话测验。走统一的 api 客户端，POST/DELETE 才会带上 CSRF 和登录 token。
import api from './api.js';

function unwrap(error) {
  const data = error?.response?.data;
  const message = data?.error || data?.message || error?.message || '请求失败';
  return new Error(message);
}

async function call(request) {
  try {
    const res = await request();
    return res.data;
  } catch (error) {
    throw unwrap(error);
  }
}

export async function startSession({ userId, size, difficulty, node, bankId, subjectCode, questionIds }) {
  return call(() => api.post('/quizzes/session/start', {
    userId,
    size,
    difficulty,
    node,
    bankId,
    subjectCode,
    questionIds,
  }));
}

export async function getSession(id, opts = {}) {
  return call(() => api.get(`/quizzes/session/${id}`, {
    params: opts.reveal ? { reveal: '1' } : undefined,
  }));
}

export async function listSessions({ userId, status } = {}) {
  return call(() => api.get('/quizzes', {
    params: {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    },
  }));
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
  return call(() => api.post(`/quizzes/session/${sessionId}/answer`, {
    questionId,
    answerIndex,
    userAnswer,
    answer,
    timeSpentMs,
    userId,
  }));
}

export async function finishSession(sessionId) {
  return call(() => api.post(`/quizzes/session/${sessionId}/finish`));
}

export async function deleteSession(sessionId) {
  return call(() => api.delete(`/quizzes/session/${sessionId}`));
}
