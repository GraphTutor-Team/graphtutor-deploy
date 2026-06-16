# 移动 UI 应用开发 — 大作业报告（成员 B · 详细技术版）

> **成员 B 负责：账号与社交模块**（登录 / 注册 / 完善账号 / 我的 / 好友 / 消息 / 笔记 / 社区 / 通知 / 全局 UI）  
> **搭档：成员 A** 负责学习中心（练习、错题、计划等）。两人共用 GraphTutor 小程序项目 `miniprogram/`。  
> **若不懂 WXML / JS / 登录流程等基础语法**，请先阅读同目录 **`成员B-零基础代码精读教程.md`**（分 13 步逐模块讲解）。

---

## 封面

| 项目 | 内容 |
|------|------|
| **课程** | 移动 UI 应用开发 |
| **题目** | GraphTutor 智能学习助手小程序 |
| **学号** | （待填写） |
| **姓名** | （成员 B 待填） |
| **项目成员** | 成员 A（姓名待填）、成员 B（本人） |
| **本人分工** | 账号与社交全流程 + 全局 UI 规范 |
| **答辩日期** | 2026 年　　月　　日 |

---

# 第一部分  技术体系说明

## 1.1 用到的技术一览

**表1 技术栈总表（成员 B 侧重）**

| 层次 | 技术 | 在本项目中的作用 |
|------|------|------------------|
| 运行平台 | 微信小程序 | 移动端载体，微信内免安装使用 |
| 视图层 | **WXML** | 登录表单、菜单列表、聊天气泡结构 |
| 样式层 | **WXSS** | 全局主题、auth-form、feature-page 样式 |
| 逻辑层 | **JavaScript (ES6+)** | 登录校验、Token 管理、社交 API 调用 |
| 配置 | **JSON** | `app.json` 注册页面、TabBar「我的」 |
| 网络 | **wx.request** | 经 `api.js` / `api-ext.js` 访问 REST API |
| 本地存储 | **wx.setStorageSync** | 持久化 token、userInfo、refreshToken |
| 微信登录 | **wx.login** | 获取临时 code，交给后端换 openid |
| 导航 | **navigateTo / switchTab / redirectTo** | 登录页、二级页、Tab 跳转 |
| 鉴权 | **JWT Bearer Token** | 所有 v3 社交接口 Header 携带 |
| 后端 | Node.js + Express + MongoDB | 用户、好友、消息、笔记（已有） |
| 协作 | Git | 与成员 A 分工提交、联调 |

> **【截图位置：图1】** 微信开发者工具整体界面（模拟器显示登录页或我的页）。

## 1.2 微信小程序核心概念（B 模块对应）

| 概念 | 说明 | 本项目示例 |
|------|------|------------|
| **Page 页面** | js/json/wxml/wxss 四文件 | `pages/login/login.*` |
| **data + setData** | 数据驱动视图 | 登录页 `email`、`password`、`error` |
| **bindinput** | 输入框实时同步 | 邮箱、密码、聊天 draft |
| **bindtap / catchtap** | 点击事件；catch 阻止冒泡 | 登录按钮；密码显示切换 |
| **wx:if 条件渲染** | 未登录/加载/内容三态 | friends、notes 等社交页 |
| **wx:for 列表** | 菜单、好友、消息列表 | user 页菜单、messages 会话 |
| **URL 参数** | onLoad(options) 接收 | chat?userId=xxx&name=张三 |
| **TabBar** | 底部固定 Tab | 「我的」页 `pages/user/user` |
| **模块化** | require 公共工具 | `auth-helper.js`、`feature-page.js` |

## 1.3 项目目录结构（成员 B 相关）

