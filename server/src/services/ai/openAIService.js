/**
 * GraphTutor V3.0 - OpenAI服务封装
 * 
 * 功能：封装OpenAI API调用，支持题目生成、质量分析、学科分类等
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import AIRunLog from '../../models/AIRunLog.js';

const execFileAsync = promisify(execFile);

/**
 * 调用AI API（支持OpenAI和千问等兼容接口，使用curl，解决Node fetch问题）
 * @param {Object} messages - 消息数组
 * @param {Object} options - 选项（model, temperature等）
 * @returns {Promise<string>} AI返回的内容
 */
async function callOpenAI(messages, options = {}) {
  // 优先使用千问配置，如果没有则使用OpenAI配置
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const defaultModel = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  
  if (!apiKey) {
    throw new Error('未配置 AI API密钥（请配置 LLM_API_KEY 或 OPENAI_API_KEY）');
  }

  const model = options.model || defaultModel;
  const temperature = options.temperature ?? 0.7;

  const body = JSON.stringify({
    model,
    messages,
    temperature,
  });

  // 构建API端点URL
  const apiUrl = baseUrl.endsWith('/v1') 
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/v1/chat/completions`;

  return new Promise((resolve, reject) => {
    const args = [
      apiUrl,
      '-H',
      `Authorization: Bearer ${apiKey}`,
      '-H',
      'Content-Type: application/json',
      '-d',
      body,
    ];

    execFile('curl', args, (err, stdout, stderr) => {
      if (err) {
        console.error('[AI] curl 调用 AI API 失败:', err, stderr);
        return reject(new Error('AI API 调用失败'));
      }

      try {
        const data = JSON.parse(stdout.toString());

        if (data.error) {
          console.error('[AI] AI API error:', data.error);
          return reject(new Error(data.error.message || 'AI API 返回错误'));
        }

        const content = data.choices?.[0]?.message?.content || '';
        if (!content) {
          console.warn('[AI] AI 返回了空 content');
        }

        resolve(content);
      } catch (e) {
        console.error('[AI] 解析 AI 响应失败:', e);
        reject(new Error('解析 AI 响应失败'));
      }
    });
  });
}

/**
 * 记录AI运行日志
 * @param {Object} logData - 日志数据
 */
async function logAIRun(logData) {
  try {
    await AIRunLog.create({
      ...logData,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('记录AI运行日志失败:', error);
    // 不阻塞主流程
  }
}

/**
 * 通用对话补全（学习伴侣 / 智能问答）
 * @param {Array<{role: string, content: string}>} messages - 消息列表，含 system/user/assistant
 * @param {Object} options - { model, temperature }
 * @param {string} [userId] - 用户ID，用于计费与限流
 * @returns {Promise<string>}
 */
export async function chatCompletion(messages, options = {}, userId = '') {
  const startTime = Date.now();
  try {
    const content = await callOpenAI(messages, {
      temperature: options.temperature ?? 0.7,
      model: options.model,
    });
    const duration = Date.now() - startTime;
    await logAIRun({
      userId: userId || 'anonymous',
      type: 'chat',
      input: { messageCount: messages.length },
      output: { length: content?.length ?? 0 },
      duration,
      status: 'success',
    });
    return content || '';
  } catch (error) {
    const duration = Date.now() - startTime;
    await logAIRun({
      userId: userId || 'anonymous',
      type: 'chat',
      input: { messageCount: messages.length },
      output: {},
      duration,
      status: 'error',
      error: error.message,
    });
    throw error;
  }
}

/**
 * 生成题目
 * @param {Object} config - 生成配置
 * @param {string} config.subjectCode - 学科代码
 * @param {string} config.subjectName - 学科名称
 * @param {number} config.difficulty - 难度（1-5）
 * @param {number} config.count - 生成数量
 * @param {string} config.knowledgePoint - 知识点
 * @param {string} config.reference - 参考内容
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 生成的题目列表
 */
export async function generateQuestions(config, userId) {
  const startTime = Date.now();
  const {
    subjectCode = 'DEFAULT',
    subjectName = '通用',
    difficulty = 3,
    count = 5,
    knowledgePoint = '',
    reference = '',
  } = config;

  const countNum = Math.max(1, Math.min(count, 20)); // 限制1-20

  try {
    const prompt = buildGenerationPrompt({
      subjectName,
      difficulty,
      count: countNum,
      knowledgePoint,
      reference,
    });

    const messages = [
      {
        role: 'system',
        content:
          '你是一名专业的出题老师，擅长为中国高校课程设计单选题。请严格按照要求输出JSON格式的题目数组。',
      },
      { role: 'user', content: prompt },
    ];

    const content = await callOpenAI(messages, {
      temperature: 0.7,
    });

    // 解析JSON数组
    const questions = extractJsonArray(content);

    // 规范化题目数据
    const normalized = normalizeQuestions(questions, {
      subjectCode,
      difficulty,
    });

    const duration = Date.now() - startTime;

    // 记录日志
    await logAIRun({
      userId,
      type: 'generate',
      input: config,
      output: { count: normalized.length },
      duration,
      status: 'success',
      cost: estimateCost(countNum, 'gpt-4o-mini'), // 估算成本
    });

    return normalized;
  } catch (error) {
    const duration = Date.now() - startTime;

    // 记录错误日志
    await logAIRun({
      userId,
      type: 'generate',
      input: config,
      output: {},
      duration,
      status: 'error',
      error: error.message,
    });

    throw error;
  }
}

/**
 * 分析题目质量
 * @param {Object} question - 题目对象
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeQuestion(question, userId) {
  const startTime = Date.now();

  try {
    const prompt = buildAnalysisPrompt(question);

    const messages = [
      {
        role: 'system',
        content:
          '你是一名专业的题目质量评估专家，擅长分析题目的合理性、准确性和教育价值。',
      },
      { role: 'user', content: prompt },
    ];

    const content = await callOpenAI(messages, {
      temperature: 0.3, // 分析任务使用较低温度
    });

    // 解析分析结果
    const analysis = parseAnalysisResult(content);

    const duration = Date.now() - startTime;

    // 记录日志
    await logAIRun({
      userId,
      type: 'analyze',
      input: { questionId: question._id || question.id },
      output: analysis,
      duration,
      status: 'success',
      questionId: question._id || question.id,
    });

    return analysis;
  } catch (error) {
    const duration = Date.now() - startTime;

    await logAIRun({
      userId,
      type: 'analyze',
      input: { questionId: question._id || question.id },
      output: {},
      duration,
      status: 'error',
      error: error.message,
      questionId: question._id || question.id,
    });

    throw error;
  }
}

/**
 * 推荐学科分类
 * @param {string} questionContent - 题目内容
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 推荐结果
 */
export async function classifySubject(questionContent, userId) {
  const startTime = Date.now();

  try {
    const prompt = `请分析以下题目内容，推荐最合适的学科分类：

题目内容：${questionContent}

请返回JSON格式：
{
  "subjectCode": "推荐的学科代码（如CS-DS）",
  "subjectName": "推荐的学科名称",
  "confidence": 0.95,
  "reason": "推荐理由"
}`;

    const messages = [
      {
        role: 'system',
        content:
          '你是一名专业的学科分类专家，擅长根据题目内容判断所属学科。',
      },
      { role: 'user', content: prompt },
    ];

    const content = await callOpenAI(messages, {
      temperature: 0.3,
    });

    // 解析推荐结果
    const recommendation = parseJsonResponse(content);

    const duration = Date.now() - startTime;

    await logAIRun({
      userId,
      type: 'classify',
      input: { questionContent },
      output: recommendation,
      duration,
      status: 'success',
    });

    return recommendation;
  } catch (error) {
    const duration = Date.now() - startTime;

    await logAIRun({
      userId,
      type: 'classify',
      input: { questionContent },
      output: {},
      duration,
      status: 'error',
      error: error.message,
    });

    throw error;
  }
}

/**
 * 生成题目解析
 * @param {Object} question - 题目对象
 * @param {string} userId - 用户ID
 * @returns {Promise<string>} 解析内容
 */
export async function generateExplanation(question, userId) {
  const startTime = Date.now();

  try {
    const opts = Array.isArray(question.options) ? question.options : [];
    const correctLabel = opts[question.answerIndex] != null ? opts[question.answerIndex] : '（见题目）';
    const prompt = `请为以下题目生成详细解析（答案依据 + 解题步骤 + 易错点）：

题目：${question.content}
选项：${opts.join('、')}
正确答案：${correctLabel}

请按以下结构用自然语言输出（约 200–400 字）：
1. **答案依据**：为什么该选项正确，依据是什么。
2. **解题步骤**：推荐的分析或推理步骤。
3. **易错点**：常见误选与如何避免。`;

    const messages = [
      {
        role: 'system',
        content: '你是一名专业的教学专家，擅长生成清晰易懂的题目解析。',
      },
      { role: 'user', content: prompt },
    ];

    const content = await callOpenAI(messages, {
      temperature: 0.5,
    });

    const duration = Date.now() - startTime;

    await logAIRun({
      userId,
      type: 'optimize',
      input: { questionId: question._id || question.id },
      output: { explanation: content },
      duration,
      status: 'success',
      questionId: question._id || question.id,
    });

    return content.trim();
  } catch (error) {
    const duration = Date.now() - startTime;

    await logAIRun({
      userId,
      type: 'optimize',
      input: { questionId: question._id || question.id },
      output: {},
      duration,
      status: 'error',
      error: error.message,
      questionId: question._id || question.id,
    });

    throw error;
  }
}

// ========== 辅助函数 ==========

/**
 * 构建题目生成Prompt
 */
function buildGenerationPrompt({ subjectName, difficulty, count, knowledgePoint, reference }) {
  return `你现在是一名专业出题老师，请围绕「${subjectName}」出 ${count} 道单选题。

难度要求：${difficulty}（1=非常基础，2=基础，3=中等，4=偏难，5=很难）
${knowledgePoint ? `知识点：${knowledgePoint}\n` : ''}
${reference ? `参考内容：${reference}\n` : ''}

请严格输出一个 JSON 数组，不要包含任何多余说明，不要使用 Markdown 代码块。
每个元素的格式如下：
{
  "content": "题干（清晰明确）",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "correctIndex": 0,
  "difficulty": ${difficulty},
  "explain": "解析说明（可选）"
}`;
}

/**
 * 构建质量分析Prompt
 */
function buildAnalysisPrompt(question) {
  return `请分析以下题目的质量，从以下维度评估：

题目：${question.content}
选项：${JSON.stringify(question.options)}
正确答案：${question.options[question.answerIndex]}

请返回JSON格式：
{
  "score": 85,
  "quality": "good",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "accuracy": 0.95,
  "clarity": 0.90,
  "difficulty": ${question.difficulty || 3}
}`;
}

/**
 * 提取JSON数组
 */
function extractJsonArray(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('AI 返回为空');
  }

  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('未找到 JSON 数组');
  }

  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

/**
 * 解析JSON响应
 */
function parseJsonResponse(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('未找到 JSON 对象');
  }

  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

/**
 * 解析分析结果
 */
function parseAnalysisResult(text) {
  try {
    return parseJsonResponse(text);
  } catch {
    // 如果解析失败，返回默认结果
    return {
      score: 70,
      quality: 'unknown',
      strengths: [],
      weaknesses: ['无法解析AI返回结果'],
      suggestions: ['请检查题目格式'],
    };
  }
}

/**
 * 规范化题目数据
 */
function normalizeQuestions(questions, { subjectCode, difficulty }) {
  const normalized = [];

  for (const q of questions) {
    if (!q.content || !Array.isArray(q.options) || q.options.length < 2) {
      continue;
    }

    const correctIndex = Math.max(
      0,
      Math.min(q.correctIndex || 0, q.options.length - 1)
    );

    normalized.push({
      content: String(q.content).trim(),
      options: q.options.map((opt) => String(opt).trim()),
      answerIndex: correctIndex,
      difficulty: q.difficulty || difficulty,
      subjectCode: subjectCode,
      explain: String(q.explain || '').trim(),
    });
  }

  return normalized;
}

/**
 * 生成长笔记的摘要卡片（Phase 1.4）
 * @param {string} content - 笔记正文（Markdown）
 * @param {string} [userId] - 用户ID
 * @returns {Promise<string>}
 */
export async function generateNoteSummary(content, userId = '') {
  if (!content || typeof content !== 'string') {
    return '';
  }
  const text = content.replace(/[#*_`\[\]()]/g, ' ').slice(0, 8000);
  const messages = [
    {
      role: 'system',
      content: '你是一名学习助手。请根据用户提供的笔记内容，用 1–3 句话生成简短摘要（不超过 150 字），便于在列表中快速浏览。只输出摘要正文，不要标题或多余说明。',
    },
    { role: 'user', content: text },
  ];
  const startTime = Date.now();
  try {
    const summary = await callOpenAI(messages, { temperature: 0.3 });
    const out = (summary || '').trim().slice(0, 500);
    await logAIRun({
      userId: userId || 'anonymous',
      type: 'note_summary',
      input: { length: content.length },
      output: { length: out.length },
      duration: Date.now() - startTime,
      status: 'success',
    });
    return out;
  } catch (error) {
    await logAIRun({
      userId: userId || 'anonymous',
      type: 'note_summary',
      input: { length: content.length },
      output: {},
      duration: Date.now() - startTime,
      status: 'error',
      error: error.message,
    });
    throw error;
  }
}

/**
 * 估算API调用成本（美元）
 */
function estimateCost(count, model = 'gpt-4o-mini') {
  // 简化的成本估算（实际应该根据token数量计算）
  const costPerQuestion = {
    'gpt-4o-mini': 0.001, // $0.001 per question
    'gpt-4-turbo': 0.01,
    'gpt-4': 0.03,
  };

  return (costPerQuestion[model] || 0.001) * count;
}

