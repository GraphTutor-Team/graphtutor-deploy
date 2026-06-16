# GraphTutor 小程序 · 零基础代码精读教程（成员 B 专用）

> 面向「看得懂大概、不懂每一行什么意思」的同学。  
> **成员 B 负责：登录 / 注册 / 完善账号 / 我的 / 好友 / 消息 / 笔记 / 社区 / 通知 / 全局 UI**  
> 若 `const`、`setData`、`bindtap`、`.then()` 等还不熟，请先读同目录 **`成员A-零基础代码精读教程.md` 第 1～9 节**（通用语法），本文从 **B 模块** 开始 **一步一步** 讲。

---

## 目录（建议按顺序学）

| 步骤 | 内容 | 对应文件 |
|------|------|----------|
| **第 0 步** | B 负责哪些页面 | 本文 |
| **第 1 步** | 全局 UI：颜色、卡片、按钮 | `app.wxss`、`styles/buttons.wxss` |
| **第 2 步** | 登录页：邮箱 + 微信 | `pages/login/` |
| **第 3 步** | 注册页 | `pages/register/` |
| **第 4 步** | 登录态工具 auth-helper | `utils/auth-helper.js` |
| **第 5 步** | 完善账号（微信用户绑邮箱） | `pages/account-complete/` |
| **第 6 步** | 「我的」Tab：功能菜单中枢 | `pages/user/` |
| **第 7 步** | 功能页通用模式 feature-page | `utils/feature-page.js` |
| **第 8 步** | 好友：列表 + 接受/拒绝 | `pages/friends/` |
| **第 9 步** | 消息：会话列表 + 聊天 | `pages/messages/`、`chat/` |
| **第 10 步** | 笔记：列表 + 新建 + 详情 | `pages/notes/` |
| **第 11 步** | 社区：讨论 + 动态 | `pages/community/` |
| **第 12 步** | 通知中心（扩展） | `pages/notifications/` |
| **第 13 步** | 完整链路图（答辩用） | 本文 |
| **附录** | 速查表 + 学习顺序 | 本文 |

---

## 第 0 步：成员 B 负责什么

### 0.1 页面清单

| 页面 | 路径 | 干什么 |
|------|------|--------|
| 登录 | `pages/login/` | 邮箱密码登录、微信快捷登录 |
| 注册 | `pages/register/` | 新用户注册 |
| 完善账号 | `pages/account-complete/` | 微信登录后绑定邮箱 |
| **我的 Tab** | `pages/user/` | 头像、菜单入口、退出登录 |
| 好友 | `pages/friends/` | 好友列表、处理好友请求 |
| 消息 | `pages/messages/` | 私信会话列表 |
| 聊天 | `pages/messages/chat/` | 与某好友一对一聊天 |
| 笔记 | `pages/notes/`、`detail/`、`edit/` | 笔记列表、查看、新建/编辑 |
| 社区 | `pages/community/`、`detail/` | 讨论帖、学习动态 |
| 通知 | `pages/notifications/` | 系统消息 |
| **全局 UI** | `app.wxss`、`styles/` | 主题色、卡片、按钮样式 |

### 0.2 B 和 A 的分工边界

- **B**：用户是谁（登录）、从哪进功能（我的菜单）、和谁聊（社交）  
- **A**：练什么题、怎么答、错题计划打卡  
- **共用**：`utils/api.js`（网络）、`utils/auth-helper.js`（登录态）

### 0.3 app.json 里和 B 相关的配置

```json
"tabBar": {
  "list": [
    { "pagePath": "pages/index/index", "text": "首页" },
    ...
    { "pagePath": "pages/user/user", "text": "我的" }   // ← B 负责的 Tab
  ]
}
```

- **Tab 页**（底部五个）：只能用 `wx.switchTab` 跳转，不能 `navigateTo`。  
- **普通页**（登录、好友、消息等）：用 `wx.navigateTo` 打开，可返回。

> **【截图建议】** 开发者工具底部 TabBar + `app.json` 的 tabBar 段。

---

## 第 1 步：全局 UI（颜色、卡片、按钮）

成员 B 还负责 **整站视觉统一**。所有页面复用 `app.wxss` 里的 class，不用每个页面重复写样式。

### 1.1 CSS 变量（设计令牌）

文件：`miniprogram/app.wxss`

