/**
 * GraphTutor V3.0 - 师徒关系 API
 * 路径：/api/v3/mentor
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import MentorRelation from '../../models/MentorRelation.js';
import User from '../../models/User.js';

const router = express.Router();

/**
 * POST /api/v3/mentor/apply
 * 申请成为某用户的徒弟（传入 masterId）
 */
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const apprenticeId = req.user.id;
    const { masterId } = req.body || {};
    if (!masterId || masterId === apprenticeId) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的师傅用户ID',
      });
    }
    const master = await User.findById(masterId).select('name').lean();
    if (!master) {
      return res.status(404).json({
        success: false,
        message: '该用户不存在',
      });
    }
    const existing = await MentorRelation.findOne({
      masterId: String(masterId),
      apprenticeId,
    }).lean();
    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ success: false, message: '已申请过，请等待对方处理' });
      }
      if (existing.status === 'active') {
        return res.status(400).json({ success: false, message: '你们已是师徒关系' });
      }
      if (existing.status === 'rejected') {
        return res.status(400).json({ success: false, message: '对方已拒绝，不可重复申请' });
      }
    }
    const rel = await MentorRelation.create({
      masterId: String(masterId),
      apprenticeId,
      status: 'pending',
    });
    res.status(201).json({
      success: true,
      data: rel,
      message: '申请已发送，请等待对方接受',
    });
  } catch (err) {
    console.error('POST /api/v3/mentor/apply error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '申请失败',
    });
  }
});

/**
 * GET /api/v3/mentor/relations
 * 获取我的师徒关系（作为师傅或徒弟）
 */
router.get('/relations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { role, status } = req.query; // role: master | apprentice
    const query = { $or: [{ masterId: userId }, { apprenticeId: userId }] };
    if (role === 'master') query.masterId = userId;
    else if (role === 'apprentice') query.apprenticeId = userId;
    if (status) query.status = status;

    const list = await MentorRelation.find(query).sort({ createdAt: -1 }).lean();
    const masterIds = [...new Set(list.map((r) => r.masterId))];
    const apprenticeIds = [...new Set(list.map((r) => r.apprenticeId))];
    const userIds = [...new Set([...masterIds, ...apprenticeIds])];
    const users = await User.find({ _id: { $in: userIds } }).select('name avatarUrl').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const items = list.map((r) => ({
      ...r,
      master: userMap.get(r.masterId) || { name: '未知' },
      apprentice: userMap.get(r.apprenticeId) || { name: '未知' },
    }));

    res.json({
      success: true,
      data: { items },
    });
  } catch (err) {
    console.error('GET /api/v3/mentor/relations error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取师徒关系失败',
    });
  }
});

/**
 * GET /api/v3/mentor/applications
 * 作为师傅：待处理的申请列表
 */
router.get('/applications', requireAuth, async (req, res) => {
  try {
    const masterId = req.user.id;
    const list = await MentorRelation.find({ masterId, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
    const apprenticeIds = list.map((r) => r.apprenticeId);
    const users = await User.find({ _id: { $in: apprenticeIds } }).select('name avatarUrl').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const items = list.map((r) => ({
      ...r,
      apprentice: userMap.get(r.apprenticeId) || { name: '未知' },
    }));
    res.json({ success: true, data: { items } });
  } catch (err) {
    console.error('GET /api/v3/mentor/applications error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取申请列表失败',
    });
  }
});

/**
 * PUT /api/v3/mentor/relations/:id/accept
 * 师傅接受申请
 */
router.put('/relations/:id/accept', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rel = await MentorRelation.findById(req.params.id).lean();
    if (!rel || rel.masterId !== userId) {
      return res.status(404).json({ success: false, message: '关系不存在或无权操作' });
    }
    if (rel.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该申请已处理' });
    }
    await MentorRelation.findByIdAndUpdate(req.params.id, {
      status: 'active',
      respondedAt: new Date(),
    });
    res.json({ success: true, message: '已接受，对方已成为你的徒弟' });
  } catch (err) {
    console.error('PUT /api/v3/mentor/relations/:id/accept error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '操作失败',
    });
  }
});

/**
 * PUT /api/v3/mentor/relations/:id/reject
 * 师傅拒绝申请
 */
router.put('/relations/:id/reject', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rel = await MentorRelation.findById(req.params.id).lean();
    if (!rel || rel.masterId !== userId) {
      return res.status(404).json({ success: false, message: '关系不存在或无权操作' });
    }
    if (rel.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该申请已处理' });
    }
    await MentorRelation.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      respondedAt: new Date(),
    });
    res.json({ success: true, message: '已拒绝' });
  } catch (err) {
    console.error('PUT /api/v3/mentor/relations/:id/reject error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '操作失败',
    });
  }
});

export default router;
