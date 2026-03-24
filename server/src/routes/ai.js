/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/routes/ai.js
 * 模块功能：AI 出题路由模块，对接 OpenAI / DeepSeek / 本地伪 AI 服务生成试题。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/routes/ai.js
// AI 出题接口：支持 OpenAI / DeepSeek / 自建兼容服务 / 本地伪AI

import express from 'express';
import Question from '../models/Question.js';
import { execFile } from 'child_process';

const router = express.Router();

function toInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function buildPrompt({ subject, count, difficulty }) {
  const c = Math.max(1, Math.min(count || 5, 20));
  return (
    `你现在是一名专业出题老师，请围绕「${subject || '操作系统基础'}」出 ${c} 道单选题。\n` +
    `难度大致为 ${difficulty || 1}（1=容易，5=困难）。\n\n` +
    `请严格输出一个 JSON 数组，不要包含任何多余说明，不要使用 Markdown 代码块。\n` +
    `每个元素的格式如下：\n` +
    `{\n` +
    `  "content": "题干",\n` +
    `  "options": ["选项A", "选项B", "选项C", "选项D"],\n` +
    `  "correctIndex": 0,\n` +
    `  "difficulty": 1,\n` +
    `  "knowledgeNodeId": "可选，知识点ID",\n` +
    `  "explain": "可选，解析"\n` +
    `}`
  );
}

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

function normalizeQuestions(rawList, { defaultNodeId }) {
  const list = Array.isArray(rawList) ? rawList : [];
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i] || {};
    const content = String(item.content || '').trim();
    const options = Array.isArray(item.options)
      ? item.options.map(String)
      : [];
    let correctIndex = toInt(item.correctIndex, 0);
    const difficulty = item.difficulty || 1;
    const nodeId =
      String(item.knowledgeNodeId || defaultNodeId || 'ai-node');
    const explain = String(item.explain || '');

    if (!content || options.length < 2) continue;
    if (correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0;
    }

    out.push({
      content,
      options,
      correctIndex,
      difficulty,
      knowledgeNodeId: nodeId,
      explain,
    });
  }
  return out;
}

// 使用系统 curl 调用 OpenAI（解决 Node fetch failed 的问题）
async function callOpenAIWithCurl(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 OPENAI_API_KEY');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content:
          '你是一名专业的出题老师，擅长为中国高校课程设计单选题。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  return new Promise((resolve, reject) => {
    const args = [
      'https://api.openai.com/v1/chat/completions',
      '-H',
      `Authorization: Bearer ${apiKey}`,
      '-H',
      'Content-Type: application/json',
      '-d',
      body,
    ];

    execFile('curl', args, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[AI] curl 调用 OpenAI 失败:', err, stderr);
        return reject(new Error('curl 调用 OpenAI 失败'));
      }

      try {
        // 调试：打印一次原始返回
        console.log('[AI] OpenAI raw response:', stdout.toString());

        const data = JSON.parse(stdout);

        if (data.error) {
          console.error('[AI] OpenAI API error:', data.error);
          // 抛出错误，让上层看到真正原因（先别兜底）
          return reject(
            new Error(
              data.error.message || 'OpenAI API 返回错误'
            )
          );
        }

        const content = data.choices?.[0]?.message?.content || '';
        if (!content) {
          console.warn('[AI] OpenAI 返回了空 content');
        }
        resolve(content);
      } catch (e) {
        console.error('[AI] 解析 OpenAI 响应失败:', e, stdout);
        reject(new Error('解析 OpenAI 响应失败'));
      }
    });
  });
}