```css
page {
  --color-primary: #1565c0;        /* 主题蓝 */
  --color-bg: #eef2f9;             /* 页面背景 */
  --color-card: #ffffff;           /* 卡片白 */
  --color-text: #1a237e;           /* 主文字 */
  --radius-md: 24rpx;              /* 圆角 */
  --shadow-card: 0 16rpx 48rpx ...; /* 卡片阴影 */
}
```

| 写法 | 含义 |
|------|------|
| `--color-primary` | 定义变量，全项目统一改色只改一处 |
| `var(--color-primary)` | 使用变量 |
| **rpx** | 小程序响应式单位，750rpx = 屏幕宽 |

**WXML 里怎么用？**  
不写变量，直接写 class 名，例如 `<view class="card">`，样式已在 wxss 里定义好。

### 1.2 通用 class 一览

| class | 效果 | 常见页面 |
|-------|------|----------|
| `.container` | 页面内边距、最小高度 | 几乎所有页 |
| `.container--auth` | 登录/注册页专用间距 | login、register |
| `.card` | 白底圆角卡片 | 好友、笔记、社区 |
| `.section-title` | 左侧蓝条 + 粗标题 | 我的页各区块 |
| `.feature-header` | 二级页顶栏标题+描述 | friends、notes |
| `.state-box` / `.state-text` | 空状态、加载中 | 未登录提示 |
| `.item-card` | 列表每一项 | 好友行、笔记行 |
| `.toolbar` + `.tool-chip` | Tab 切换条 | 笔记「我的/公开」 |

### 1.3 按钮体系

文件：`miniprogram/styles/buttons.wxss`（被 `app.wxss` import）

```css
.btn--primary { /* 蓝渐变主按钮 */ }
.btn--outline { /* 描边按钮，如「退出登录」 */ }
.btn--block { width: 100%; }  /* 占满一行 */
```

**WXML 示例（登录页）：**

```xml
<button class="btn btn--primary btn--block" bindtap="submitPassword">登录</button>
```

| 属性 | 作用 |
|------|------|
| `loading="{{loading}}"` | 请求中显示转圈 |
| `disabled="{{loading}}"` | 防止连点 |

### 1.4 登录页专用样式

登录页用 `container--auth`、`auth-card`、`form-field` 等（多在 `login.wxss` 或全局 auth 样式里），形成 **居中卡片 + 表单** 布局。

**你要记住：** B 模块的页面 **尽量复用** `.card`、`.btn--primary`，不要每页发明新颜色。

---

## 第 2 步：登录页 login（逐块讲解）

打开：`miniprogram/pages/login/login.wxml` + `login.js`

### 2.1 data：页面初始状态

```javascript
Page({
  data: {
    email: '',              // 用户输入的邮箱
    password: '',           // 密码
    showPassword: false,    // 是否明文显示密码
    passwordToggleText: '显示',
    loading: false,         // 邮箱登录按钮 loading
    mpLoading: false,       // 微信登录按钮 loading
    error: '',              // 表单错误提示
  },
```

- 所有输入框的值都存在 `data` 里，通过 `value="{{email}}"` 和输入事件同步。

### 2.2 输入框：bindinput

**WXML：**

```xml
<input
  value="{{email}}"
  bindinput="onEmailInput"
  placeholder="your@email.com"
/>
```

**JS：**

```javascript
onEmailInput(e) {
  this.setData({
    email: ((e.detail && e.detail.value) || '').trim(),
    error: '',
  });
},
```

| 部分 | 解释 |
|------|------|
| `bindinput` | 每敲一个字就触发（比 bindchange 更实时） |
| `e.detail.value` | 输入框当前文字 |
| `.trim()` | 去掉首尾空格 |
| 同时 `error: ''` | 用户重新输入时清掉红字错误 |

### 2.3 密码显示/隐藏（两个 input + wx:if）

```xml
<input wx:if="{{showPassword}}" type="text" ... />
<input wx:else password ... />
<view catchtap="togglePassword">{{passwordToggleText}}</view>
```

| 知识点 | 说明 |
|--------|------|
| `wx:if` / `wx:else` | 只渲染其中一个 input |
| `password` 属性 | 密文圆点（不是 type="password"） |
| **`catchtap`** | 点击事件，且 **阻止冒泡**（不会误触外层） |
| `togglePassword` | 切换 `showPassword`，按钮文字变「隐藏」 |

