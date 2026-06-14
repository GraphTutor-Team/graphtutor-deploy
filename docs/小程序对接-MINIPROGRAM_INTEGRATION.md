# GraphTutor 微信小程序对接指南

本文档面向**小程序开发者**与**后端部署**，说明如何将 `miniprogram/` 与 GraphTutor 后端联调、上线。

---

## 1. 架构概览

```
┌─────────────────┐     wx.request + X-Client: miniprogram     ┌──────────────────┐
│  微信小程序      │ ────────────────────────────────────────────► │  GraphTutor API  │
│  miniprogram/   │     Authorization: Bearer <accessToken>        │  server/ :5000   │
└────────┬────────┘                                              └────────┬─────────┘
         │ wx.login()                                                          │
         │  code ─────────────────────────────────────────────────────────────┤
         │         POST /api/auth/mp/login                                     │
         │              └─► 微信 jscode2session ──► openid / unionid           │
         └─────────────────────────────────────────────────────────────────────┘
```

- **Web 端**：邮箱密码、GitHub OAuth（浏览器）
- **小程序端**：邮箱密码、**微信快捷登录**（`wx.login` → `/api/auth/mp/login`）
- 同一用户若绑定 **unionid**（小程序与开放平台同属一个微信开放平台账号），可在两端打通

---

## 2. 前置条件

| 项 | 说明 |
|----|------|
| 小程序 AppID | 当前项目：`wx2bd6cc462dccaecf`（见 `miniprogram/project.config.json`） |
| 小程序 AppSecret | 微信公众平台 → 开发 → 开发管理 → 开发设置 |
| 后端可访问 | 开发可用 IP+端口；**正式上线须 HTTPS 域名** |
| MongoDB | 与 Web 共用同一数据库，用户数据一致 |

> **注意**：`WECHAT_APP_ID/SECRET`（开放平台网站应用）与 `MINIPROGRAM_APP_ID/SECRET`（小程序）是**两套凭证**，不要混用。

---

## 3. 后端配置

### 3.1 环境变量

在服务器 `server/.env` 增加：

```env
MINIPROGRAM_APP_ID=wx2bd6cc462dccaecf
MINIPROGRAM_APP_SECRET=你的小程序AppSecret

# 已有项（示例）
JWT_SECRET=强随机字符串
JWT_REFRESH_SECRET=强随机字符串
MONGODB_URI=mongodb://...
CLIENT_URL=http://106.55.99.208:5000
FRONTEND_URL=http://106.55.99.208:5000
```

修改后重启：

```bash
cd /root/graphtutor-deploy
docker compose up -d --build --force-recreate server
```

部署后可用健康检查确认小程序登录是否已配置（不会返回 AppSecret）：

```bash
curl http://你的服务器:5000/api/health
# features.miniprogramLogin.configured 应为 true
# features.miniprogramLogin.appId 应为 wx2bd6cc462dccaecf
```

### 3.2 新增接口

**POST** `/api/auth/mp/login`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | `wx.login` 返回的临时 code |

**成功响应**（与邮箱登录一致）：

```json
{
  "success": true,
  "token": "<accessToken>",
  "accessToken": "<accessToken>",
  "refreshToken": "<refreshToken>",
  "user": {
    "id": "...",
    "email": "mp_xxx@oauth.local",
    "name": "微信用户xxxxxx",
    "role": "student"
  }
}
```

**常见错误**：

| HTTP | message | 处理 |
|------|---------|------|
| 503 | 小程序登录未配置 | 检查 `.env` 中 `MINIPROGRAM_*` |
| 200, success:false | invalid code / code been used | 重新 `wx.login`，code 一次性 |
| 200, success:false | 微信登录失败 | AppID/Secret 不匹配或 code 过期 |

用户模型新增字段：`wechatMpOpenId`（小程序 openid，与网站 `wechatOpenId` 分开存储）。

---

## 4. 小程序端配置