```
miniprogram/
├── app.js                    # globalData: token / userInfo
├── app.json                  # 页面注册 + TabBar（B 负责「我的」Tab）
├── app.wxss                  # ★ 全局 CSS 变量、.card、.container
├── styles/
│   ├── buttons.wxss          # ★ 全局按钮 btn--primary 等
│   ├── auth-form.wxss        # ★ 登录/注册/完善账号表单样式
│   ├── feature-page.wxss     # ★ 好友/笔记/社区二级页通用样式
│   └── page-data.wxss        # 列表 item-card、空状态 state-box
├── utils/
│   ├── config.js             # ★ BASE_URL、USE_VIRTUAL_LOGIN
│   ├── api.js                # ★ login/register/completeAccount/getMe
│   ├── api-ext.js            # ★ 好友/消息/笔记/社区 API（B 维护社交部分）
│   ├── auth-helper.js        # ★ 登录态、完善账号拦截（B 核心）
│   ├── feature-page.js       # ★ 社交页 requireLogin 模板（B 编写）
│   ├── home-api.js           # formatTimeAgo 等展示辅助
│   └── quiz-helper.js        # stripHtml（消息/笔记预览用）
└── pages/
    ├── login/                # ★ 邮箱 + 微信登录
    ├── register/             # ★ 注册
    ├── account-complete/     # ★ 微信用户完善/绑定账号
    ├── user/                 # ★ 我的 Tab（功能菜单中枢）
    ├── friends/              # ★ 好友列表 + 请求处理
    ├── messages/             # ★ 会话列表
    │   └── chat/             # ★ 一对一聊天
    ├── notes/                # ★ 笔记列表
    │   ├── detail/           # 笔记详情
    │   └── edit/             # 新建/编辑
    ├── community/            # ★ 讨论 + 动态
    │   └── detail/           # 讨论详情 + 回复
    └── notifications/        # ★ 通知中心
```

---

# 第二部分  开发环境与联调教程

## 2.1 环境准备（Step by Step）

### 步骤 1：安装并登录微信开发者工具

1. 下载 [微信开发者工具 Stable 版](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)  
2. 微信扫码登录  

> **【截图位置：图2】** 开发者工具登录成功界面。

### 步骤 2：导入 miniprogram 目录

1. **导入项目** → 目录选 `GraphTutor/miniprogram`  
2. AppID 使用 `project.config.json` 中配置（或测试号）  

### 步骤 3：配置后端地址（成员 B 首要责任）

编辑 `miniprogram/utils/config.js`：

```javascript
const USE_VIRTUAL_LOGIN = false;   // 联调真实后端必须为 false
const BASE_URL = 'http://106.55.99.208:5000';
```

| 配置项 | 含义 |
|--------|------|
| `USE_VIRTUAL_LOGIN = true` | 本地假登录，不发网络请求（演示用） |
| `USE_VIRTUAL_LOGIN = false` | 连接 GraphTutor 服务器 |
| `BASE_URL` | 所有 API 前缀，成员 A/B 共用 |

### 步骤 4：关闭域名校验（开发期必做）

1. 右上角 **详情** → **本地设置**  
2. 勾选 **不校验合法域名、web-view、TLS 版本…**  

否则请求 `http://IP:5000` 报 `url not in domain list`。

> **【截图位置：图3】** 「不校验合法域名」勾选位置。

### 步骤 5：验证登录链路（B 模块联调入口）

1. 编译器打开 `pages/login/login`  
2. 用已有 Web 账号登录（如课程演示邮箱）  
3. 调试器 → **Storage** 确认存在 `token`、`userInfo`  
4. 切换 **我的** Tab，应显示头像与菜单  
5. 通知成员 A：Token 已就绪，可调试练习/错题 Tab  

> **【截图位置：图4】** Storage 中 token、userInfo 字段。

## 2.2 鉴权与 Token 教程（成员 B 核心）

### 2.2.1 登录成功后数据存哪

```
api.login / loginWithMiniProgram
    ↓
authHelper.persistSession(token, user, refreshToken)
    ↓
├── wx.setStorageSync('token', accessToken)      ← 持久化
├── wx.setStorageSync('refreshToken', ...)       ← 刷新用
├── wx.setStorageSync('userInfo', user)          ← 用户资料
└── getApp().globalData.userInfo = user          ← 内存缓存
```

**答辩要点：** 小程序重启后靠 Storage 恢复登录态；`globalData` 仅当前运行期有效。

### 2.2.2 request 自动带 Token

`utils/api.js` 中每次请求：

```javascript
header: {
  'Content-Type': 'application/json',
  Authorization: token ? `Bearer ${token}` : '',
  'X-Client': 'miniprogram',
}
```

- **401** → 清 session，提示重新登录  
- 业务请求前常调用 `api.ensureValidAccessToken()` 刷新即将过期的 Token  

### 2.2.3 api-ext.js 的 withAuth 包装

社交接口统一：

```javascript
function withAuth(fn) {
  return api.ensureValidAccessToken().then(fn);
}

function getFriends(params) {
  return withAuth(() => api.request('/api/v3/friends', { method: 'GET', data: ... }));
}
```

