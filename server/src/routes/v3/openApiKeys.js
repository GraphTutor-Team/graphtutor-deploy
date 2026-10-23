import crypto from 'crypto';
import express from 'express';
import User from '../../models/User.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/key', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('apiKey').lean();
  const key = user?.apiKey || '';
  res.json({
    success: true,
    data: { hasKey: !!key, preview: key ? `${key.slice(0, 6)}…` : '' },
  });
});

router.post('/key', requireAuth, async (req, res) => {
  try {
    const apiKey = `gt_${crypto.randomBytes(24).toString('hex')}`;
    await User.findByIdAndUpdate(req.user.id, { apiKey });
    res.json({
      success: true,
      data: { apiKey },
      message: '密钥只完整显示这一次，请自行保存。',
    });
  } catch (err) {
    console.error('POST /api/v3/open-api/key error:', err);
    res.status(500).json({ success: false, message: '生成密钥失败' });
  }
});

export default router;
