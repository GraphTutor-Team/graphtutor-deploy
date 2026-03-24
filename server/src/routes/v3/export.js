/**
 * GraphTutor V3.0 - 导出API路由
 * 
 * 路径：/api/v3/export
 * 功能：提供Word格式导出功能
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { exportLearningReportToWord, exportNoteToWord } from '../../utils/wordExport.js';

const router = express.Router();

/**
 * POST /api/v3/export/learning-report/word
 * 导出学习报告为Word
 */
router.post('/learning-report/word', requireAuth, async (req, res) => {
  try {
    const { data } = req.body;

    const buffer = await exportLearningReportToWord(data);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="学习报告_${new Date().toISOString().split('T')[0]}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('POST /api/v3/export/learning-report/word error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '导出Word失败',
    });
  }
});

/**
 * POST /api/v3/export/note/word
 * 导出笔记为Word
 */
router.post('/note/word', requireAuth, async (req, res) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: '笔记数据不能为空',
      });
    }

    const buffer = await exportNoteToWord(note);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="笔记_${note.title || '未命名'}_${new Date().toISOString().split('T')[0]}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('POST /api/v3/export/note/word error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '导出Word失败',
    });
  }
});

export default router;

