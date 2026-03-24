// server/scripts/import-exercism-all.js
// 一次导入 exercism-repos 下所有轨道的练习说明，自动生成选择题写入 Question 集合

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from '../src/db.js';
import Question from '../src/models/Question.js';
import KnowledgeNode from '../src/models/KnowledgeNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Exercism 根目录：优先用 EXERCISM_REPOS_DIR，否则默认 ../exercism-repos
const EXERCISM_ROOT =
  process.env.EXERCISM_REPOS_DIR ||
  path.resolve(__dirname, '../../exercism-repos');

// 如果你想让 Exercism 题库放到“独立数据库”，可以在 .env 里设这个；
// 否则就回退用正常的 MONGODB_URI（直接导入到 GraphTutor 主库）
const EXERCISM_MONGODB_URI = process.env.EXERCISM_MONGODB_URI;

// ===== 文本 -> 选择题 的小工具函数（使用公共工具模块） =====
import { splitSentences, pickKeyword } from '../src/utils/textProcessing.js';

function makeDistractors(answer, pool) {
  const uniq = Array.from(new Set(pool.filter((x) => x && x !== answer)));
  const picked = [];
  for (const w of uniq) {
    if (picked.length >= 3) break;
    if ((/[\u4e00-\u9fa5]/.test(w) && w.length >= 2) || w.length >= 3) {
      picked.push(w);
    }
  }
  while (picked.length < 3) picked.push('（无关项）');
  return picked.slice(0, 3);
}

function buildMCQsFromText(
  text,
  { node = 'misc', difficulty = 1, limit, idPrefix = 'EX' } = {}
) {
  const sentences = splitSentences(text);
  const items = [];

  // ⭐ limit <= 0 或未传 -> 表示“不限”，最多按句子数量来
  const maxQuestions =
    !limit || limit <= 0 ? sentences.length : limit;

  const pool = [];
  for (const s of sentences) {
    const segs = s.match(/[\u4e00-\u9fa5]{2,}|[A-Za-z]{3,}/g) || [];
    for (const w of segs) {
      pool.push(w);
      if (pool.length >= 200) break;
    }
    if (pool.length >= 200) break;
  }

  for (
    let i = 0;
    i < sentences.length && items.length < maxQuestions;
    i += 1
  ) {
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

// ===== 针对单个轨道（如 c / javascript）导入 =====

async function importTrack(track) {
  const nodeKey = `exercism-${track}`;
  const nodeName = `Exercism ${track.toUpperCase()} 练习题`;

  // 确保有一个对应的知识点节点
  await KnowledgeNode.updateOne(
    { key: nodeKey },
    { $set: { key: nodeKey, name: nodeName } },
    { upsert: true }
  );

  const practiceDir = path.join(
    EXERCISM_ROOT,
    track,
    'exercises',
    'practice'
  );

  if (!fs.existsSync(practiceDir)) {
    console.warn(`⚠️ 跳过轨道 "${track}"：未找到 ${practiceDir}`);
    return { track, generated: 0, upserted: 0 };
  }

  const entries = fs
    .readdirSync(practiceDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(
    `\n=== 轨道 "${track}"：共 ${entries.length} 个练习 ===`
  );

  const ops = [];

  for (const slug of entries) {
    const instructionsPath = path.join(
      practiceDir,
      slug,
      '.docs',
      'instructions.md'
    );

    if (!fs.existsSync(instructionsPath)) {
      // 有些老练习可能没有 .docs 目录，直接跳过
      continue;
    }

    const raw = fs.readFileSync(instructionsPath, 'utf8');

    // 每个练习最多生成 4 道题（避免整个库太大，你可以自己调）
    const items = buildMCQsFromText(raw, {
      node: nodeKey,
      difficulty: 1,
      limit: 0,
      idPrefix: slug.toUpperCase(),
    });

    if (!items.length) continue;

    items.forEach((q, idx) => {
      const bizId = `EX-${track.toUpperCase()}-${slug}-${idx + 1}`;
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
    console.log(`轨道 "${track}" 未生成任何题目。`);
    return { track, generated: 0, upserted: 0 };
  }

  const result = await Question.bulkWrite(ops, { ordered: false });

  const upserted = result.upsertedCount || 0;
  console.log(
    `✅ 轨道 "${track}" 导入完成：生成 ${ops.length} 题，新增 ${upserted} 题`
  );

  return { track, generated: ops.length, upserted };
}

// ===== 主入口：遍历所有轨道 =====

async function run() {
  // 如果你想把 Exercism 题库放“独立数据库”，这里动态改一下 MONGODB_URI
  if (EXERCISM_MONGODB_URI) {
    console.log('使用独立 Exercism 数据库 URI:', EXERCISM_MONGODB_URI);
    process.env.MONGODB_URI = EXERCISM_MONGODB_URI;
  } else {
    console.log(
      '未设置 EXERCISM_MONGODB_URI，将使用默认 MONGODB_URI（直接导入 GraphTutor 主库）'
    );
  }

  console.log('Exercism 根目录:', EXERCISM_ROOT);
  if (!fs.existsSync(EXERCISM_ROOT)) {
    console.error('❌ 找不到 exercism-repos 目录：', EXERCISM_ROOT);
    process.exit(1);
  }

  await connectDB();

  const tracks = fs
    .readdirSync(EXERCISM_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  console.log('发现轨道列表：', tracks.join(', '));

  let totalGenerated = 0;
  let totalUpserted = 0;
  let usedTracks = 0;

  for (const track of tracks) {
    const r = await importTrack(track);
    if (r.generated > 0) {
      usedTracks += 1;
      totalGenerated += r.generated;
      totalUpserted += r.upserted;
    }
  }

  console.log('\n=== 全部结束 ===');
  console.log('参与导入的轨道数：', usedTracks);
  console.log('生成题目总数：', totalGenerated);
  console.log('其中新增题目数：', totalUpserted);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