### 2.4 邮箱登录 submitPassword

```javascript
submitPassword() {
  const { email, password } = this.data;

  // ① 前端校验（不合法就不发请求，省流量）
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    this.setData({ error: '请输入有效邮箱' });
    return;
  }
  if (!password || password.length < 6) {
    this.setData({ error: '密码至少 6 位' });
    return;
  }

  // ② 开始请求
  this.setData({ loading: true, error: '' });
  api.login(email, password).then((res) => {
    this.onLoginSuccess(res);
  }).catch((err) => {
    this.setData({
      loading: false,
      error: (err && err.message) || '登录失败，请检查邮箱和密码',
    });
  });
},
```

| 步骤 | 干什么 |
|------|--------|
| 解构 `{ email, password }` | 从 data 取值 |
| 正则 `.test(email)` | 检查邮箱格式 |
| `return` | 校验失败立刻结束 |
| `api.login` | POST `/api/auth/login`（见 api.js） |

**正则不用背：** 意思是「有 @，@ 前后都有非空字符，@ 后面还有点号分隔」。

### 2.5 登录成功 onLoginSuccess

```javascript
onLoginSuccess(res) {
  if (!res || !res.success) {
    this.setData({ loading: false, error: ... });
    return;
  }

  const token = res.accessToken || res.token;
  const user = res.user || {};
  authHelper.persistSession(token, user, res.refreshToken);
  // ↑ 存 token + 用户信息到本地和 globalData

  wx.showToast({ title: '登录成功', icon: 'success' });
  setTimeout(() => {
    authHelper.afterLoginNavigate(user);
    // ↑ 450ms 后跳转：要完善账号 → 完善页；否则 → 首页 Tab
  }, 450);
},
```

**persistSession 做了什么（auth-helper.js）：**

```javascript
function persistSession(token, user, refreshToken) {
  api.saveTokens(token, refreshToken);     // wx.setStorageSync('token', ...)
  getApp().globalData.userInfo = user;     // 内存里也放一份
  wx.setStorageSync('userInfo', user);     // 持久化用户信息
}
```

### 2.6 微信快捷登录 onMiniProgramLogin

```javascript
onMiniProgramLogin() {
  if (this.data.loading || this.data.mpLoading) return;  // 防连点
  this.setData({ mpLoading: true, error: '' });

  wx.login({
    success: (res) => {
      const code = res.code;   // 临时凭证，只能给自家后端换 openid
      api.loginWithMiniProgram(code).then((result) => {
        this.onLoginSuccess(result);
      }).catch(...);
    },
    fail: () => { ... },
  });
},
```

**流程图：**

```
用户点「微信快捷登录」
  → wx.login() 向微信服务器要 code（用户无感）
  → 小程序把 code POST 给自家后端 /api/auth/mp/login
  → 后端用 code 换 openid，查/建用户，返回 JWT token
  → onLoginSuccess 存 token，跳转
```

| 概念 | 解释 |
|------|------|
| **code** | 临时字符串，5 分钟过期，不能当登录凭证长期用 |
| **token (JWT)** | 自家后端发的「通行证」，以后每个 API 请求都要带 |

### 2.7 去注册 goRegister

```javascript
goRegister() {
  wx.navigateTo({ url: '/pages/register/register' });
}
```

- `navigateTo`：压栈，用户可点左上角返回登录页。

---

## 第 3 步：注册页 register

逻辑与登录 **高度相似**，多一个「确认密码」。

### 3.1 额外校验

```javascript
if (password !== confirmPassword) {
  this.setData({ error: '两次密码不一致' });
  return;
}
if (/\s/.test(password)) {
  this.setData({ error: '密码不能包含空格' });
  return;
}
```

### 3.2 注册 API

```javascript
api.register(email, password).then((res) => {
  // 成功后同样 persistSession + afterLoginNavigate
});
```

- POST `/api/auth/register`  
- 若邮箱已存在，catch 里把 409 转成「该邮箱已注册，请直接登录」

### 3.3 返回登录

```javascript
goLogin() {
  wx.navigateBack({
    fail: () => wx.redirectTo({ url: '/pages/login/login' }),
  });
}
```

- 优先 `navigateBack`（从注册返回登录）  
- 若栈里没有上一页，则 `redirectTo` 强制打开登录页