async function callLLM({ provider, prompt }) {
  // ★ 统一处理 prompt，保障为 UTF-8 安全字符串
  const safePrompt = (() => {
    if (prompt == null) return '';
    try {
      return String(prompt).normalize('NFC');
    } catch {
      return String(prompt);
    }
  })();

  // ===== OpenAI（通过 curl 调用）=====
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    console.log(
      '[AI] 调用 OpenAI (via curl), model =',
      process.env.OPENAI_MODEL || 'gpt-4o-mini'
    );
    const content = await callOpenAIWithCurl(safePrompt);
    return content;
  }

  // 后面的分支（DeepSeek / 自定义兼容服务）依赖 fetch
  if (typeof fetch !== 'function') {
    console.warn('[AI] 当前 Node 版本不支持 fetch，将使用伪AI兜底');
    return null;
  }

  // ===== DeepSeek =====
  if (provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const baseUrl =
      process.env.DEEPSEEK_BASE_URL ||
      'https://api.deepseek.com/v1';

    const resp = await fetch(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                '你是一名专业的出题老师，擅长为中国高校课程设计单选题。',
            },
            { role: 'user', content: safePrompt },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(
        '[AI] DeepSeek 调用失败:',
        resp.status,
        errText
      );
      throw new Error(`DeepSeek 调用失败 HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // ===== 自定义 OpenAI 兼容服务 =====
  if (
    provider === 'custom' &&
    process.env.LLM_BASE_URL &&
    process.env.LLM_API_KEY
  ) {
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';
    const baseUrl = process.env.LLM_BASE_URL.replace(/\/+$/, '');

    const resp = await fetch(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                '你是一名专业的出题老师，擅长为中国高校课程设计单选题。',
            },
            { role: 'user', content: safePrompt },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(
        '[AI] Custom LLM 调用失败:',
        resp.status,
        errText
      );
      throw new Error(`自定义 LLM 调用失败 HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // 没有可用的真实 LLM 时返回 null，后面走伪AI兜底
  return null;
}

function fallbackGenerate({ subject, count, difficulty }) {
  const c = Math.max(1, Math.min(count || 5, 20));
  const list = [];
  const baseSubject = subject || '操作系统基础';
  const diffText = difficulty >= 3 ? '较难' : '基础';

  for (let i = 0; i < c; i += 1) {
    const idx = i + 1;
    list.push({
      content: `【${baseSubject}·${diffText}】第 ${idx} 题：这是由内置伪AI生成的示例题目，用于演示系统功能。`,
      options: [
        '选项 A（示例）',
        '选项 B（示例）',
        '选项 C（示例）',
        '选项 D（示例）',
      ],
      correctIndex: 0,
      difficulty: difficulty || 1,
      knowledgeNodeId: 'ai-demo',
      explain:
        '这是内置伪AI生成的题目示例。接入真实大模型后，这里会变成真正智能生成的题目与解析。',
    });
  }
  return list;
}

/**
 * GET /api/ai/providers
 * 返回当前可用 provider 列表
 */
router.get('/providers', (req, res) => {
  const providers = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      id: 'openai',
      name: 'OpenAI',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }
  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      id: 'deepseek',
      name: 'DeepSeek',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    });
  }
  if (process.env.LLM_BASE_URL && process.env.LLM_API_KEY) {
    providers.push({
      id: 'custom',
      name: '自定义兼容服务',
      model: process.env.LLM_MODEL || 'custom-llm',
    });
  }

  // 永远提供一个本地伪AI选项
  providers.push({
    id: 'local-fallback',
    name: '内置伪AI出题（无需外网）',
    model: 'builtin',
  });

  res.json({ providers });
});

/**
 * POST /api/ai/generate
 */
router.post('/generate', async (req, res) => {
  const {
    subject,
    count,
    difficulty,
    provider = 'local-fallback',
    upsert,
  } = req.body || {};

  const num = Math.max(1, Math.min(toInt(count, 5), 20));
  const diff = difficulty ? toInt(difficulty, 1) : 1;

  try {
    const prompt = buildPrompt({
      subject,
      count: num,
      difficulty: diff,
    });

    let rawText = null;

    if (provider === 'local-fallback') {
      console.log('[AI] 使用本地伪AI出题');
    } else {
      rawText = await callLLM({ provider, prompt });
    }

    let questions = [];

    if (rawText) {
      try {
        const arr = extractJsonArray(rawText);
        questions = normalizeQuestions(arr, {
          defaultNodeId: 'ai-' + (subject || 'generic'),
        });
      } catch (e) {
        console.warn(
          '[AI] 解析大模型返回失败，改用伪AI兜底:',
          e.message
        );
        questions = fallbackGenerate({
          subject,
          count: num,
          difficulty: diff,
        });
      }
    } else {
      questions = fallbackGenerate({
        subject,
        count: num,
        difficulty: diff,
      });
    }

    if (!questions.length) {
      return res
        .status(500)
        .json({ error: '未生成任何有效题目' });
    }

    if (upsert) {
      const ops = questions.map((q, idx) => {
        const bizId = `AI-${Date.now()}-${idx}`;
        return {
          updateOne: {
            filter: { id: bizId },
            update: { $set: { id: bizId, ...q } },
            upsert: true,
          },
        };
      });

      const r = await Question.bulkWrite(ops, { ordered: false });
      return res.json({
        ok: true,
        mode: rawText ? 'ai-or-fallback' : 'fallback-only',
        generated: questions.length,
        upserted: r.upsertedCount || 0,
        matched: r.matchedCount || 0,
        modified: r.modifiedCount || 0,
        items: questions,
      });
    }

    res.json({
      ok: true,
      mode: rawText ? 'ai-or-fallback' : 'fallback-only',
      generated: questions.length,
      items: questions,
    });
  } catch (e) {
    console.error('POST /api/ai/generate error:', e);
    res
      .status(500)
      .json({ error: 'AI 出题失败：' + (e.message || '') });
  }
});

export default router;
