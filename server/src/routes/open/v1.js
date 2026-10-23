import express from 'express';
import User from '../../models/User.js';
import Question from '../../models/Question.js';
import QuestionBank from '../../models/QuestionBank.js';
import Record from '../../models/Record.js';
import WrongQuestion from '../../models/WrongQuestion.js';

const router = express.Router();
const hits = new Map();

function rateLimit(key) {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  const recent = (hits.get(key) || []).filter((time) => time > windowStart);
  if (recent.length >= 60) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

async function openUser(req, res, next) {
  const header = String(req.headers.authorization || '');
  const apiKey = header.startsWith('Bearer ') ? header.slice(7).trim() : String(req.headers['x-api-key'] || '');
  if (!apiKey) {
    return res.status(401).json({ error: '缺少开放接口密钥' });
  }
  if (!rateLimit(apiKey)) {
    return res.status(429).json({ error: '每分钟最多 60 次' });
  }
  const user = await User.findOne({ apiKey }).select('_id name email').lean();
  if (!user) return res.status(401).json({ error: '开放接口密钥无效' });
  req.openUser = user;
  return next();
}

router.get('/', (req, res) => {
  res.json({
    name: 'GraphTutor Open API',
    auth: 'Authorization: Bearer <apiKey>',
    limit: '60 requests per minute per key',
    endpoints: [
      { method: 'GET', path: '/api/open/v1/questions', returns: '公开题目的题干和选项，不含答案' },
      { method: 'GET', path: '/api/open/v1/records', returns: '密钥所属用户最近的答题记录' },
      { method: 'GET', path: '/api/open/v1/wrong-questions', returns: '密钥所属用户的错题' },
    ],
  });
});

router.get('/questions', openUser, async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  const paidBanks = await QuestionBank.find({ pricePoints: { $gt: 0 } }).select('_id').lean();
  const items = await Question.find({ bankId: { $nin: paidBanks.map((bank) => bank._id) } })
    .select('content options difficulty type knowledgeNodeId subjectCode')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ data: items });
});

router.get('/records', openUser, async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const items = await Record.find({ userId: String(req.openUser._id) })
    .select('questionId knowledgeNodeId isCorrect createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ data: items });
});

router.get('/wrong-questions', openUser, async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const items = await WrongQuestion.find({ userId: String(req.openUser._id) })
    .select('questionId knowledgeNodeId errorCount lastErrorAt')
    .sort({ lastErrorAt: -1 })
    .limit(limit)
    .lean();
  res.json({ data: items });
});

export default router;
