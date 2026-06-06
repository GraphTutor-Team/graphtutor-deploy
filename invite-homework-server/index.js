var express = require('express');
var fs = require('fs');
var path = require('path');

var app = express();
var htdocsDir = path.join(__dirname, 'htdocs');
var dataFile = path.join(__dirname, 'registrations.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(htdocsDir));

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/api/health', function (req, res) {
  res.json({ ok: true, message: 'invite-homework-server running' });
});

app.get('/api/register', function (req, res) {
  var list = [];
  try {
    if (fs.existsSync(dataFile)) {
      list = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
  } catch (e) {
    list = [];
  }
  res.json({ ok: true, count: list.length, data: list });
});

app.post('/api/register', function (req, res) {
  var body = req.body || {};
  if (!body.name || !body.studentId || !body.phone) {
    return res.status(400).json({ ok: false, message: '缺少必填字段' });
  }

  if (!/^1\d{10}$/.test(String(body.phone))) {
    return res.status(400).json({ ok: false, message: '手机号格式不正确' });
  }

  var record = {
    name: body.name,
    studentId: body.studentId,
    phone: body.phone,
    teamRole: body.teamRole || '选手',
    skills: body.skills || [],
    note: body.note || '',
    createdAt: new Date().toISOString()
  };

  var list = [];
  try {
    if (fs.existsSync(dataFile)) {
      list = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
  } catch (e) {
    list = [];
  }

  list.push(record);
  fs.writeFileSync(dataFile, JSON.stringify(list, null, 2), 'utf8');
  res.json({ ok: true, message: '报名成功', data: record });
});

var PORT = process.env.PORT || 3000;
var HOST = '0.0.0.0';

app.listen(PORT, HOST, function () {
  console.log('服务器启动成功');
  console.log('监听地址：http://' + HOST + ':' + PORT);
  console.log('视频访问：http://127.0.0.1:' + PORT + '/1.mp4');
  console.log('健康检查：GET http://127.0.0.1:' + PORT + '/api/health');
  console.log('报名接口：POST http://127.0.0.1:' + PORT + '/api/register');
  console.log('报名列表：GET  http://127.0.0.1:' + PORT + '/api/register');
});