**教程要点：** B 模块新增社交 API 时，应走 `withAuth`，不要裸调 `wx.request`。

> **【截图位置：图5】** `auth-helper.js` 中 persistSession / ensureProfileComplete 代码。  
> **【截图位置：图6】** Network 面板一次成功的 `/api/auth/login`（含 Response 中 accessToken）。

---

# 第三部分  功能实现教程（成员 B 模块）

## 3.1 登录页（pages/login）

### 3.1.1 功能说明

- 邮箱 + 密码登录（与 Web 端同一账号体系）  
- 微信快捷登录（`wx.login` → 后端 `/api/auth/mp/login`）  
- 表单校验、错误提示、loading 防连点  
- 登录成功 → 存 Token → 跳转首页或完善账号页  

### 3.1.2 用到的 UI 与样式

| 元素 | 说明 |
|------|------|
| `styles/auth-form.wxss` | 居中卡片、logo、表单字段 |
| `<input bindinput>` | 邮箱、密码双向绑定 |
| 双 `<input>` + `wx:if` | 明文/密文密码切换 |
| `catchtap="togglePassword"` | 阻止事件冒泡的显示/隐藏 |
| `btn btn--primary btn--block` | 主按钮（见 buttons.wxss） |

### 3.1.3 实现步骤教程

**Step 1 — 输入同步到 data**

```javascript
onEmailInput(e) {
  this.setData({
    email: ((e.detail && e.detail.value) || '').trim(),
    error: '',
  });
},
```

**Step 2 — 前端校验再请求**

```javascript
submitPassword() {
  const { email, password } = this.data;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    this.setData({ error: '请输入有效邮箱' });
    return;
  }
  if (!password || password.length < 6) {
    this.setData({ error: '密码至少 6 位' });
    return;
  }
  this.setData({ loading: true, error: '' });
  api.login(email, password).then((res) => this.onLoginSuccess(res)).catch(...);
},
```

接口：`POST /api/auth/login`，Body `{ email, password }`

**Step 3 — 登录成功统一处理**

```javascript
onLoginSuccess(res) {
  const token = res.accessToken || res.token;
  const user = res.user || {};
  authHelper.persistSession(token, user, res.refreshToken);
  wx.showToast({ title: '登录成功', icon: 'success' });
  setTimeout(() => authHelper.afterLoginNavigate(user), 450);
},
```

**Step 4 — 微信登录**

```javascript
onMiniProgramLogin() {
  wx.login({
    success: (res) => {
      const code = res.code;
      api.loginWithMiniProgram(code).then((result) => this.onLoginSuccess(result));
    },
  });
},
```

| 步骤 | 谁处理 | 说明 |
|------|--------|------|
| wx.login | 微信服务器 | 返回临时 code |
| POST /api/auth/mp/login | 自家后端 | code 换 openid，查/建用户 |
| onLoginSuccess | 小程序 | 与普通登录相同 |

> **【截图位置：图7】** 登录页完整 UI（邮箱 + 微信按钮）。  
> **【截图位置：图8】** login.js 中 onMiniProgramLogin 代码截图。

---

## 3.2 注册页（pages/register）

### 3.2.1 与登录的差异

- 多 **确认密码** 字段  
- 校验：两次密码一致、密码不含空格  
- 成功后同样 `persistSession` + `afterLoginNavigate`（通常直接进首页）  

```javascript
api.register(email, password).then((res) => {
  authHelper.persistSession(token, user, res.refreshToken);
  authHelper.afterLoginNavigate(user);
});
```

接口：`POST /api/auth/register`

### 3.2.2 邮箱已存在

catch 中识别 409 /「已被注册」→ 提示「该邮箱已注册，请直接登录」。

> **【截图位置：图9】** 注册页 UI。

---

## 3.3 登录态工具 auth-helper.js

### 3.3.1 为什么单独抽文件

登录、注册、完善账号、我的页、所有社交页都要：**存 Token、判是否完善、取 userId**。集中维护避免复制粘贴。

### 3.3.2 关键函数

| 函数 | 作用 |
|------|------|
| `persistSession(token, user, refreshToken)` | 登录成功后写入 Storage + globalData |
| `clearSession()` | 退出登录，调 api.clearSession |
| `afterLoginNavigate(user)` | 需完善 → account-complete；否则 → 首页 Tab |
| `ensureProfileComplete()` | 各页 onShow 门禁，未完善则 redirectTo |
| `needsProfileCompletion(user)` | 读 user.needsProfileCompletion |
| `getUserId()` | 从 userInfo 取 `_id/id/userId` |

