/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/services/llm.js
 * 模块功能：后端模块文件，用于实现 GraphTutor 系统的服务端逻辑（路由 / 模型 / 配置等）。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

const provider = (process.env.LLM_PROVIDER || 'OFF').toUpperCase();

export async function generateQuestions({ topic='javascript', count=1 } = {}) {
  if (provider === 'OPENAI') {
    const key = process.env.OPENAI_API_KEY;
    const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const prompt = `Generate ${count} simple multiple-choice questions about ${topic}. Return JSON array with fields: id, knowledgeNodeId, difficulty, content, options[4], answerIndex`;
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role:'user', content: prompt }], temperature: 0.3 })
    });
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '[]';
    try { return JSON.parse(text); } catch { return []; }
  }
  if (provider === 'OLLAMA') {
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    const prompt = `JSON only. ${count} MCQs about ${topic}. fields: id, knowledgeNodeId, difficulty, content, options[4], answerIndex`;
    const r = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    const data = await r.json();
    try { return JSON.parse(data.response); } catch { return []; }
  }
  return [{
    id: `ai-${Date.now()}`,
    knowledgeNodeId: `${topic}-basics`,
    difficulty: 1,
    content: `（本地示例）${topic} 的常量关键字是？`,
    options: ['let','const','var','static'],
    answerIndex: 1
  }];
}

export async function explainAnswer({ question, userAnswerIndex }) {
  if (provider === 'OPENAI') {
    const key = process.env.OPENAI_API_KEY;
    const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const prompt = `Question: ${JSON.stringify(question)} User answer index: ${userAnswerIndex} Explain why the correct answer is index ${question.answerIndex}.`;
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role:'user', content: prompt }], temperature: 0.2 })
    });
    const data = await r.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }
  if (provider === 'OLLAMA') {
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    const prompt = `Explain the correct answer with 2-3 sentences. Question JSON: ${JSON.stringify(question)} User answer: ${userAnswerIndex}`;
    const r = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    const data = await r.json();
    return data.response || '';
  }
  return '（本地模式）正确答案更稳，因为 const 声明常量不可被重新赋值。';
}