---

## 第 4 步：登录态工具 auth-helper.js

**全项目 B 模块的核心枢纽**，多个页面 `require` 它。

### 4.1 函数一览

| 函数 | 作用 | 谁在用 |
|------|------|--------|
| `persistSession(token, user, refreshToken)` | 登录成功后存 token | login、register、account-complete |
| `clearSession()` | 退出登录，清 token | user 页 logout |
| `afterLoginNavigate(user)` | 登录后跳完善页或首页 | login、register |
| `ensureProfileComplete()` | 未完善则强制跳完善页 | 几乎所有需登录页 onShow |
| `needsProfileCompletion(user)` | 用户是否要绑邮箱 | user 页警告条 |
| `getUserId()` | 取当前用户 ID | chat、api 参数 |
| `goCompleteAccount()` | 打开完善页 | user 页按钮 |

### 4.2 ensureProfileComplete — 为什么要它

```javascript
function ensureProfileComplete() {
  const token = wx.getStorageSync('token');
  const user = wx.getStorageSync('userInfo');
  if (!token) return true;   // 没登录，不拦截（由页面自己显示「去登录」）
  if (needsProfileCompletion(user)) {
    wx.redirectTo({ url: '/pages/account-complete/account-complete' });
    return false;            // 告诉页面：别继续加载业务数据
  }
  return true;
}
```

**典型用法（user.js onShow）：**

```javascript
onShow() {
  if (!authHelper.ensureProfileComplete()) return;
  // 下面才拉用户信息、显示菜单
}
```

### 4.3 getUserId

```javascript
function getUserId() {
  const user = wx.getStorageSync('userInfo') || {};
  return user._id || user.id || user.userId || '';
}
```

- MongoDB 文档 ID 有时是 `_id`，有时是 `id`，所以 **三个都试**。

---

## 第 5 步：完善账号 account-complete

**场景：** 用户用 **微信登录**，后端创建了「待完善」账号，必须绑邮箱才能和 Web 端数据打通。

### 5.1 onLoad 门禁

```javascript
onLoad() {
  const token = wx.getStorageSync('token');
  const user = wx.getStorageSync('userInfo');
  if (!token) {
    wx.redirectTo({ url: '/pages/login/login' });
    return;
  }
  if (!authHelper.needsProfileCompletion(user)) {
    wx.switchTab({ url: '/pages/index/index' });  // 已完善，不用来这页
  }
},
```

### 5.2 两种模式 switchMode

- **link**：已有 Web 账号，绑定邮箱  
- **register**：在本页补全注册信息  

```javascript
switchMode(e) {
  const mode = e.currentTarget.dataset.mode || 'link';
  this.setData({ mode, isLinkMode: mode === 'link', ... });
}
```

WXML 里 Tab 按钮：`data-mode="link"`、`data-mode="register"`。

### 5.3 提交 completeAccount

```javascript
api.completeAccount({ mode, email, password, name, school, grade })
  .then((res) => {
    authHelper.persistSession(token, user, refreshToken);
    wx.switchTab({ url: '/pages/index/index' });
  });
```

---

## 第 6 步：「我的」Tab 页 user.js

**B 模块的导航中枢**：登录后从这里进好友、消息、笔记、社区等。

### 6.1 data 里的菜单数组（重要模式）

```javascript
socialTools: [
  { title: '消息', desc: '私信会话', url: '/pages/messages/messages', iconKey: 'notification' },
  { title: '好友管理', desc: '好友与请求', url: '/pages/friends/friends', iconKey: 'user' },
  { title: '学习社区', desc: '讨论与学习动态', url: '/pages/community/community', iconKey: 'notification' },
  ...
],
```

| 字段 | 用途 |
|------|------|
| `title` / `desc` | 菜单上显示 |
| `url` | 普通页跳转地址 |
| `tab` | 若是 Tab 页，填 tab 路径（如学习计划） |
| `iconKey` | 对应 `icons.js` 里的图标 |

### 6.2 WXML：wx:for 渲染菜单

```xml
<view class="menu-row"
  wx:for="{{socialTools}}"
  wx:key="title"
  data-url="{{item.url}}"
  data-tab="{{item.tab}}"
  bindtap="onToolTap">
  <image src="{{icons[item.iconKey]}}" />
  <view class="menu-title">{{item.title}}</view>
  ...
</view>
```

