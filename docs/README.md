# GraphTutor 文档中心

> 版本 3.0 · 最后更新：2026-06

本目录为 **当前有效** 的项目文档。根目录下部分旧 `.md` 已废弃，见 [LEGACY.md](./LEGACY.md)。

---

## 按角色阅读

| 角色 | 推荐阅读顺序 |
|------|----------------|
| **运维 / 部署** | [DEPLOYMENT.md](./DEPLOYMENT.md) → [DATA_IMPORT.md](./DATA_IMPORT.md) → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| **后端 / 全栈** | [DEVELOPMENT.md](./DEVELOPMENT.md) → [ARCHITECTURE.md](./ARCHITECTURE.md) → [API.md](./API.md) |
| **前端** | [DEVELOPMENT.md](./DEVELOPMENT.md) → [PAGES_AND_FEATURES.md](./PAGES_AND_FEATURES.md) → [API.md](./API.md) |
| **小程序** | [MINIPROGRAM_INTEGRATION.md](./MINIPROGRAM_INTEGRATION.md) → [miniprogram/MINIPROGRAM_DOC.md](../miniprogram/MINIPROGRAM_DOC.md) |
| **产品 / 测试** | [PAGES_AND_FEATURES.md](./PAGES_AND_FEATURES.md) → [../功能清单.md](../功能清单.md) |

---

## 文档列表

| 文档 | 说明 |
|------|------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker 部署、服务器更新、`.env`、前端热更新 |
| [DATA_IMPORT.md](./DATA_IMPORT.md) | 演示数据、二级 PDF、Java/LeetCode 编程题导入 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 本地开发环境、脚本、目录结构 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 技术栈、系统架构、数据模型概览 |
| [API.md](./API.md) | REST 路由一览、认证、Swagger |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 403 CSRF、无题目、构建卡住等 |
| [MINIPROGRAM_INTEGRATION.md](./MINIPROGRAM_INTEGRATION.md) | 微信小程序对接 |
| [PAGES_AND_FEATURES.md](./PAGES_AND_FEATURES.md) | 全站页面与功能说明 |
| [STATE_AND_DATA.md](./STATE_AND_DATA.md) | 前端状态与数据流 |
| [PERF_AND_SCALE.md](./PERF_AND_SCALE.md) | 性能与扩展（规划） |
| [LEGACY.md](./LEGACY.md) | 已废弃文档索引 |

---

## 环境变量

完整示例：[server/env.example](../server/env.example)

---

## 在线 API 文档

开发环境启用 Swagger 后访问：`http://localhost:5000/api-docs`

生产环境建议 `ENABLE_SWAGGER=false`。
