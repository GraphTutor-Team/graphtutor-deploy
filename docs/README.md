# GraphTutor 文档中心

> 版本 3.0 · 最后更新：2026-06

本目录为 **当前有效** 的项目文档。文件名采用 **「中文名-英文名」** 格式，便于在资源管理器中识别。根目录下部分旧 `.md` 已废弃，见 [废弃文档-LEGACY.md](./废弃文档-LEGACY.md)。

---

## 按角色阅读

| 角色 | 推荐阅读顺序 |
|------|----------------|
| **运维 / 部署** | [部署运维-DEPLOYMENT.md](./部署运维-DEPLOYMENT.md) → [数据导入-DATA_IMPORT.md](./数据导入-DATA_IMPORT.md) → [故障排查-TROUBLESHOOTING.md](./故障排查-TROUBLESHOOTING.md) |
| **后端 / 全栈** | [本地开发-DEVELOPMENT.md](./本地开发-DEVELOPMENT.md) → [系统架构-ARCHITECTURE.md](./系统架构-ARCHITECTURE.md) → [API接口-API.md](./API接口-API.md) |
| **前端** | [本地开发-DEVELOPMENT.md](./本地开发-DEVELOPMENT.md) → [页面功能-PAGES_AND_FEATURES.md](./页面功能-PAGES_AND_FEATURES.md) → [API接口-API.md](./API接口-API.md) |
| **小程序** | [小程序对接-MINIPROGRAM_INTEGRATION.md](./小程序对接-MINIPROGRAM_INTEGRATION.md) → [miniprogram/MINIPROGRAM_DOC.md](../miniprogram/MINIPROGRAM_DOC.md) |
| **产品 / 测试** | [页面功能-PAGES_AND_FEATURES.md](./页面功能-PAGES_AND_FEATURES.md) → [../功能清单.md](../功能清单.md) |

---

## 文档列表

| 文档 | 说明 |
|------|------|
| [部署运维-DEPLOYMENT.md](./部署运维-DEPLOYMENT.md) | Docker 部署、服务器更新、`.env`、前端热更新 |
| [数据导入-DATA_IMPORT.md](./数据导入-DATA_IMPORT.md) | 演示数据、二级 PDF、Java/LeetCode 编程题导入 |
| [本地开发-DEVELOPMENT.md](./本地开发-DEVELOPMENT.md) | 本地开发环境、脚本、目录结构 |
| [系统架构-ARCHITECTURE.md](./系统架构-ARCHITECTURE.md) | 技术栈、系统架构、数据模型概览 |
| [API接口-API.md](./API接口-API.md) | REST 路由一览、认证、Swagger |
| [故障排查-TROUBLESHOOTING.md](./故障排查-TROUBLESHOOTING.md) | 403 CSRF、无题目、构建卡住等 |
| [小程序对接-MINIPROGRAM_INTEGRATION.md](./小程序对接-MINIPROGRAM_INTEGRATION.md) | 微信小程序对接 |
| [页面功能-PAGES_AND_FEATURES.md](./页面功能-PAGES_AND_FEATURES.md) | 全站页面与功能说明 |
| [状态数据-STATE_AND_DATA.md](./状态数据-STATE_AND_DATA.md) | 前端状态与数据流 |
| [性能扩展-PERF_AND_SCALE.md](./性能扩展-PERF_AND_SCALE.md) | 性能与扩展（规划） |
| [实施计划-IMPLEMENTATION_PLAN.md](./实施计划-IMPLEMENTATION_PLAN.md) | 产品愿景实施步骤 |
| [AI上下文-ai-context-schema.md](./AI上下文-ai-context-schema.md) | AI 学习伴侣上下文字段 |
| [服务器更新-SERVER_UPDATE_AND_ENV.md](./服务器更新-SERVER_UPDATE_AND_ENV.md) | 已迁移提示（见部署运维） |
| [废弃文档-LEGACY.md](./废弃文档-LEGACY.md) | 已废弃文档索引 |

---

## 环境变量

完整示例：[server/env.example](../server/env.example)

---

## 在线 API 文档

开发环境启用 Swagger 后访问：`http://localhost:5000/api-docs`

生产环境建议 `ENABLE_SWAGGER=false`。
