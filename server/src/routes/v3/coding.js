/**
 * POST /api/v3/coding/run - 本地 Java 编译运行
 */

import express from 'express';
import { runJavaCode, isCodeRunEnabled } from '../../services/codingRunService.js';

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({
    success: true,
    enabled: isCodeRunEnabled(),
  });
});

router.post('/run', async (req, res) => {
  try {
    const { code, stdin = '', language = 'java' } = req.body || {};
    if (language !== 'java') {
      return res.status(400).json({
        success: false,
        message: '当前仅支持 Java',
      });
    }
    const result = await runJavaCode({ code, stdin });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || '运行失败',
    });
  }
});

export default router;
