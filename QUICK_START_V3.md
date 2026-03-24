# GraphTutor V3.0 快速启动指南

## 🚀 快速开始

### 前置要求

- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm 或 yarn

---

## 📦 安装步骤

### 1. 安装依赖

```bash
# 在项目根目录
npm run setup
```

这会自动安装客户端和服务端的依赖。

### 2. 配置环境变量

创建 `.env` 文件（如果还没有）：

```bash
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/graphtutor

# JWT密钥
JWT_SECRET=your-secret-key-here

# API配置
PORT=5000
VITE_API_BASE=http://localhost:5000/api

# OpenAI配置（可选，用于AI功能）
OPENAI_API_KEY=your-openai-api-key
```

### 3. 启动MongoDB

确保MongoDB服务正在运行：

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# 或
mongod
```

### 4. 启动项目

#### 方式一：分别启动（推荐开发）

```bash
# 终端1：启动后端
npm run server

# 终端2：启动前端
npm run client
```

#### 方式二：使用concurrently（需要安装）

```bash
npm install -g concurrently
npm run dev  # 如果配置了此脚本
```

---

## 🎯 访问应用

- **前端**：http://localhost:3000
- **后端API**：http://localhost:5000/api
- **健康检查**：http://localhost:5000/api/health

---

## ✨ V3.0 新功能快速体验

### 1. 每日打卡
- 访问：http://localhost:3000/check-in
- 功能：记录每日学习情况

### 2. 学习路径
- 访问：http://localhost:3000/learning-path
- 功能：查看推荐的学习路径

### 3. 学习社区
- 访问：http://localhost:3000/community
- 功能：参与讨论、提问、回答

### 4. 排行榜
- 访问：http://localhost:3000/leaderboard
- 功能：查看学习排行榜

### 5. 学习成就
- 访问：http://localhost:3000/achievements
- 功能：查看已获得的成就

### 6. 学习笔记（增强）
- 访问：http://localhost:3000/notes
- 新功能：上传图片、附件、使用模板

### 7. 错题本（增强）
- 访问：http://localhost:3000/review
- 新功能：复习计划、相似题推荐

---

## 🔧 常见问题

### 问题1：端口被占用

**解决方案**：
```bash
# 修改端口（在.env文件中）
PORT=5001  # 后端端口
VITE_PORT=3001  # 前端端口
```

### 问题2：MongoDB连接失败

**解决方案**：
1. 检查MongoDB是否运行
2. 检查MONGODB_URI配置
3. 检查防火墙设置

### 问题3：依赖安装失败

**解决方案**：
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 客户端
cd client
rm -rf node_modules package-lock.json
npm install

# 服务端
cd server
rm -rf node_modules package-lock.json
npm install
```

### 问题4：文件上传失败

**解决方案**：
1. 确保 `server/uploads/notes` 目录存在
2. 检查文件权限
3. 检查文件大小限制（默认10MB）

---

## 📝 开发建议

### 代码结构

```
GraphTutor/
├── client/          # 前端React应用
│   ├── src/
│   │   ├── pages/   # 页面组件
│   │   ├── components/  # 可复用组件
│   │   ├── api/     # API客户端
│   │   └── utils/   # 工具函数
│   └── public/      # 静态资源
├── server/          # 后端Node.js应用
│   ├── src/
│   │   ├── routes/  # API路由
│   │   ├── models/  # 数据模型
│   │   ├── services/ # 业务逻辑
│   │   └── middleware/ # 中间件
│   └── uploads/     # 上传文件存储
└── docs/            # 文档
```

### 开发工具推荐

- **VS Code扩展**：
  - ESLint
  - Prettier
  - MongoDB for VS Code
  - REST Client

- **浏览器工具**：
  - React DevTools
  - Redux DevTools（如果使用）

---

## 🧪 测试

### 运行测试（如果配置了）

```bash
npm test
```

### 手动测试清单

- [ ] 用户注册/登录
- [ ] 创建学习计划
- [ ] 每日打卡
- [ ] 发布讨论
- [ ] 上传笔记图片
- [ ] 查看排行榜
- [ ] 导出PDF报告
- [ ] 移动端访问

---

## 📚 更多文档

- `FEATURES_V3.0.md` - 功能详细说明
- `README_V3_FEATURES.md` - 用户使用指南
- `更新日志V3.0.md` - 更新日志
- `README.md` - 项目主文档

---

## 🆘 获取帮助

如果遇到问题：

1. 查看控制台错误信息
2. 检查网络请求（浏览器开发者工具）
3. 查看服务器日志
4. 参考文档

---

**祝开发愉快！** 🎉

