# 本地开发指南

---

## 1. 环境要求

- Node.js ≥ 18（推荐 20）
- MongoDB ≥ 4.4（本地或 Docker）
- npm ≥ 8

---

## 2. 快速启动

```bash
git clone https://github.com/ErMoDer/graphtutor-deploy.git
cd graphtutor-deploy

npm run setup          # 安装根目录 + client + server 依赖

cp server/env.example server/.env
# 编辑 server/.env：JWT_SECRET、MONGODB_URI 等

# 终端 1
npm run server         # http://localhost:5000

# 终端 2
npm run client         # http://localhost:5173
```

或使用 Docker 一键：`docker compose up -d --build` → 访问 http://localhost:5000

---

## 3. 常用 npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run setup` | 安装全部依赖 |
| `npm run server` | 后端 dev（nodemon） |
| `npm run client` | 前端 dev（Vite） |
| `npm run build` | 构建前端 |
| `npm run test` | 运行测试 |
| `npm run seed:demo` | 导入演示题 |
| `npm run seed:import-external` | 导入 MS/WPS PDF |
| `npm run seed:import-coding` | 导入 Java/LeetCode |
| `npm run seed:subjects` | 完整学科树 |

---

## 4. 目录结构

```text
GraphTutor/
├── client/           # React + Vite 前端
│   └── src/
│       ├── pages/    # 页面
│       ├── api/      # API 客户端
│       └── components/
├── server/           # Express 后端
│   ├── src/
│   │   ├── routes/   # 路由（含 v3/）
│   │   ├── models/   # Mongoose 模型
│   │   └── middleware/
│   ├── scripts/      # seed、导入脚本
│   └── data/         # 静态数据、import/
├── miniprogram/      # 微信小程序
├── docs/             # 项目文档（主入口）
└── docker-compose.yml
```

---

## 5. 环境变量

见 [server/env.example](../server/env.example)。本地开发典型配置：

```env
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/graphtutor
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-change-me
ENABLE_SWAGGER=true
```

---

## 6. 代码规范

- 后端：ES Module、`async/await`、JSDoc
- 前端：函数组件 + Hooks、Tailwind CSS
- 详见 [代码规范.md](../代码规范.md)、[开发流程.md](../开发流程.md)

---

## 7. API 调试

- Swagger：http://localhost:5000/api-docs
- 健康检查：http://localhost:5000/api/health

路由说明见 [API接口-API.md](./API接口-API.md)。

---

## 8. 相关文档

- [系统架构-ARCHITECTURE.md](./系统架构-ARCHITECTURE.md)
- [DATABASE_DESIGN.md](../DATABASE_DESIGN.md)
- [页面功能-PAGES_AND_FEATURES.md](./页面功能-PAGES_AND_FEATURES.md)
