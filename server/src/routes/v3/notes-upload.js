/**
 * GraphTutor V3.0 - 笔记文件上传API
 * 
 * 路径：/api/v3/notes/upload
 * 功能：处理笔记的图片和附件上传
 */

import express from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.js';
import path from 'path';
import { ensureUploadDir, getUploadUrl } from '../../utils/fileUpload.js';

const router = express.Router();

// 确保上传目录存在（异步初始化）
let uploadsDir = null;
ensureUploadDir('notes').then(dir => {
  uploadsDir = dir;
  console.log('笔记上传目录已初始化:', dir);
}).catch(err => {
  console.error('初始化上传目录失败:', err);
});

// 配置multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    if (!uploadsDir) {
      uploadsDir = await ensureUploadDir('notes');
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `note-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的MIME类型
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

/**
 * POST /api/v3/notes/upload/image
 * 上传图片
 */
router.post('/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择图片文件',
      });
    }

    // 返回文件URL（相对路径）
    const fileUrl = getUploadUrl(req.file.filename, 'notes');

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/notes/upload/image error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '上传图片失败',
    });
  }
});

/**
 * POST /api/v3/notes/upload/attachment
 * 上传附件
 */
router.post('/attachment', requireAuth, upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择附件文件',
      });
    }

    const fileUrl = getUploadUrl(req.file.filename, 'notes');

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/notes/upload/attachment error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '上传附件失败',
    });
  }
});

export default router;

