# 系统架构

---

## 1. 概述

GraphTutor 是基于知识图谱的智能学习平台：**React 前端 + Express API + MongoDB**，支持练习、测验、错题、社交、AI 出题、小程序等。

### 特点

- 前后端分离（开发时分端口，生产由 Node 托管静态资源）
- REST API + 部分 WebSocket（Socket.IO）
- JWT 认证 + RBAC 角色
- V3 API 前缀 `/api/v3/*`

---

## 2. 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18、Vite、Tailwind、React Router、Axios、Recharts |
| 后端 | Node 20、Express 4、Mongoose 8 |
| 数据库 | MongoDB 7 |
| 缓存 | Redis 7（可选） |
| 部署 | Docker Compose |
| 小程序 | 微信原生框架 |

---

## 3. 逻辑架构

```text
浏览器 / 小程序
       │
       ▼
  Express (port 5000)
  ├── /api/auth          认证、OAuth
  ├── /api/questions     题目列表（练习页）
  ├── /api/quizzes       测验会话
  ├── /api/v3/*          V3 业务 API
  └── client/dist        静态前端
       │
       ├── MongoDB        用户、题目、记录…
       └── Redis          缓存、会话（可选）
```

---

## 4. 核心数据模型

| 模型 | 说明 |
|------|------|
| User | 用户、角色、积分 |
| Subject | 学科树（code 如 CS-JAVA、CERT-MS） |
| QuestionBank | 题库（key 如 ncre-ms-300） |
| Question | 题目（type: single/multiple/fill/short/judge/**coding**） |
| Record | 答题记录 |
| QuizSession | 测验会话 |
| KnowledgeNode | 知识点（图谱） |

详细字段见 [DATABASE_DESIGN.md](../DATABASE_DESIGN.md)。

### 题目题型

| type | 说明 |
|------|------|
| single / multiple / judge | 选择题 |
| fill | 填空题 |
| short | 简答题 |
| coding | 编程题（`codingMeta` 存参考代码、starter） |

---

## 5. 角色

| 角色 | 能力概要 |
|------|----------|
| student | 练习、测验、错题、收藏 |
| manager | 出题、题库管理 |
| admin | 系统管理 |

---

## 6. 部署架构（生产）

见 [部署运维-DEPLOYMENT.md](./部署运维-DEPLOYMENT.md)：

- 单节点 Docker：`server` + `mongodb` + `redis`
- 无 Nginx 时直接 `:5000`
- `server/.env` 配置密钥与 URL

---

## 7. 仓库与模块

| 目录 | 职责 |
|------|------|
| `client/src/pages/Quiz.jsx` | 练习模式 |
| `client/src/pages/QuizSession.jsx` | 测验会话 |
| `server/src/routes/questions.js` | 题目 CRUD / 列表 |
| `server/src/routes/quizzes.js` | 测验会话 API |
| `server/scripts/import-*.js` | 外部数据导入 |

功能页面全览：[页面功能-PAGES_AND_FEATURES.md](./页面功能-PAGES_AND_FEATURES.md)。