**afterLoginNavigate 逻辑：**

```javascript
function afterLoginNavigate(user) {
  if (needsProfileCompletion(user)) {
    wx.redirectTo({ url: '/pages/account-complete/account-complete' });
    return;
  }
  wx.switchTab({ url: '/pages/index/index' });
}
```

> **【截图位置：图10】** auth-helper.js 全文或 ensureProfileComplete 片段。

---

## 3.4 完善账号页（account-complete）

### 3.4.1 业务场景

微信快捷登录可能创建 **临时账号**（仅有 openid），需绑定邮箱才能与 Web 端数据合并。

### 3.4.2 两种模式

| mode | 含义 |
|------|------|
| **link** | 已有 Web 账号，输入邮箱密码绑定 |
| **register** | 在本页补全昵称、学校等并设密码 |

```javascript
api.completeAccount({ mode, email, password, name, school, grade })
  .then((res) => {
    authHelper.persistSession(token, res.user, res.refreshToken);
    wx.switchTab({ url: '/pages/index/index' });
  });
```

接口：`POST /api/auth/mp/complete-account`

### 3.4.3 onLoad 门禁

- 无 token → 重定向登录页  
- 已完善 → 直接 switchTab 首页（防止循环跳转）  

> **【截图位置：图11】** 完善账号页（link / register 切换 Tab）。

---

## 3.5 我的 Tab 页（pages/user）— 导航中枢

### 3.5.1 功能说明

- 未登录：游客头图 +「去登录」  
- 已登录：头像、昵称、邮箱、角色、分区菜单  
- 菜单数据在 js 数组配置，wxml 用 `wx:for` 渲染  
- 退出登录清除 Token  

### 3.5.2 菜单配置模式（答辩重点）

```javascript
socialTools: [
  { title: '消息', url: '/pages/messages/messages', iconKey: 'notification' },
  { title: '好友管理', url: '/pages/friends/friends', iconKey: 'user' },
  { title: '学习社区', url: '/pages/community/community', iconKey: 'notification' },
],
```

WXML：

```xml
<view wx:for="{{socialTools}}" wx:key="title"
  data-url="{{item.url}}" data-tab="{{item.tab}}" bindtap="onToolTap">
```

**onToolTap 跳转规则：**

```javascript
onToolTap(e) {
  const url = e.currentTarget.dataset.url;
  const tab = e.currentTarget.dataset.tab;
  if (tab) wx.switchTab({ url: tab });      // Tab 页（计划等）
  else if (url) wx.navigateTo({ url });     // 普通二级页
},
```

### 3.5.3 onShow 刷新用户

```javascript
onShow() {
  if (!authHelper.ensureProfileComplete()) return;
  const token = app.globalData.token;
  let userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
  if (token && userInfo) this.applyUser(userInfo);
  else if (token) api.getMe().then(...);   // 向服务器拉最新资料
  else this.setData({ isLoggedIn: false });
},
```

接口：`GET /api/auth/me`

> **【截图位置：图12】** 我的页全貌（含社交与社区分区）。  
> **【截图位置：图13】** user.js 中 socialTools / onToolTap 代码。

---

## 3.6 功能页通用模板 feature-page.js

### 3.6.1 设计目的

好友、消息、笔记、社区、通知页面结构相同：

1. 未登录 → 空状态 + 去登录  
2. 已登录 → loading → 请求数据 → 列表  

抽成 `requireLogin(page, onReady)`，避免每个页面重复写 Token 检测。

### 3.6.2 标准页面写法

```javascript
onShow() {
  featurePage.requireLogin(this, () => this.loadData());
},
goLogin() { featurePage.goLogin(); },
```

**WXML 三段式（背下来）：**

```xml
<view wx:if="{{!isLoggedIn}}">…去登录…</view>
<view wx:elif="{{loading}}">加载中…</view>
<block wx:else>…业务内容…</block>
```

### 3.6.3 requireLogin 内部流程

```
读 Storage token
  → 无 token：setData isLoggedIn=false，结束
  → 有 token：ensureValidAccessToken()
       → 成功：执行 onReady（loadData）
       → 失败且过期：clearSession，提示重新登录
```

> **【截图位置：图14】** feature-page.js 中 requireLogin 代码。  
> **【截图位置：图15】** friends.wxml 三段式状态 UI。

