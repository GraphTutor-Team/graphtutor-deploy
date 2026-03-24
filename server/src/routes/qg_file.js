/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/routes/qg_file.js
 * 模块功能：题目生成（Question Generation）实验性路由，用于探索不同出题策略的接口。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

import express from 'express';
import multer from 'multer';
import Question from '../models/Question.js';
import { splitSentences, pickKeyword } from '../utils/textProcessing.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function guessTextFromBuffer(file){
  const name = (file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const buf = file.buffer || Buffer.from([]);
  const asText = () => buf.toString('utf-8');
  if (/\.(txt|md|markdown|csv|json)$/.test(name) || /(text\/plain|text\/markdown|application\/json)/.test(mime)){
    return asText();
  }
  return null;
}
function makeDistractors(answer, pool){
  const uniq = Array.from(new Set(pool.filter(x=>x && x!==answer)));
  const picked = [];
  for (const w of uniq){
    if (picked.length >= 3) break;
    if ((w.length>=2 && /[\u4e00-\u9fa5]/.test(w)) || w.length>=3) picked.push(w);
  }
  while(picked.length<3) picked.push('（无关项）');
  return picked.slice(0,3);
}
function buildMCQsFromText(text, { node='misc', difficulty=1, limit=10 }){
  const sentences = splitSentences(text);
  const items = [];
  const pool = sentences.flatMap(s => (s.match(/[\u4e00-\u9fa5]{2,}|[A-Za-z]{3,}/g)||[])).slice(0, 200);
  for (let i=0;i<sentences.length && items.length<limit;i++){
    const s = sentences[i];
    const key = pickKeyword(s);
    if (!key) continue;
    const stem = s.replace(key, '____');
    const distractors = makeDistractors(key, pool);
    const options = [key, ...distractors].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(key);
    const id = `${String(node).toUpperCase()}-AUTO-${Date.now()}-${i}`;
    items.push({
      id,
      content: `填空：${stem}`,
      options,
      correctIndex,
      knowledgeNodeId: node,
      difficulty,
      explain: `原句：${s}\n空格处答案：${key}`
    });
  }
  return items;
}

router.post('/generate-from-text', async (req, res) => {
  const { text='', node='misc', difficulty=1, upsert=true, limit=12 } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error:'text required' });
  const items = buildMCQsFromText(text, { node, difficulty, limit });
  if (upsert && items.length){
    const ops = items.map(q => ({ updateOne: { filter:{ id:q.id }, update:{ $set:q }, upsert:true } }));
    await Question.bulkWrite(ops, { ordered:false });
  }
  res.json({ ok:true, generated: items.length, items });
});

router.post('/generate-from-file', upload.single('file'), async (req, res) => {
  const node = (req.query.node || 'misc');
  const difficulty = parseInt(req.query.difficulty||'1', 10) || 1;
  const upsert = String(req.query.upsert||'1') !== '0';
  const limit = Math.min(50, parseInt(req.query.limit||'12',10) || 12);

  if (!req.file) return res.status(400).json({ error:'file required' });
  let text = guessTextFromBuffer(req.file);

  if (!text && /\.docx$/i.test(req.file.originalname||'')){
    try{
      const mammoth = await import('mammoth').then(m=>m.default?m.default:m).catch(()=>null);
      if (mammoth){
        const r = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = r.value || '';
      }
    }catch{}
  }

  if (!text && /\.pdf$/i.test(req.file.originalname||'')){
    try{
      const pdfParse = await import('pdf-parse').then(m=>m.default?m.default:m).catch(()=>null);
      if (pdfParse){
        const r = await pdfParse(req.file.buffer);
        text = r.text || '';
      }
    }catch{}
  }

  if (!text) return res.status(415).json({ error:'unsupported file type (支持 .txt/.md/.json/.docx/.pdf)' });

  const items = buildMCQsFromText(text, { node, difficulty, limit });
  if (upsert && items.length){
    const ops = items.map(q => ({ updateOne: { filter:{ id:q.id }, update:{ $set:q }, upsert:true } }));
    await Question.bulkWrite(ops, { ordered:false });
  }
  res.json({ ok:true, generated: items.length, items });
});

export default router;
