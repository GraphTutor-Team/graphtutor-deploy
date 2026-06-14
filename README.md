# GraphTutor V3.0 - 多角色与学科分类系统

## 🚀 快速开始

### 安装依赖
```bash
# 安装所有依赖（根目录、客户端、服务端）
npm run setup
```

### 启动项目
```bash
# 方式1: 分别启动（推荐）
# 终端1: 启动后端
npm run server

# 终端2: 启动前端
npm run client

# 方式2: 使用启动脚本（Windows）
start.bat  # 或 start.ps1

# 方式3: 使用启动脚本（Linux/Mac）
./start.sh
```

**访问地址**:
- 前端：http://localhost:5173  
- 后端：http://localhost:5000

## 📚 V3.0 新功能

### 核心功能
- ✅ **多角色系统**: 学生、出题负责人、管理员
- ✅ **学科分类**: 层级化学科分类管理
- ✅ **题库管理**: 增强的题库管理功能
- ✅ **题目管理**: 完整的题目CRUD和版本控制
- ✅ **AI集成**: OpenAI API深度集成
- ✅ **导出/导入**: 支持JSON和CSV格式
- ✅ **权限控制**: 细粒度的RBAC权限系统

### 访问新功能
- `/banks` - 题库管理
- `/questions` - 题目管理
- `/subjects` - 学科管理
- `/ai` - AI控制台（需要权限）
- `/manager/dashboard` - 工作台（需要权限）

## 📖 文档

**文档中心：[docs/README.md](docs/README.md)** · [完整索引](DOCUMENTATION_INDEX.md)

| 文档 | 说明 |
|------|------|
| [部署与运维](docs/部署运维-DEPLOYMENT.md) | Docker、`.env`、服务器更新、前端热更新 |
| [数据导入](docs/数据导入-DATA_IMPORT.md) | 演示题、二级 PDF、Java/LeetCode |
| [本地开发](docs/本地开发-DEVELOPMENT.md) | 环境、脚本、目录 |
| [系统架构](docs/系统架构-ARCHITECTURE.md) | 技术栈、模块、题型 |
| [API 说明](docs/API接口-API.md) | 路由一览、认证、Swagger |
| [故障排查](docs/故障排查-TROUBLESHOOTING.md) | CSRF、无题目、构建慢等 |
| [小程序对接](docs/小程序对接-MINIPROGRAM_INTEGRATION.md) | 微信端集成 |
| [页面与功能](docs/页面功能-PAGES_AND_FEATURES.md) | 全站功能说明 |

其它：[数据库设计](DATABASE_DESIGN.md) · [代码规范](代码规范.md) · [功能清单](功能清单.md)

## 🔧 开发命令

```bash
# 代码检查
npm run lint
npm run lint:fix

# 代码格式化
npm run format

# 测试
npm run test

# 优化
npm run optimize
```

## 📝 变更追踪
```bash
npm run snapshot
# ...修改代码...
npm run snapshot
npm run changes
```

## 🎯 项目状态

**当前版本**: v3.0.0  
**状态**: ✅ 所有核心功能已完成

## 📋 主要功能

### 学习管理
- ✅ 题库和题目管理
- ✅ 题目练习和错题本
- ✅ 学习笔记和计划
- ✅ 学习分析和统计

### 社交学习
- ✅ 好友管理系统
- ✅ 好友挑战系统
- ✅ 学习动态分享
- ✅ 学习社区讨论
- ✅ 排行榜系统

### 消息和通知
- ✅ 实时消息系统（WebSocket）
- ✅ 通知中心
- ✅ 消息搜索和撤回

### 数据管理
- ✅ 数据导出（PDF/Excel/Word）
- ✅ 数据备份和恢复
- ✅ 学习报告生成

**详细功能列表请查看**: [功能清单.md](功能清单.md)