---

## 3.7 好友页（pages/friends）

### 3.7.1 功能说明

- 展示好友列表（与 Web 同步）  
- 展示收到的待处理请求  
- 接受 / 拒绝请求（添加好友在 Web 端发起，小程序只读 + 处理请求）  

### 3.7.2 并行加载

```javascript
Promise.all([
  apiExt.getFriends({ limit: 50 }),
  apiExt.getFriendRequests({ type: 'received', limit: 10 }),
]).then(([friendsRes, reqRes]) => {
  // map 清洗字段 → setData({ friends, requests })
});
```

| API | 方法 | 路径 |
|-----|------|------|
| 好友列表 | GET | `/api/v3/friends` |
| 收到请求 | GET | `/api/v3/friends/requests?type=received` |
| 接受 | PUT | `/api/v3/friends/requests/:id/accept` |
| 拒绝 | PUT | `/api/v3/friends/requests/:id/reject` |

### 3.7.3 接受请求（防重复点击）

```javascript
acceptRequest(e) {
  const id = e.currentTarget.dataset.id;
  if (!id || this.data.processingId) return;
  this.setData({ processingId: id });
  apiExt.acceptFriendRequest(id)
    .then(() => { wx.showToast({ title: '已接受' }); this.loadData(); })
    .finally(() => this.setData({ processingId: '' }));
},
```

WXML：`loading="{{processingId === item.id}}"` 仅当前行转圈。

### 3.7.4 演示数据

服务器执行 `seed-user-demo.js` 可为指定邮箱导入演示好友与私信（Docker 环境见项目 README）。

> **【截图位置：图16】** 好友页（列表 + 待处理请求）。  
> **【截图位置：图17】** friends.js 中 acceptRequest 代码。

---

## 3.8 消息模块（messages + chat）

### 3.8.1 会话列表 messages.js

```javascript
apiExt.getConversations().then((list) => {
  const items = raw.map((c) => ({
    id: c.userId || c.user._id,
    name: c.name || c.user.name,
    preview: quizHelper.stripHtml(previewText).slice(0, 40),
    timeText: homeApi.formatTimeAgo(c.lastMessageAt),
    unread: c.unreadCount || 0,
  }));
  this.setData({ items });
});
```

接口：`GET /api/v3/messages/conversations`

### 3.8.2 打开聊天 + URL 传参

```javascript
openChat(e) {
  const userId = e.currentTarget.dataset.id;
  const name = e.currentTarget.dataset.name;
  wx.navigateTo({
    url: `/pages/messages/chat/chat?userId=${userId}&name=${encodeURIComponent(name)}`,
  });
},
```

**注意：** 中文 name 必须 `encodeURIComponent`，chat 页 `decodeURIComponent`。

### 3.8.3 聊天页 chat.js

**加载消息：**

```javascript
apiExt.getConversation(userId, { limit: 50 }).then((list) => {
  const messages = raw.map((m) => ({
    content: quizHelper.stripHtml(m.content),
    isMine: String(m.senderId) === String(myId),  // 决定气泡左右
    timeText: homeApi.formatTimeAgo(m.createdAt),
  }));
  apiExt.markMessagesAsRead(userId).catch(() => {});
});
```

**发送消息：**

```javascript
apiExt.sendMessage({ receiverId: userId, content, type: 'text' })
  .then(() => { this.setData({ draft: '' }); this.loadMessages(); });
```

接口：

- `GET /api/v3/messages/conversations/:userId`  
- `POST /api/v3/messages`  
- `PUT /api/v3/messages/conversations/:userId/read`（标记已读）

> **【截图位置：图18】** 消息会话列表。  
> **【截图位置：图19】** 聊天页（左右气泡 + 输入框）。  
> **【截图位置：图20】** chat.js 中 send / isMine 逻辑代码。

---

## 3.9 笔记模块（notes / detail / edit）

### 3.9.1 列表页双 Tab

```javascript
Promise.all([
  apiExt.getNotes({ limit: 30 }),
  apiExt.getPublicNotes({ limit: 20 }),
]).then(([mine, pub]) => {
  this.setData({ items: mapItem(mine), publicItems: mapItem(pub) });
});
```

页面内 Tab（非底部 TabBar）：`switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); }`

### 3.9.2 新建与编辑

