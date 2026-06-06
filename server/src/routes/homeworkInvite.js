/**
 * 实验三 · 邀请函小程序专用接口（挂载于 GraphTutor 主后端 :5000）
 * 与 invite-homework-server 功能等价，便于小程序直连网站后端。
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const dataFile = path.join(__dirname, '../../data/homework-invite-registrations.json');

function readList() {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
  } catch (_) {
    /* ignore */
  }
  return [];
}

function writeList(list) {
  const dir = path.dirname(dataFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataFile, JSON.stringify(list, null, 2), 'utf8');
}

router.get('/register', (req, res) => {
  const list = readList();
  res.json({ ok: true, count: list.length, data: list });
});

router.post('/register', (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.studentId || !body.phone) {
    return res.status(400).json({ ok: false, message: '缺少必填字段' });
  }
  if (!/^1\d{10}$/.test(String(body.phone))) {
    return res.status(400).json({ ok: false, message: '手机号格式不正确' });
  }

  const record = {
    name: body.name,
    studentId: body.studentId,
    phone: body.phone,
    teamRole: body.teamRole || '选手',
    skills: body.skills || [],
    note: body.note || '',
    createdAt: new Date().toISOString()
  };

  const list = readList();
  list.push(record);
  writeList(list);
  res.json({ ok: true, message: '报名成功', data: record });
});

export default router;