**好处：** 加一个入口只改 **js 数组**，不用改一堆 wxml。

### 6.3 onToolTap：统一跳转

```javascript
onToolTap(e) {
  const url = e.currentTarget.dataset.url;
  const tab = e.currentTarget.dataset.tab;
  if (tab) {
    wx.switchTab({ url: tab });
    return;
  }
  if (url) wx.navigateTo({ url });
},
```

| 跳转 API | 何时用 |
|----------|--------|
| `switchTab` | 目标是底部 Tab（首页、计划、错题、我的） |
| `navigateTo` | 普通二级页（好友、笔记…） |

### 6.4 onShow 刷新用户信息

```javascript
onShow() {
  if (!authHelper.ensureProfileComplete()) return;

  const token = app.globalData.token;
  let userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');

  if (token && userInfo) {
    this.applyUser(userInfo);
    return;
  }
  if (token) {
    api.getMe().then((res) => { ... });  // 本地没 user 就向服务器要
  } else {
    this.setData({ isLoggedIn: false }); // 游客态
  }
},
```

### 6.5 未登录 vs 已登录 UI

```xml
<view class="user-header" wx:if="{{isLoggedIn}}">...</view>
<view class="guest-header" wx:else>
  <button bindtap="goLogin">去登录</button>
</view>
```

### 6.6 退出登录

```javascript
logout() {
  authHelper.clearSession();
  this.setData({ isLoggedIn: false, userInfo: null });
  wx.showToast({ title: '已退出', icon: 'none' });
},
```

---

## 第 7 步：功能页通用模式 feature-page.js

好友、消息、笔记、社区、通知等 **结构很像**：

1. 未登录 → 显示「去登录」  
2. 已登录 → loading → 拉数据 → 列表  

**抽成公共函数：**

```javascript
function requireLogin(page, onReady) {
  if (!authHelper.ensureProfileComplete()) return false;

  const token = wx.getStorageSync('token');
  if (!token) {
    page.setData({ isLoggedIn: false, loading: false });
    return false;
  }

  page.setData({ isLoggedIn: true, loading: true });
  api.ensureValidAccessToken()
    .then(() => onReady())           // token 有效才执行 loadData
    .catch((err) => {
      // token 过期 → 清 session，变未登录
    });
  return true;
}
```

**每个社交页的固定写法：**

```javascript
onShow() {
  featurePage.requireLogin(this, () => this.loadData());
},
goLogin() { featurePage.goLogin(); },
```

| 参数 | 含义 |
|------|------|
| `page` | 当前 Page 实例（`this`） |
| `onReady` | 登录且 token 有效后的回调，一般是 `loadData` |

**WXML 三段式状态（背下来）：**

```xml
<view wx:if="{{!isLoggedIn}}">去登录</view>
<view wx:elif="{{loading}}">加载中…</view>
<block wx:else>真正的内容</block>
```

---

## 第 8 步：好友页 friends

### 8.1 并行拉两个接口

```javascript
loadData() {
  Promise.all([
    apiExt.getFriends({ limit: 50 }),
    apiExt.getFriendRequests({ type: 'received', limit: 10 }),
  ]).then(([friendsRes, reqRes]) => {
    // 整理成页面需要的 friends[]、requests[]
    this.setData({ loading: false, friends, requests });
  });
},
```

| API | 方法 | 路径 |
|-----|------|------|
| 好友列表 | GET | `/api/v3/friends` |
| 收到的请求 | GET | `/api/v3/friends/requests?type=received` |

### 8.2 数据清洗 map（后端字段不统一时）

```javascript
const friends = friendList.map((f) => {
  const u = f.friend || f.user || f;   // 兼容多种嵌套结构
  return {
    id: u._id || u.id,
    name: u.name || u.nickname || u.email || '好友',
    email: u.email || '',
  };
});
```

**为什么要 map？** 服务器 JSON 结构可能复杂，页面 wxml 只需要 `id`、`name` 几个字段。

### 8.3 接受 / 拒绝请求

```javascript
acceptRequest(e) {
  const id = e.currentTarget.dataset.id;   // wxml: data-id="{{item.id}}"
  if (!id || this.data.processingId) return; // 防止重复点

  this.setData({ processingId: id });
  apiExt.acceptFriendRequest(id)
    .then(() => {
      wx.showToast({ title: '已接受', icon: 'success' });
      this.loadData();   // 刷新列表
    })
    .finally(() => this.setData({ processingId: '' }));
},
```

