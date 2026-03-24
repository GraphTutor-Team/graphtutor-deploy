# 🚀 GraphTutor 快速启动指南

## 前置要求

- Node.js >= 16.0.0
- MongoDB (本地或远程)
- npm 或 yarn

## 快速开始（3步）

### 1. 安装依赖
```bash
npm run setup
```

### 2. 配置环境变量
在 `server` 目录下创建 `.env` 文件：
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/graphtutor
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=your-openai-key-here  # 可选，用于AI功能
```

### 3. 启动项目
```bash
# 终端1: 启动后端
npm run server

# 终端2: 启动前端
npm run client
```

## 访问应用

- **前端**: http://localhost:5173
- **后端API**: http://localhost:5000

## 首次使用

1. 访问前端页面
2. 注册新用户或使用默认管理员账户
3. 开始使用！

## 常见问题

### 端口被占用
如果端口被占用，可以修改：
- 前端端口：编辑 `client/vite.config.js`
- 后端端口：修改 `server/.env` 中的 `PORT`

### MongoDB连接失败
确保：
1. MongoDB服务正在运行
2. `.env` 中的 `MONGODB_URI` 配置正确
3. 数据库权限设置正确

### 依赖安装失败
```bash
# 清除缓存后重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 更多帮助

查看 [README.md](README.md) 获取完整文档。

