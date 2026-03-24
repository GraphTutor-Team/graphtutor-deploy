export async function createSession({ userId='demo-user', total=10, difficulty=1, node=null }={}){
  const r = await fetch('/api/quizzes/session', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId, total, difficulty, node })
  });
  if(!r.ok) throw new Error('create_session_failed');
  return await r.json();
}

export async function sessionNext(sessionId){
  const r = await fetch(`/api/quizzes/session/${encodeURIComponent(sessionId)}/next`);
  if(!r.ok) throw new Error('session_next_failed');
  return await r.json();
}

export async function sessionAnswer(sessionId, { userId='demo-user', questionId, answerIndex, timeSpentMs=0 }){
  const r = await fetch(`/api/quizzes/session/${encodeURIComponent(sessionId)}/answer`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId, questionId, answerIndex, timeSpentMs })
  });
  if(!r.ok) throw new Error('session_answer_failed');
  return await r.json();
}

export async function sessionFinish(sessionId){
  const r = await fetch(`/api/quizzes/session/${encodeURIComponent(sessionId)}/finish`, { method:'POST' });
  if(!r.ok) throw new Error('session_finish_failed');
  return await r.json();
}
