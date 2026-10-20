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
    questionType = 'single',
    bloom = 'apply',
    review = true,
  } = config;

  const countNum = Math.max(1, Math.min(count, 20)); // 限制1-20
  const type = QUESTION_TYPES.includes(questionType) ? questionType : 'single';
  const bloomKey = BLOOM_LEVELS[bloom] ? bloom : 'apply';

  try {
    const prompt = buildGenerationPrompt({
      subjectName,
      difficulty,
      count: countNum,
      knowledgePoint,
      reference,
      questionType: type,
      bloom: bloomKey,
    });

    const messages = [
      {
        role: 'system',
        content:
          '你是中国高校课程的出题教师。题目必须可判分、干扰项来自真实误解、解析能独立讲清「为什么对、怎么想、哪里容易错」。只输出 JSON 数组，不要 Markdown。',
      },
      { role: 'user', content: prompt },
    ];

    const content = await callOpenAI(messages, {
      temperature: type === 'short' ? 0.6 : 0.7,
    });

    let questions = extractJsonArray(content);
    let reviewed = false;

    if (review !== false && questions.length > 0 && countNum <= 10) {
      try {
        const revised = await reviewGeneratedQuestions(questions, {
          subjectName,
          knowledgePoint,
          difficulty,
          questionType: type,
        });
        if (revised.length > 0) {
          questions = revised;
          reviewed = true;
        }
      } catch (reviewErr) {
        console.warn('[AI] 审题修订跳过:', reviewErr.message);
      }
    }

    const normalized = normalizeQuestions(questions, {
      subjectCode,
      difficulty,
      questionType: type,
    });

    const duration = Date.now() - startTime;

    await logAIRun({
      userId,
      type: 'generate',
      input: { ...config, questionType: type, bloom: bloomKey, reviewed },
      output: { count: normalized.length, reviewed },
      duration,
      status: 'success',
      cost: estimateCost(countNum * (reviewed ? 2 : 1), 'gpt-4o-mini'),
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

const QUESTION_TYPES = ['single', 'multiple', 'judge', 'fill', 'short', 'mixed'];

const BLOOM_LEVELS = {
  remember: '记忆：考查定义、术语、基本事实，不要求推导',
  understand: '理解：考查概念对比、为什么成立，能用自己的话解释',
  apply: '应用：给出具体情境或小数据，要求选用正确方法得出结果',
  analyze: '分析：需要拆步骤、比较方案或定位错误，干扰项对应不同推理路径',
};

const TYPE_SPEC = {
  single: `题型 type 固定为 "single"。4 个互斥选项，有且仅有 1 个正确，correctIndex 为 0–3。`,
  multiple: `题型 type 固定为 "multiple"。4 个选项，2–3 个正确，correctIndexes 为下标数组（不要只给一个）。`,
  judge: `题型 type 固定为 "judge"。options 必须是 ["正确","错误"]，correctIndex 为 0 或 1。陈述句要有明确对错，避免含糊。`,
  fill: `题型 type 固定为 "fill"。题干用 ____ 标出 1–2 个空，options 为空数组，blankAnswers 为标准答案（可含常见等价写法，每空一个主答案）。`,
  short: `题型 type 固定为 "short"。options 为空数组，referenceAnswer 为 80–180 字参考答案，explain 说明评分要点。`,
  mixed: `在 single、multiple、judge、fill 中混合出题，每种至少尽量覆盖，type 字段必须准确。`,
};

/**
 * 构建题目生成 Prompt
 */
function buildGenerationPrompt({
  subjectName,
  difficulty,
  count,
  knowledgePoint,
  reference,
  questionType,
  bloom,
}) {
  return `请围绕「${subjectName}」出 ${count} 道题。

难度：${difficulty}（1 非常基础 / 2 基础 / 3 中等 / 4 偏难 / 5 挑战）。相邻题目不要同一问法。
认知层次：${BLOOM_LEVELS[bloom]}
${TYPE_SPEC[questionType] || TYPE_SPEC.single}
${knowledgePoint ? `必须紧扣知识点：${knowledgePoint}。不要跑题。\n` : ''}${reference ? `参考材料（只据此出题，不要编造材料里没有的事实）：\n${String(reference).slice(0, 4000)}\n` : ''}
出题约束：
- 干扰项写学生真实会犯的错（概念混淆、边界条件、符号/方向弄反），禁止「以上都对/都不对」、禁止选项互相重复或明显长度泄题。
- 题干不出现答案原文。
- explain 用三段纯文本，用换行分隔，标题固定为：答案依据、解题步骤、易错点。每段 1–3 句。
- 只输出 JSON 数组。

元素字段：
{
  "type": "single|multiple|judge|fill|short",
  "content": "题干",
  "options": ["..."],
  "correctIndex": 0,
  "correctIndexes": [0, 2],
  "blankAnswers": ["空1"],
  "referenceAnswer": "简答参考答案",
  "difficulty": ${difficulty},
  "explain": "答案依据：...\\n解题步骤：...\\n易错点：..."
}`;
}

/**
 * 第二遍审题：改正答案、干扰项和解析结构
 */
async function reviewGeneratedQuestions(questions, context) {
  const payload = JSON.stringify(questions).slice(0, 12000);
  const messages = [
    {
      role: 'system',
      content:
        '你是审题编辑。修正题目中的事实错误、唯一答案冲突、无效干扰项和空解析。保持题量和题型，只输出 JSON 数组。',
    },
    {
      role: 'user',
      content: `学科：${context.subjectName}。知识点：${context.knowledgePoint || '未指定'}。难度：${context.difficulty}。期望题型：${context.questionType}。

请检查并改写下面的题目：
1. 正确答案必须站得住，多选不能只剩一个对的选项。
2. 删掉「以上都对」和重复选项，把过弱的干扰项改成常见误解。
3. explain 必须含「答案依据」「解题步骤」「易错点」。
4. 不要新增与知识点无关的题。

${payload}`,
    },
  ];

  const content = await callOpenAI(messages, { temperature: 0.2 });
  return extractJsonArray(content);
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
function normalizeQuestions(questions, { subjectCode, difficulty, questionType }) {
  const normalized = [];
  const fallbackType = questionType === 'mixed' ? 'single' : questionType;

  for (const q of questions) {
    if (!q?.content) continue;

    const type = QUESTION_TYPES.includes(q.type) && q.type !== 'mixed'
      ? q.type
      : fallbackType || 'single';
    const options = Array.isArray(q.options) ? q.options.map((opt) => String(opt).trim()).filter(Boolean) : [];
    const explain = String(q.explain || '').trim();
    const base = {
      type,
      content: String(q.content).trim(),
      difficulty: q.difficulty || difficulty,
      subjectCode,
      explain,
      source: 'ai',
      tags: ['ai-generated'],
    };

    if (type === 'judge') {
      const opts = options.length >= 2 ? options.slice(0, 2) : ['正确', '错误'];
      const correctIndex = q.correctIndex === 1 ? 1 : 0;
      normalized.push({
        ...base,
        options: opts,
        answerIndex: correctIndex,
        answer: correctIndex,
      });
      continue;
    }

    if (type === 'multiple') {
      if (options.length < 2) continue;
      const indexes = (Array.isArray(q.correctIndexes) ? q.correctIndexes : [q.correctIndex])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
      const unique = [...new Set(indexes)];
      if (unique.length === 0) continue;
      normalized.push({
        ...base,
        options,
        answer: unique,
        answerIndex: unique[0],
      });
      continue;
    }

    if (type === 'fill') {
      const blanks = (Array.isArray(q.blankAnswers) ? q.blankAnswers : [])
        .map((a) => String(a).trim())
        .filter(Boolean);
      if (blanks.length === 0) continue;
      normalized.push({
        ...base,
        options: [],
        blankAnswers: blanks,
        blanks: blanks.length,
        answer: blanks,
      });
      continue;
    }

    if (type === 'short') {
      const referenceAnswer = String(q.referenceAnswer || q.answer || '').trim();
      if (!referenceAnswer && !explain) continue;
      normalized.push({
        ...base,
        options: [],
        answer: referenceAnswer,
        referenceAnswer,
      });
      continue;
    }

    if (options.length < 2) continue;
    const correctIndex = Math.max(0, Math.min(Number(q.correctIndex) || 0, options.length - 1));
    normalized.push({
      ...base,
      type: 'single',
      options,
      answerIndex: correctIndex,
      answer: correctIndex,
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

