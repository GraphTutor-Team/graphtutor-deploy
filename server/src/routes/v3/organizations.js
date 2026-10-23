import express from 'express';
import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import Record from '../../models/Record.js';
import { requireAuth } from '../../middleware/auth.js';
import { sanitizeString } from '../../middleware/validation.js';

const router = express.Router();

function memberIds(org) {
  const ids = new Set([String(org.ownerId)]);
  for (const member of org.members || []) ids.add(String(member.userId));
  return [...ids];
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = String(req.user.id);
    const items = await Organization.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('GET /api/v3/organizations error:', err);
    res.status(500).json({ success: false, message: '获取机构失败' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const name = sanitizeString(req.body?.name || '', { maxLength: 80 });
    if (!name) {
      return res.status(400).json({ success: false, message: '机构名称不能为空' });
    }
    const org = await Organization.create({
      name,
      ownerId: String(req.user.id),
      members: [{ userId: String(req.user.id), role: 'admin' }],
    });
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    console.error('POST /api/v3/organizations error:', err);
    res.status(500).json({ success: false, message: '创建机构失败' });
  }
});

router.post('/:id/members', requireAuth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: '机构不存在' });
    if (String(org.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '只有机构创建者可以添加成员' });
    }
    const email = sanitizeString(req.body?.email || '', { maxLength: 200 });
    const user = email
      ? await User.findOne({ email }).select('_id').lean()
      : null;
    const userId = String(user?._id || req.body?.userId || '');
    if (!userId) {
      return res.status(400).json({ success: false, message: '找不到这个用户' });
    }
    const role = ['admin', 'teacher', 'student'].includes(req.body?.role) ? req.body.role : 'student';
    const existing = (org.members || []).find((item) => String(item.userId) === userId);
    if (existing) existing.role = role;
    else org.members.push({ userId, role });
    await org.save();
    res.json({ success: true, data: org });
  } catch (err) {
    console.error('POST /api/v3/organizations/:id/members error:', err);
    res.status(500).json({ success: false, message: '添加成员失败' });
  }
});

router.get('/:id/dashboard', requireAuth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).lean();
    if (!org) return res.status(404).json({ success: false, message: '机构不存在' });
    const ids = memberIds(org);
    if (!ids.includes(String(req.user.id))) {
      return res.status(403).json({ success: false, message: '只能查看自己所在机构的学情' });
    }
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, correct] = await Promise.all([
      Record.countDocuments({ userId: { $in: ids }, createdAt: { $gte: since } }),
      Record.countDocuments({ userId: { $in: ids }, createdAt: { $gte: since }, isCorrect: true }),
    ]);
    res.json({
      success: true,
      data: {
        name: org.name,
        memberCount: ids.length,
        days: 30,
        source: '答题记录',
        answerCount: total,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/organizations/:id/dashboard error:', err);
    res.status(500).json({ success: false, message: '获取学情失败' });
  }
});

export default router;