**WXML 按钮 loading：**

```xml
<button
  loading="{{processingId === item.id}}"
  disabled="{{!!processingId}}"
  data-id="{{item.id}}"
  bindtap="acceptRequest"
>接受</button>
```

- 只有 **正在处理的那一行** 按钮转圈  
- `!!processingId`：有任何请求在处理时，其他按钮也禁用

---

## 第 9 步：消息 messages + 聊天 chat

### 9.1 会话列表 messages.js

```javascript
apiExt.getConversations().then((list) => {
  const items = raw.map((c) => ({
    id: c.userId || c._id || ...,
    name: c.name || c.user.name || '用户',
    preview: quizHelper.stripHtml(previewText).slice(0, 40),
    timeText: homeApi.formatTimeAgo(c.lastMessageAt),
    unread: c.unreadCount || 0,
  }));
  this.setData({ items });
});
```

| 工具函数 | 作用 |
|----------|------|
| `stripHtml` | 去掉 HTML 标签（消息里可能有富文本） |
| `formatTimeAgo` | 「3 分钟前」「昨天」 |
| `.slice(0, 40)` | 预览最多 40 字 |

### 9.2 打开聊天 openChat

```javascript
openChat(e) {
  const userId = e.currentTarget.dataset.id;
  const name = e.currentTarget.dataset.name || '用户';
  wx.navigateTo({
    url: `/pages/messages/chat/chat?userId=${userId}&name=${encodeURIComponent(name)}`,
  });
},
```

**URL 传参：**

- `?userId=xxx&name=张三`  
- 中文名要用 `encodeURIComponent`，否则乱码  
- 聊天页 `onLoad(options)` 里 `decodeURIComponent(options.name)` 还原

### 9.3 聊天页 chat.js

**onLoad 取参数：**

```javascript
onLoad(options) {
  const userId = options.userId || '';
  const userName = options.name ? decodeURIComponent(options.name) : '用户';
  this.setData({ userId, userName, myId: authHelper.getUserId() });
  wx.setNavigationBarTitle({ title: userName });
  this.loadMessages();
},
```

**loadMessages：判断消息是不是自己发的**

```javascript
const messages = raw.map((m) => {
  const senderId = String(m.senderId || m.sender._id || '');
  return {
    content: quizHelper.stripHtml(m.content || ''),
    timeText: homeApi.formatTimeAgo(m.createdAt),
    isMine: senderId === String(myId),   // ← 决定气泡靠左还是靠右
  };
});
```

**WXML 气泡样式：**

```xml
<view class="chat-row {{item.isMine ? 'chat-row--mine' : 'chat-row--other'}}">
  <view class="chat-bubble">{{item.content}}</view>
</view>
```

### 9.4 发送消息 send

```javascript
send() {
  const content = (draft || '').trim();
  if (!userId || !content || sending) return;

  this.setData({ sending: true });
  apiExt.sendMessage({ receiverId: userId, content, type: 'text' })
    .then(() => {
      this.setData({ draft: '' });
      this.loadMessages();   // 重新拉列表，看到自己刚发的
    })
    .finally(() => this.setData({ sending: false }));
},
```

**输入框：**

```xml
<input value="{{draft}}" bindinput="onInput" bindconfirm="send" confirm-type="send" />
```

- `bindconfirm`：键盘上点「发送」也会触发 `send`

### 9.5 scroll-view

```xml
<scroll-view class="chat-list" scroll-y>
  ...
</scroll-view>
```

- 消息多时可滚动；`scroll-y` 允许纵向滚。

---

## 第 10 步：笔记 notes

### 10.1 双 Tab + 双接口

```javascript
Promise.all([
  apiExt.getNotes({ limit: 30 }),        // 我的笔记
  apiExt.getPublicNotes({ limit: 20 }),    // 公开笔记
]).then(([mine, pub]) => {
  this.setData({ items: ..., publicItems: ... });
});
```

**switchTab（页面内 Tab，不是底部 TabBar）：**

```javascript
switchTab(e) {
  this.setData({ tab: e.currentTarget.dataset.tab });  // 'mine' 或 'public'
},
```

