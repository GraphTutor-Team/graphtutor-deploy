// server/scripts/import-exercism-c.js
// 从 Exercism C 轨道自动生成选择题并导入 Question 集合

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from '../src/db.js';
import Question from '../src/models/Question.js';
import KnowledgeNode from '../src/models/KnowledgeNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Exercism 根目录：优先用环境变量，其次默认用 项目根目录/exercism-repos
const EXERCISM_ROOT =
  process.env.EXERCISM_REPOS_DIR
  || path.resolve(__dirname, '../../exercism-repos');

// 先导入 C 语言轨道，后面你可以改成 'javascript' / 'java' / 'python' 等
const TRACK = process.env.EXERCISM_TRACK || 'c';

// ===== 文本 -> 选择题 的小工具函数（基本照搬 qg_file.js） =====

function splitSentences(raw) {
  const text = (raw || '')
    .replace(/[\r\t]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
  const parts = text.split(/(?<=[。！？.!?])\s+/);
  return parts.filter(s => s.length >= 15 && s.length <= 200).slice(0, 400);
}

function pickKeyword(s) {
  // 取一段话里最长的中文词 / 英文单词当成“关键字”
  const words = s.match(/[\u4e00-\u9fa5]{2,}|[A-Za-z]{4,}/g) || [];
  if (!words.length) return null;
  return words.sort((a, b) => b.length - a.length)[0];
}

function makeDistractors(answer, pool) {
  const uniq = Array.from(new Set(pool.filter(x => x && x !== answer)));
  const picked = [];
  for (const w of uniq) {
    if (picked.length >= 3) break;
    if ((w.length >= 2 && /[\u4e00-\u9fa5]/.test(w)) || w.length >= 3) {
      picked.push(w);
    }
  }
  while (picked.length < 3) picked.push('（无关项）');
  return picked.slice(0, 3);
}

function buildMCQsFromText(
  text,
  { node = 'misc', difficulty = 1, limit = 10, idPrefix = 'EX' } = {}
) {
  const sentences = splitSentences(text);
  const items = [];

  // 抽取一些词作为干扰项候选池
  const pool = [];
  for (const s of sentences) {
    const segs = s.match(/[\u4e00-\u9fa5]{2,}|[A-Za-z]{3,}/g) || [];
    for (const w of segs) {
      pool.push(w);
      if (pool.length >= 200) break;
    }
    if (pool.length >= 200) break;
  }

  for (let i = 0; i < sentences.length && items.length < limit; i += 1) {
    const s = sentences[i];
    const key = pickKeyword(s);
    if (!key) continue;

    const stem = s.replace(key, '____');
    const distractors = makeDistractors(key, pool);
    const options = [key, ...distractors].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(key);
    const id = `${String(node).toUpperCase()}-${idPrefix}-${i}`;

    items.push({
      id,
      content: `填空：${stem}`,
      options,
      correctIndex,
      knowledgeNodeId: node,
      difficulty,
      explain: `原句：${s}\n空格处答案：${key}`,
    });
  }
  return items;
}

// ===== 主逻辑：读取 Exercism C 题目说明，生成选择题并写入 Mongo =====

async function run() {
  await connectDB();

  const nodeKey = `exercism-${TRACK}`;
  const nodeName = `Exercism ${TRACK.toUpperCase()} 练习题`;

  // 1. 确保有一个对应的知识点节点（方便你在题库里按知识点筛选）
  await KnowledgeNode.updateOne(
    { key: nodeKey },
    { $set: { key: nodeKey, name: nodeName } },
    { upsert: true }
  );

  // 2. 找到对应轨道的 practice 目录，例如：exercism-repos/c/exercises/practice
  const practiceDir = path.join(EXERCISM_ROOT, TRACK, 'exercises', 'practice');
  if (!fs.existsSync(practiceDir)) {
    console.error('❌ 找不到目录：', practiceDir);
    console.error('请检查 EXERCISM_ROOT / TRACK 是否配置正确。');
    process.exit(1);
  }

  const entries = fs
    .readdirSync(practiceDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`在轨道 "${TRACK}" 中找到 ${entries.length} 个练习。`);

  const ops = [];

  for (const slug of entries) {
    // 每个练习的说明一般在 .docs/instructions.md
    const instructionsPath = path.join(
      practiceDir,
      slug,
      '.docs',
      'instructions.md'
    );
    if (!fs.existsSync(instructionsPath)) continue;

    const raw = fs.readFileSync(instructionsPath, 'utf8');

    // 每个练习最多生成 4 道题（你可以自己改）
    const items = buildMCQsFromText(raw, {
      node: nodeKey,
      difficulty: 1,
      limit: 4,
      idPrefix: slug.toUpperCase(),
    });

    if (!items.length) continue;

    items.forEach((q, idx) => {
      // 自定义业务 ID，方便以后识别、去重
      const bizId = `EX-${TRACK.toUpperCase()}-${slug}-${idx + 1}`;
      ops.push({
        updateOne: {
          filter: { id: bizId },
          update: {
            $set: {
              ...q,
              id: bizId,
            },
          },
          upsert: true,
        },
      });
    });

    console.log(`· ${slug} -> 生成 ${items.length} 题`);
  }

  if (!ops.length) {
    console.log('⚠️ 没有生成任何题目。请确认练习是否包含 .docs/instructions.md。');
    process.exit(0);
  }

  const result = await Question.bulkWrite(ops, { ordered: false });

  console.log('✅ 导入完成');
  console.log('  新增题目：', result.upsertedCount || 0);
  console.log('  匹配/更新：', result.matchedCount || 0, '/', result.modifiedCount || 0);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