| 场景 | 路由 | API |
|------|------|-----|
| 新建 | `/pages/notes/edit/edit` | POST `/api/v3/notes` |
| 编辑 | `edit?id=xxx` | GET 详情 + PUT 更新 |
| 详情 | `detail?id=xxx` | GET `/api/v3/notes/:id` |

```javascript
const req = noteId
  ? apiExt.updateNote(noteId, payload)
  : apiExt.createNote(payload);
req.then(() => wx.navigateBack());
```

> **【截图位置：图21】** 笔记列表（我的/公开 Tab）。  
> **【截图位置：图22】** 新建/编辑笔记页。

---

## 3.10 社区模块（community / detail）

### 3.10.1 列表双数据源

```javascript
Promise.all([
  apiExt.getDiscussions({ limit: 30 }),
  apiExt.getLearningPosts({ limit: 20 }),
]).then(([disc, posts]) => { ... });
```

Tab：**讨论** / **学习动态**

### 3.10.2 讨论详情与回复

```javascript
apiExt.getDiscussionDetail(id).then((d) => { ... replies ... });
apiExt.addDiscussionReply(id, replyText).then(() => this.loadDetail());
```

> **【截图位置：图23】** 社区列表页。  
> **【截图位置：图24】** 讨论详情 + 回复（可选）。

---

## 3.11 通知中心（notifications）

```javascript
api.getNotifications({ page: 1, limit: 50 }).then((data) => {
  const items = (data.items || []).map((n) => ({
    id: n._id,
    title: n.title,
    timeText: homeApi.formatTimeAgo(n.createdAt),
    isRead: !!n.isRead,
  }));
});
```

点击单条：`apiExt.markNotificationRead(id)`；全部已读：`markAllNotificationsRead()`。

> **【截图位置：图25】** 通知列表页（可选，与社区二选一亦可）。

---

## 3.12 全局 UI 规范（成员 B 维护）

### 3.12.1 app.wxss 设计变量

```css
page {
  --color-primary: #1565c0;
  --color-bg: #eef2f9;
  --color-card: #ffffff;
  --shadow-card: ...;
}
```

全站改主题色只改此处。

### 3.12.2 样式文件分工

| 文件 | 用途 |
|------|------|
| `styles/buttons.wxss` | `.btn--primary`、`.btn--outline`、去除微信默认 button 边框 |
| `styles/auth-form.wxss` | 登录/注册/完善账号专用布局 |
| `styles/feature-page.wxss` | `.feature-header`、`.toolbar`、`.tool-chip` |
| `styles/page-data.wxss` | `.item-card`、`.state-box`、空状态 |

### 3.12.3 新增二级页 Checklist

1. wxml 根节点 `class="container"`  
2. 顶栏用 `feature-header` + `feature-title`  
3. 列表项用 `item-card`  
4. 主操作用 `btn btn--primary`  
5. 需登录页 `onShow` 调 `featurePage.requireLogin`  

> **【截图位置：图26】** app.wxss 变量段 + auth-form 登录卡片效果对比。

---

# 第四部分  项目调试教程

## 4.1 常用调试手段

| 工具 | B 模块用途 |
|------|------------|
| **Storage** | 检查 token 是否写入、退出是否清除 |
| **Network** | 看 /api/auth/login、/api/v3/friends 响应 |
| **Console** | 打印 loadData 返回值 |
| **AppData** | 看 login 页 email、friends 页 friends 数组 |
| **真机预览** | 验证 wx.login、request:fail |

## 4.2 常见问题排查表

| 现象 | 可能原因 | 解决方法 |
|------|----------|----------|
| request:fail domain | 未配合法域名 | 开发期关闭域名校验 |
| 登录成功但 A 的 Tab 空 | token 未存 / 过期 | 查 Storage；重登 |
| 完善账号循环跳转 | userInfo 未刷新 needsProfileCompletion | complete 后 persistSession |
| 密码框无法切换显示 | 应用 catchtap + 双 input | 见 login.wxml |
| 好友/消息空 | 未 seed 演示数据 | 服务器跑 seed-user-demo |
| 聊天中文名乱码 | 未 encodeURIComponent | 见 openChat |
| 401  on 社交页 | Token 过期 | ensureValidAccessToken；重登 |

## 4.3 功能测试用例（成员 B）

**表2 测试用例**