```xml
<view class="tool-chip {{tab === 'mine' ? 'tool-chip--active' : ''}}"
  data-tab="mine" bindtap="switchTab">我的笔记</view>
```

- **三元表达式** 控制哪个 chip 高亮。

### 10.2 新建与打开

```javascript
createNote() {
  wx.navigateTo({ url: '/pages/notes/edit/edit' });  // 无 id = 新建
},

openNote(e) {
  wx.navigateTo({ url: `/pages/notes/detail/detail?id=${id}` });
},
```

### 10.3 编辑页 edit.js — 新建 vs 编辑

```javascript
onLoad(options) {
  const noteId = options && options.id;
  if (noteId) {
    // 有 id：编辑模式，先 GET 详情填表单
    apiExt.getNoteDetail(noteId).then((note) => {
      this.setData({ title: note.title, content: note.content, ... });
    });
  } else {
    wx.setNavigationBarTitle({ title: '新建笔记' });
  }
},
```

**保存：根据有没有 noteId 选 API**

```javascript
const req = noteId
  ? apiExt.updateNote(noteId, payload)   // PUT 更新
  : apiExt.createNote(payload);          // POST 新建
req.then(() => {
  wx.showToast({ title: '已保存' });
  setTimeout(() => wx.navigateBack(), 500);
});
```

### 10.4 详情页 detail.js

- 只读展示 `title`、`content`、`timeText`  
- 「编辑」按钮 → `navigateTo` 到 edit 并带 `?id=`

---

## 第 11 步：社区 community

结构与笔记类似：**工具栏 Tab + Promise.all 拉两路数据**。

```javascript
Promise.all([
  apiExt.getDiscussions({ limit: 30 }),
  apiExt.getLearningPosts({ limit: 20 }),
]).then(([disc, posts]) => {
  this.setData({ discussions: ..., posts: ... });
});
```

**normalizeList 小工具：**

```javascript
function normalizeList(res) {
  if (Array.isArray(res)) return res;
  return (res && res.items) || [];
}
```

- 后端有时直接返回数组，有时 `{ items: [...] }`，统一成数组。

**openDiscussion：**

```javascript
openDiscussion(e) {
  wx.navigateTo({
    url: `/pages/community/detail/detail?id=${e.currentTarget.dataset.id}`,
  });
},
```

---

## 第 12 步：通知 notifications（扩展）

同样 `featurePage.requireLogin` + `loadData`：

```javascript
api.getNotifications({ page: 1, limit: 50 }).then((data) => {
  const items = (data.items || []).map((n) => ({
    id: n._id || n.id,
    title: n.title || '通知',
    timeText: homeApi.formatTimeAgo(n.createdAt),
    isRead: !!n.isRead,
  }));
});
```

**标记已读：**

```javascript
apiExt.markNotificationRead(id).finally(() => this.loadData());
```

---

## 第 13 步：完整链路（答辩用）

### 13.1 邮箱登录全流程

```
打开 login 页
  → 输入邮箱/密码（bindinput → setData）
  → 点「登录」（bindtap → submitPassword）
  → 前端校验邮箱格式、密码长度
  → api.login → POST /api/auth/login
  → 服务器验密码，返回 { success, accessToken, user }
  → authHelper.persistSession（token + userInfo 存本地）
  → authHelper.afterLoginNavigate
       ├─ needsProfileCompletion? → account-complete 完善页
       └─ 否则 → switchTab 首页
  → user 页 onShow 读 userInfo 显示头像菜单
```

### 13.2 微信登录全流程

```
点「微信快捷登录」
  → wx.login 得 code
  → api.loginWithMiniProgram(code) → POST /api/auth/mp/login
  → 后端 code2Session 得 openid，查找/创建用户
  → onLoginSuccess（同上）
```

### 13.3 从「我的」进好友并接受请求

```
user 页 socialTools → onToolTap → navigateTo friends
  → onShow → featurePage.requireLogin → loadData
  → Promise.all 好友列表 + 待处理请求
  → 点「接受」→ acceptFriendRequest(id) → PUT .../accept
  → loadData 刷新
```

### 13.4 发一条私信

```
messages 列表 → openChat → chat?userId=&name=
  → loadMessages → GET 会话消息
  → 输入 draft → send → POST /api/v3/messages
  → loadMessages 刷新 → markMessagesAsRead
```

