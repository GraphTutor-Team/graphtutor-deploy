# API 说明

---

## 1. 基础信息

| 项 | 值 |
|----|-----|
| 生产 Base | `http://106.55.99.208:5000` |
| 本地 Base | `http://localhost:5000` |
| 认证 | JWT Bearer + Cookie（CSRF 双提交） |
| 格式 | JSON，UTF-8 |

### 统一响应（V3 常见）

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "错误说明" }
```

### Swagger

开发环境：`GET /api-docs`（需 `ENABLE_SWAGGER=true`）

---

## 2. 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 邮箱密码登录 |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/auth/password/forgot` | 忘记密码 |
| POST | `/api/auth/password/reset` | 重置密码 |
| PUT | `/api/auth/me/password` | 修改/设置密码 |
| POST | `/api/auth/account/link-existing` | OAuth 绑定已有账号 |
| GET | `/api/auth/oauth/github/url` | GitHub OAuth |
| POST | `/api/auth/mp/login` | 小程序登录 |

请求需带 CSRF：先 `GET` 任意 API 拿 Cookie，再带 `X-CSRF-Token` 头发 POST。

---

## 3. 题目与练习

###  legacy `/api/questions`（练习页 Quiz 使用）

| 方法 | 路径 | 查询参数 |
|------|------|----------|
| GET | `/api/questions` | `limit`, `skip`, `random=true`, `subjectCode`, `bankId`, `difficulty`, `node`, `q` |
| GET | `/api/questions/:id` | |
| GET | `/api/questions/next` | 随机一题 |

示例：

```http
GET /api/questions?subjectCode=CS-JAVA&limit=50&random=true
```

### V3 `/api/v3/questions`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v3/questions` | 列表、筛选 |
| POST | `/api/v3/questions` | 创建（需权限） |
| GET | `/api/v3/questions/:id` | 详情 |
| PUT | `/api/v3/questions/:id` | 更新 |
| DELETE | `/api/v3/questions/:id` | 删除 |

---

## 4. 测验会话 `/api/quizzes`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/quizzes/session/start` | 创建会话（body: userId, size, subjectCode, bankId…） |
| GET | `/api/quizzes/session/:id` | 会话详情 |
| POST | `/api/quizzes/session/:id/answer` | 提交答案（支持 userAnswer 编程题） |
| POST | `/api/quizzes/session/:id/finish` | 结束并统计 |
| GET | `/api/quizzes` | 会话列表 |

---

## 5. 学科与题库 V3

| 前缀 | 说明 |
|------|------|
| `/api/v3/subjects` | 学科树 CRUD |
| `/api/v3/banks` | 题库管理、导入导出 |
| `/api/v3/recommendations` | 推荐题目（小程序首页） |

---

## 6. 编程题 `/api/v3/coding`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v3/coding/status` | 是否启用运行 |
| POST | `/api/v3/coding/run` | 运行 Java（需 `ENABLE_CODE_RUN=true`） |

---

## 7. 其他 V3 模块（节选）

| 前缀 | 功能 |
|------|------|
| `/api/v3/wrong-questions` | 错题本 |
| `/api/v3/favorites` | 收藏 |
| `/api/v3/notes` | 笔记 |
| `/api/v3/groups` | 学习小组 |
| `/api/v3/ai` | AI 出题 |
| `/api/v3/analytics` | 学习分析 |
| `/api/graph` | 知识图谱 |
| `/api/records` | 答题记录 |

完整端点列表（历史文档，部分路径可能已演进）：[API端点文档.md](../API端点文档.md)

---

## 8. 健康检查

```http
GET /api/health
```

返回 `ok: true` 及服务特性开关（如小程序登录是否配置）。

---

## 9. 小程序对接

见 [MINIPROGRAM_INTEGRATION.md](./MINIPROGRAM_INTEGRATION.md)。

常用：

- `POST /api/auth/mp/login`
- `GET /api/v3/recommendations/questions`