| 编号 | 模块 | 步骤 | 预期 | 实际 | 通过 |
|------|------|------|------|------|------|
| B01 | 邮箱登录 | 输入邮箱密码登录 | 进首页或完善页 | （待填） | ☐ |
| B02 | 微信登录 | 点微信快捷登录 | 成功或跳完善页 | （待填） | ☐ |
| B03 | 注册 | 新邮箱注册 | 自动登录进首页 | （待填） | ☐ |
| B04 | 完善账号 | 微信用户绑邮箱 | 进首页，A 可拉数据 | （待填） | ☐ |
| B05 | 我的 | 登录后进我的 Tab | 显示菜单分区 | （待填） | ☐ |
| B06 | 好友 | 打开好友页 | 列表或请求可操作 | （待填） | ☐ |
| B07 | 消息 | 进会话发文字 | 发送成功刷新 | （待填） | ☐ |
| B08 | 笔记 | 新建笔记保存 | 列表出现 | （待填） | ☐ |
| B09 | 社区 | 打开讨论列表 | 有数据或空态 | （待填） | ☐ |
| B10 | 退出 | 点退出登录 | 变游客态 | （待填） | ☐ |

> **【截图位置：图27】** Network 中登录失败/成功对比（调试留证，可选）。  
> **【截图位置：图28】** 真机预览登录成功（可选）。

---

# 第五部分  需求与设计（小组共同 · 精简）

## 5.1 项目背景

GraphTutor 学习平台小程序，移动刷题 + 轻量社交，与 Web 共用 MongoDB 与用户体系。

## 5.2 成员分工

| 成员 | 模块 |
|------|------|
| **B（本人）** | 登录、注册、完善账号、我的、好友、消息、笔记、社区、通知、全局 UI |
| **A** | 练习、考试、答题、错题、计划、打卡、复习、统计 |

## 5.3 架构与登录分支

```
[用户] → 登录页(B)
           ├─ 邮箱密码 → JWT → Storage
           ├─ 微信 code → mp/login → JWT
           └─ 需完善? → account-complete → 绑定邮箱
                ↓
         [我的 Tab 菜单] → 好友/消息/笔记/社区(B)
                ↓
         [首页/练习/错题/计划](A，依赖 B 提供的 Token)
```

> **【截图位置：图29】** 自绘架构图或登录分支流程图（标注 B 模块颜色）。→ 可直接用 **`大作业配图-架构与流程图.md`** **图B-2 / 图B-3**。

---

# 第六部分  项目总结（成员 B 个人）

## 6.1 实现成果

完成 **账号与社交 8 条主路径**：

1. 邮箱登录 → 首页  
2. 微信登录 → 完善/首页  
3. 注册 → 自动登录  
4. 完善账号绑定 Web  
5. 我的页菜单导航全站  
6. 好友列表 + 接受/拒绝请求  
7. 私信列表 + 发送消息  
8. 笔记列表 + 新建/编辑 + 社区浏览  

## 6.2 技术收获（请改写为个人话，200～400 字）

（模板，提交前必改）

通过本次开发，我系统实践了微信小程序 **登录态管理、wx.login 微信登录、JWT 本地存储与刷新** 等课程知识。在 `auth-helper.js` 中理解了如何用 `ensureProfileComplete` 做全站门禁；在 `feature-page.js` 中掌握了社交页的 **三态 UI 模板**；在 `user.js` 菜单配置模式中学会用数据驱动导航而非硬编码多个按钮。与成员 A 协作时，我优先保证 **Token 稳定写入 Storage**，使 A 的练习/错题 Tab 能正常请求。联调阶段解决了域名校验、完善账号循环跳转、密码框显示切换等问题。今后可加强消息 WebSocket 实时推送与社区发帖能力。

## 6.3 不足与展望

- 消息暂无 WebSocket，需手动刷新或重新进入  
- 好友添加依赖 Web 端，小程序可增加搜索加好友  
- 正式上架需 HTTPS + 微信公众平台配置 request 合法域名  

---

# 第七部分  演示视频脚本（成员 B 负责片段）

| 时间 | 操作 | 讲解词参考 |
|------|------|------------|
| 0:00–0:25 | 打开小程序，展示 Tab | 「GraphTutor 小程序，底部五个 Tab，我负责账号与社交。」 |
| 0:25–0:50 | 登录页邮箱或微信登录 | 「支持邮箱密码与微信快捷登录，Token 与 Web 端同步。」 |
| 0:50–1:10 | 我的 Tab 菜单分区 | 「我的页聚合全站入口，社交模块从这里进入。」 |
| 2:50–3:10 | 好友页 + 接受请求 | 「好友与 Web 同步，可处理好友请求。」 |
| 3:10–3:20 | 笔记或消息任选 | 「笔记可新建查看，消息支持与好友私信。」 |