### 13.5 新建笔记

```
notes 页 → createNote → edit（无 id）
  → 填 title/content → saveNote → POST /api/v3/notes
  → navigateBack → notes onShow 重新 loadData
```

---

## 附录 A：成员 B API 速查

| 功能 | 函数 | 方法 | 路径 |
|------|------|------|------|
| 登录 | `api.login` | POST | `/api/auth/login` |
| 注册 | `api.register` | POST | `/api/auth/register` |
| 微信登录 | `api.loginWithMiniProgram` | POST | `/api/auth/mp/login` |
| 当前用户 | `api.getMe` | GET | `/api/auth/me` |
| 完善账号 | `api.completeAccount` | POST | `/api/auth/complete-account` |
| 好友列表 | `apiExt.getFriends` | GET | `/api/v3/friends` |
| 好友请求 | `apiExt.getFriendRequests` | GET | `/api/v3/friends/requests` |
| 接受请求 | `apiExt.acceptFriendRequest` | PUT | `.../requests/:id/accept` |
| 拒绝请求 | `apiExt.rejectFriendRequest` | PUT | `.../requests/:id/reject` |
| 会话列表 | `apiExt.getConversations` | GET | `/api/v3/messages/conversations` |
| 聊天记录 | `apiExt.getConversation` | GET | `/api/v3/messages/conversations/:userId` |
| 发消息 | `apiExt.sendMessage` | POST | `/api/v3/messages` |
| 我的笔记 | `apiExt.getNotes` | GET | `/api/v3/notes` |
| 新建笔记 | `apiExt.createNote` | POST | `/api/v3/notes` |
| 讨论列表 | `apiExt.getDiscussions` | GET | `/api/v3/discussions` |

---

## 附录 B：WXML 事件与传参（B 模块高频）

| 写法 | 含义 | 示例 |
|------|------|------|
| `bindtap="fn"` | 点击 | 登录按钮 |
| `bindinput="fn"` | 输入变化 | 邮箱、聊天输入 |
| `catchtap="fn"` | 点击且不冒泡 | 密码「显示/隐藏」 |
| `data-id="{{item.id}}"` | 传参给事件 | 接受好友、打开聊天 |
| `data-tab="mine"` | 传 Tab 名 | 笔记/社区切换 |
| `wx:if` / `wx:elif` / `wx:else` | 条件渲染 | 未登录/加载/内容 |
| `wx:for` + `wx:key` | 列表循环 | 菜单、好友、消息 |

**在 js 里取 data- 参数：**

```javascript
e.currentTarget.dataset.id
e.currentTarget.dataset.tab
```

---

## 附录 C：建议学习顺序（一步一步做）

| 天数 | 任务 | 验收标准 |
|------|------|----------|
| **1** | 读第 1～2 步，对照 login 四文件 | 能说出 bindinput、submitPassword 干什么 |
| **2** | 读第 3～5 步，跑通注册 + 理解 auth-helper | 能解释 token 存在哪 |
| **3** | 读第 6 步 user 页 | 能加一个假菜单项并跳转 |
| **4** | 读第 7～8 步 friends | 能解释 Promise.all 和 acceptRequest |
| **5** | 读第 9 步 messages/chat | 能画出 URL 传参和 isMine |
| **6** | 读第 10～11 步 notes、community | 能区分 switchTab 与 navigateTo |
| **7** | 读第 13 步，录答辩演示 | 按链路讲 3 分钟 |

**调试技巧：**

```javascript
// 临时加在 loadData 的 then 里
console.log('friends', friends);
```

开发者工具 → Console 面板查看。提交前删掉。

---

## 附录 D：答辩万能四句话（B 版）

1. **在哪**：例如 `pages/login/login.js` 的 `submitPassword`  
2. **触发**：用户点「登录」/ 进入「我的」Tab  
3. **做什么**：校验表单 → `api.login` → `persistSession` → 跳转  
4. **结果**：token 写入本地，界面切到已登录态  

**示例：**  
「`featurePage.requireLogin` 在好友页 `onShow` 里调用，先检查 token 是否有效，有效才执行 `loadData` 并行请求好友列表和好友请求，否则显示去登录卡片。」

---

**文档结束**  
建议与 `成员B-...大作业报告.md` 一起使用：报告写「做了什么」，本文写「每一行什么意思」。