### 4.1 修改 `miniprogram/utils/config.js`

```javascript
const USE_VIRTUAL_LOGIN = false;           // 接后端必须为 false
const BASE_URL = 'https://你的API域名';     // 上线须 HTTPS
// 本地调试示例：'http://106.55.99.208:5000'
```

### 4.2 微信开发者工具

1. 导入目录：`miniprogram/`
2. AppID 选择与 `project.config.json` 一致
3. **本地调试 HTTP**：详情 → 本地设置 → 勾选「不校验合法域名、web-view、TLS 版本…」
4. **真机预览 / 上线**：必须在公众平台配置合法域名（见下节）

### 4.3 请求头约定

`miniprogram/utils/api.js` 已统一设置：

- `Content-Type: application/json`
- `X-Client: miniprogram`（后端 CSRF 豁免）
- `Authorization: Bearer <token>`（登录后）

---

## 5. 微信公众平台配置

登录 [微信公众平台](https://mp.weixin.qq.com/) → 开发 → 开发管理 → 开发设置：

### 5.1 服务器域名（request 合法域名）

上线前添加你的 API 域名，例如：

```
https://api.yourdomain.com
```

**不支持**裸 IP、`http://`（正式版小程序）。当前服务器 `http://106.55.99.208:5000` 仅适合开发者工具 + 关闭域名校验的调试。

### 5.2 推荐上线路径

1. 为 API 配置 **HTTPS 域名**（Nginx 反代 + Let’s Encrypt）
2. 域名加入 request 合法域名
3. 更新 `config.js` 的 `BASE_URL`
4. 提交小程序审核

### 5.3 业务域名 / downloadFile（若使用外链图）

若页面加载 Unsplash 等外链图，还需在「downloadFile 合法域名」添加对应 CDN 域名（见 `utils/image-library.js`）。

---

## 6. 登录流程说明

### 6.1 邮箱密码登录

1. 用户输入 Web 端注册的邮箱与密码  
2. `POST /api/auth/login`  
3. 保存 `accessToken`、`user` 到 `wx.setStorageSync` 与 `app.globalData`

### 6.2 微信快捷登录

1. 用户点击「微信快捷登录」  
2. `wx.login()` 获取 `code`  
3. `POST /api/auth/mp/login` 传 `{ code }`  
4. 后端调用微信 `jscode2session`，按 `wechatMpOpenId` / `wechatUnionId` 查找或创建用户  
5. 返回 JWT，小程序存 token 并跳转首页

### 6.3 账号关系

| 场景 | 行为 |
|------|------|
| 首次微信登录 | 自动创建用户，邮箱占位 `mp_{openid}@oauth.local`，**须完善账号** |
| 完善账号 · 绑定已有 | 填写 Web 端相同邮箱+密码 → 合并到原账号，临时微信用户删除 |
| 完善账号 · 新注册 | 设置邮箱+密码（及可选昵称/学校/年级）→ 同一 User 转正 |
| Web 邮箱用户 | 直接使用邮箱密码登录，无需完善 |

### 6.4 完善账号流程（微信快捷登录后）

```
wx.login → /api/auth/mp/login
    ↓ needsProfileCompletion: true
pages/account-complete/account-complete
    ├─ mode=link     → POST /api/auth/mp/complete-account  （绑定 Web 账号）
    └─ mode=register → POST /api/auth/mp/complete-account  （设置新邮箱密码）
    ↓ needsProfileCompletion: false
正常使用（与 Web 数据同步）
```

**POST** `/api/auth/mp/complete-account`（须登录，`Authorization: Bearer`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mode` | string | 是 | `link` 绑定已有 / `register` 完善新账号 |
| `email` | string | 是 | 真实邮箱 |
| `password` | string | 是 | 至少 6 位 |
| `confirmPassword` | string | register 建议 | 确认密码 |
| `name` / `school` / `grade` | string | 否 | 仅 register 模式可选 |

响应含新 `accessToken` / `user`（`needsProfileCompletion: false`）。

小程序在首页、我的等 tab 页 `onShow` 会检测 `needsProfileCompletion`，未完善则自动跳转完善页。

---

## 7. 已对接 API 清单

| 接口 | 方法 | 小程序函数 | 状态 |
|------|------|------------|------|
| `/api/health` | GET | `api.health()` | ✅ |
| `/api/auth/login` | POST | `api.login()` | ✅ |
| `/api/auth/mp/login` | POST | `api.loginWithMiniProgram()` | ✅ |
| `/api/auth/mp/complete-account` | POST | `api.completeAccount()` | ✅ |
| `/api/auth/me` | GET | `api.getMe()` | ✅ |
| `/api/auth/sms/send` | POST | `api.sendSmsCode()` | 后端有，小程序登录页已移除短信入口 |
| `/api/auth/sms/login` | POST | `api.loginWithSms()` | 同上 |

### 待接入（页面多为本地 mock）

练习、计划、错题、图谱、商城、好友等需按 `docs/页面功能-PAGES_AND_FEATURES.md` 逐步对接对应 REST 路由。对接时在 `utils/api.js` 增加封装，并带上 `Authorization` 头。

---

## 8. 目录与文件索引

```
miniprogram/
├── app.js / app.json          # 入口、tabBar
├── project.config.json        # AppID
├── utils/
│   ├── config.js              # ★ BASE_URL、USE_VIRTUAL_LOGIN
│   └── api.js                 # ★ 请求封装
└── pages/
    ├── login/                 # 邮箱 + 微信快捷登录
    ├── index/                 # 首页
    └── user/                  # 我的（getMe）

server/
├── src/routes/auth.js         # /mp/login
├── src/models/User.js         # wechatMpOpenId
├── src/services/miniProgramAuthService.js
└── env.example                # MINIPROGRAM_* 说明
```

更细的页面说明见 [`miniprogram/MINIPROGRAM_DOC.md`](../miniprogram/MINIPROGRAM_DOC.md)。

---

## 9. 联调检查清单

- [ ] 服务器 `.env` 已配置 `MINIPROGRAM_APP_ID/SECRET` 并重启 Docker  
- [ ] `config.js`：`USE_VIRTUAL_LOGIN = false`，`BASE_URL` 正确  
- [ ] 开发者工具可访问：`GET {BASE_URL}/api/health`  
- [ ] 邮箱登录：Web 已注册账号能在小程序登录  
- [ ] 微信快捷登录：点击后无 503，首页显示用户信息  
- [ ] 我的页：`/api/auth/me` 返回完整资料  
- [ ] 准备上线：HTTPS 域名 + 公众平台合法域名  

---

## 10. 常见问题

**Q: 提示「小程序登录未配置」**  
A: 服务器未设置 `MINIPROGRAM_APP_SECRET`，或容器未 `--force-recreate` 加载新 `.env`。

**Q: request:fail url not in domain list**  
A: 正式版须 HTTPS 合法域名；开发期可临时关闭域名校验。

**Q: code been used / invalid code**  
A: `wx.login` 的 code 只能用一次，且约 5 分钟有效；勿重复提交同一 code。

**Q: 小程序与 Web 不是同一个用户**  
A: 邮箱密码登录会使用同一账号；纯微信登录会创建独立账号，除非 unionid 已打通。

**Q: GitHub 登录能在小程序用吗**  
A: 不能。小程序登录页已移除 GitHub 入口，请在 Web 端使用 GitHub 登录。

---

## 11. 部署命令速查

```bash
# 服务器更新
cd /root/graphtutor-deploy
git pull origin main
docker compose up -d --build

# 本地语法检查
node --check server/src/routes/auth.js
node --check server/src/services/miniProgramAuthService.js
```

---

*文档版本：与 `POST /api/auth/mp/login` 实现同步。有接口变更时请一并更新本文与 `MINIPROGRAM_DOC.md`。*