---

# 附录 A  成员 B 负责 API 速查表

| 功能 | 方法 | 路径 | 封装函数 |
|------|------|------|----------|
| 邮箱登录 | POST | /api/auth/login | api.login |
| 注册 | POST | /api/auth/register | api.register |
| 微信登录 | POST | /api/auth/mp/login | api.loginWithMiniProgram |
| 完善账号 | POST | /api/auth/mp/complete-account | api.completeAccount |
| 当前用户 | GET | /api/auth/me | api.getMe |
| Token 刷新 | POST | /api/auth/refresh | api.refreshAccessToken |
| 好友列表 | GET | /api/v3/friends | apiExt.getFriends |
| 好友请求 | GET | /api/v3/friends/requests | apiExt.getFriendRequests |
| 接受请求 | PUT | .../requests/:id/accept | apiExt.acceptFriendRequest |
| 拒绝请求 | PUT | .../requests/:id/reject | apiExt.rejectFriendRequest |
| 会话列表 | GET | /api/v3/messages/conversations | apiExt.getConversations |
| 聊天记录 | GET | .../conversations/:userId | apiExt.getConversation |
| 发消息 | POST | /api/v3/messages | apiExt.sendMessage |
| 标记已读 | PUT | .../conversations/:userId/read | apiExt.markMessagesAsRead |
| 我的笔记 | GET | /api/v3/notes | apiExt.getNotes |
| 公开笔记 | GET | /api/v3/notes/public | apiExt.getPublicNotes |
| 新建笔记 | POST | /api/v3/notes | apiExt.createNote |
| 更新笔记 | PUT | /api/v3/notes/:id | apiExt.updateNote |
| 讨论列表 | GET | /api/v3/discussions | apiExt.getDiscussions |
| 学习动态 | GET | /api/v3/learning-posts | apiExt.getLearningPosts |
| 讨论回复 | POST | /api/v3/discussions/:id/replies | apiExt.addDiscussionReply |
| 通知列表 | GET | /api/v3/notifications | api.getNotifications |
| 标记通知已读 | PUT | /api/v3/notifications/:id/read | apiExt.markNotificationRead |

---

# 附录 B  截图清单（成员 B 详细版共 29 处）

| 编号 | 内容 |
|------|------|
| 图1 | 开发者工具全貌（登录/我的） |
| 图2 | 工具登录 |
| 图3 | 不校验合法域名 |
| 图4 | Storage token/userInfo |
| 图5 | auth-helper persistSession 代码 |
| 图6 | Network 登录成功响应 |
| 图7 | 登录页 UI |
| 图8 | login.js 微信登录代码 |
| 图9 | 注册页 UI |
| 图10 | auth-helper ensureProfileComplete |
| 图11 | 完善账号页 |
| 图12 | 我的页全貌 |
| 图13 | user.js 菜单/onToolTap 代码 |
| 图14 | feature-page.js requireLogin |
| 图15 | friends 三态 UI |
| 图16 | 好友页 |
| 图17 | friends acceptRequest 代码 |
| 图18 | 消息会话列表 |
| 图19 | 聊天页气泡 |
| 图20 | chat.js send/isMine 代码 |
| 图21 | 笔记列表 |
| 图22 | 笔记编辑页 |
| 图23 | 社区列表 |
| 图24 | 讨论详情（可选） |
| 图25 | 通知页（可选） |
| 图26 | 全局 UI / auth-form 样式 |
| 图27 | 调试 Network 对比（可选） |
| 图28 | 真机登录（可选） |
| 图29 | 架构/登录分支图（自绘） |

---

# 附录 C  与成员 A 协作文档对照

| 文档 | 成员 A | 成员 B |
|------|--------|--------|
| 大作业报告（精简） | 成员A-...报告.md | 成员B-...报告.md |
| **大作业报告（详细技术版）** | 成员A-...详细技术版.md | **本文档** |
| 零基础代码精读 | 成员A-零基础...md | 成员B-零基础...md |

---

**报告结束 · 成员 B 详细技术版**  
> 导出 Word/PDF 时：宋体五号、1.5 倍行距、首行缩进 2 字符；图片居中并在下方标注图号。
