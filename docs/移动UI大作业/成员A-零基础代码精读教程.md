# GraphTutor 小程序 · 零基础代码精读教程（成员 A 专用）

> 面向「看得懂大概、不懂每一行什么意思」的同学。  
> 配合项目路径 `miniprogram/` 阅读，建议打开 **练习配置页** `pages/quiz/setup/` 和 **答题页** `pages/quiz/session/` 对照看。

---

## 目录

1. [一个小程序页面到底有哪几个文件](#1-一个小程序页面到底有哪几个文件)
2. [JavaScript 基础语法（本项目必会）](#2-javascript-基础语法本项目必会)
3. [WXML：页面长什么样](#3-wxml页面长什么样)
4. [WXSS：样式怎么写](#4-wxss样式怎么写)
5. [Page 页面：js 里在干什么](#5-page-页面js-里在干什么)
6. [require 和 module.exports：怎么引用别的文件](#6-require-和-moduleexports怎么引用别的文件)
7. [wx 开头的 API：微信提供的工具箱](#7-wx-开头的-api微信提供的工具箱)
8. [网络请求：怎么跟服务器说话](#8-网络请求怎么跟服务器说话)
9. [Promise 和 then：异步代码怎么读](#9-promise-和-then异步代码怎么读)
10. [完整链路：点「开始刷题」之后发生了什么](#10-完整链路点开始刷题之后发生了什么)
11. [答题页核心代码逐行解释](#11-答题页核心代码逐行解释)
12. [常见写法速查表](#12-常见写法速查表)

---

## 1. 一个小程序页面到底有哪几个文件

以 **练习配置页** 为例，文件夹 `pages/quiz/setup/` 里有 **4 个文件**，缺一不可：

| 文件 | 作用 | 类比 |
|------|------|------|
| **setup.wxml** | 页面 **结构**（按钮、文字、列表放哪） | 像 HTML |
| **setup.wxss** | 页面 **样式**（颜色、大小、间距） | 像 CSS |
| **setup.js** | 页面 **逻辑**（点击后干什么、怎么请求数据） | 像 JavaScript |
| **setup.json** | 页面 **配置**（标题栏文字等） | 小配置文件 |

**全局还有：**

| 文件 | 作用 |
|------|------|
| `app.js` | 整个小程序启动时运行一次，存全局 token |
| `app.json` | 注册所有页面路径、底部 TabBar |
| `app.wxss` | 全局样式（所有页面共用） |
| `utils/api.js` | 封装「访问服务器」的公共代码 |

> **【截图建议】** 开发者工具左侧文件树展开 `pages/quiz/setup/` 四个文件。

---

## 2. JavaScript 基础语法（本项目必会）

### 2.1 变量：const 和 let

```javascript
const userId = 'abc123';   // const = 常量，后面一般不再改
let bankIndex = 0;         // let = 变量，后面可以改
bankIndex = 1;             // 允许
```

- **作用**：把数据起一个名字，后面反复用。  
- **本项目**：`userId` 表示当前用户 ID；`bankIndex` 表示当前选中的题库是第几个。

### 2.2 对象 `{ }`

```javascript
const payload = {
  userId: 'abc123',
  size: 10,
  difficulty: '3',
};
```

- **含义**：一组 **键值对**，像一张表格。  
- **读取**：`payload.userId` → `'abc123'`；`payload.size` → `10`。  
- **本项目**：发给服务器的参数几乎都是 **对象**，例如创建练习会话时要告诉服务器「谁练、几道题」。

### 2.3 数组 `[ ]`

```javascript
const banks = [
  { name: '数据结构题库', questionCount: 10 },
  { name: 'Web 题库', questionCount: 28 },
];
const first = banks[0];  // 第 1 个元素，下标从 0 开始
```

- **含义**：有序列表。  
- **本项目**：`banks` 是题库列表；`bankNames` 是只存名字的数组，给下拉框显示用。

### 2.4 函数 function

```javascript
function startQuiz() {
  // 点击「开始刷题」时执行的代码
}

// 另一种写法（箭头函数，本项目里也常见）
const onBankChange = (e) => {
  const bankIndex = Number(e.detail.value);
};
```

- **含义**：把一段操作包起来，需要时再 **调用**。  
- **调用**：`startQuiz()` —— 名字后面加括号。  
- **参数**：`function add(a, b) { return a + b; }` —— `a`、`b` 是外面传进来的值。

### 2.5 条件 if

```javascript
if (!userId) {
  wx.showToast({ title: '请先登录', icon: 'none' });
  return;  // 立刻结束函数，后面不再执行
}
```

- **`!userId`**：如果 userId 为空、undefined、''，条件为真。  
- **`return`**：函数到此为止，防止没登录还去请求服务器。

### 2.6 三元表达式（简写 if）

```javascript
const name = user.name || '同学';
```

- **含义**：如果 `user.name` 有值就用它，否则用 `'同学'`。  
- **本项目**：很多地方用 `||` 给 **默认值**，防止显示空白。

### 2.7 解构（从对象里取字段）

```javascript
const { sessionId, submitting } = this.data;
```

- **等价于**：
  ```javascript
  const sessionId = this.data.sessionId;
  const submitting = this.data.submitting;
  ```
- **作用**：少写几行，从页面的 `data` 里一次性取出多个变量。

### 2.8 模板字符串

```javascript
const url = `/pages/quiz/session/session?id=${sessionId}`;
```

- **反引号 `` ` ``** 包起来， **`${sessionId}`** 会把变量值插进字符串。  
- **结果示例**：`/pages/quiz/session/session?id=67890abcdef`

### 2.9 展开运算符 `...`

```javascript
header: {
  'Content-Type': 'application/json',
  ...(token ? { Authorization: 'Bearer ' + token } : {}),
}
```

- **含义**：把右边对象里的键值 **复制** 进左边对象。  
- **这里**：如果有 token，就多加一个 `Authorization` 请求头；没有就不加。

---

## 3. WXML：页面长什么样

以 `setup.wxml` 真实代码为例，**逐块解释**。

### 3.1 最外层容器

```xml
<view class="container">
  ...
</view>
```

| 部分 | 含义 |
|------|------|
| `<view>` | 块级容器，类似 HTML 的 `<div>` |
| `class="container"` | 绑定样式类名，在 wxss 里写 `.container { ... }` |

### 3.2 显示文字

```xml
<view class="sub-title">练习模式</view>
```

- 中间的文字会直接显示在屏幕上。

### 3.3 条件渲染 wx:if / wx:elif / wx:else

```xml
<view wx:if="{{!isLoggedIn}}" class="card">
  <button bindtap="goLogin">去登录</button>
</view>

<block wx:else>
  ... 已登录才显示的内容 ...
</block>
```

| 写法 | 含义 |
|------|------|
| `wx:if="{{!isLoggedIn}}"` | 当 js 里 `data.isLoggedIn` 为 **false** 时，显示这块 |
| `wx:else` | 否则显示另一块 |
| `{{ }}` | **数据绑定**：花括号里写 js 表达式，值来自页面 `data` |

**记忆**：WXML 负责 **长什么样**；**true/false 决定显示哪一块** 在 js 的 `setData` 里改。

### 3.4 按钮与点击事件 bindtap

```xml
<button class="start-btn" bindtap="startQuiz">开始刷题</button>
```

| 部分 | 含义 |
|------|------|
| `bindtap="startQuiz"` | 用户 **点击** 时，调用 setup.js 里 **同名函数** `startQuiz` |
| `loading="{{starting}}"` | 当 `data.starting` 为 true 时，按钮显示转圈加载 |
| `disabled="{{starting}}"` | 为 true 时按钮变灰，防止连点 |

### 3.5 下拉选择 picker

```xml
<picker mode="selector" range="{{bankNames}}" value="{{bankIndex}}" bindchange="onBankChange">
  <view class="picker-value">{{bankNames[bankIndex] || '请选择题库'}}</view>
</picker>
```

| 属性 | 含义 |
|------|------|
| `mode="selector"` | 滚动选择器（单列） |
| `range="{{bankNames}}"` | 选项列表，如 `['全部题库', '数据结构（10题）', ...]` |
| `value="{{bankIndex}}"` | 当前选中第几项（从 0 开始） |
| `bindchange="onBankChange"` | 用户改选项后，调用 js 里的 `onBankChange` |
| `{{bankNames[bankIndex]}}` | 显示当前选中项的文字 |

**js 里对应写法：**

```javascript
onBankChange(e) {
  const bankIndex = Number(e.detail.value);  // e.detail.value 是用户选的第几项
  this.setData({ bankIndex });
}
```

- **`this`**：当前页面实例。  
- **`this.setData({ bankIndex })`**：更新 data，**界面会自动刷新** 显示新选中项。

### 3.6 列表渲染 wx:for（错题列表等处会用）

```xml
<view wx:for="{{items}}" wx:key="id">
  <text>{{item.title}}</text>
</view>
```

| 部分 | 含义 |
|------|------|
| `wx:for="{{items}}"` | 对数组 `items` 每一项循环生成一个 view |
| `wx:key="id"` | 每项唯一标识，帮助小程序高效更新列表 |
| `item` | 默认当前循环项（也可写 `wx:for-item="row"` 改名） |

---

## 4. WXSS：样式怎么写

```css
.container {
  padding: 24rpx;
  background: #f5f7fa;
}

.start-btn {
  background: linear-gradient(135deg, #42a5f5, #1565c0);
  color: #fff;
  border-radius: 999rpx;
}
```

| 概念 | 说明 |
|------|------|
| **rpx** | 响应式像素，750rpx ≈ 屏幕宽度，不同手机自动缩放 |
| **class** | wxml 里 `class="start-btn"` 对应 `.start-btn { }` |
| **#1565c0** | 十六进制颜色，项目主题蓝 |

全局变量在 `app.wxss`：

```css
page {
  --color-primary: #1565c0;
}
```

使用时：`color: var(--color-primary);`

---

## 5. Page 页面：js 里在干什么

每个页面的 js 几乎都以 **`Page({ ... })`** 开头：

```javascript
Page({
  data: {
    isLoggedIn: false,
    banks: [],
    bankIndex: 0,
    starting: false,
  },

  onLoad(options) {
    // 页面第一次打开时执行，options 是 URL 参数
  },

  onShow() {
    // 每次页面显示都会执行（从别的页返回也会）
  },

  startQuiz() {
    // 自定义函数，给 wxml 的 bindtap 调用
  },
});
```

### 5.1 data：页面的「状态仓库」

- **所有要在界面上显示的数据**，都应放在 `data` 里（或能算出来）。  
- **不能直接改**：`this.data.bankIndex = 1` ❌ 界面可能不更新。  
- **正确改法**：`this.setData({ bankIndex: 1 })` ✅

### 5.2 setData 为什么重要

```javascript
this.setData({
  loadingBanks: false,
  banks: list,
  bankNames: names,
});
```

- **作用**：  
  1. 更新 `this.data` 里的值  
  2. **通知微信框架重新渲染 WXML**（该变的字、列表会自动变）  
- **本项目**：请求服务器成功后，几乎都要 `setData` 才能把数据显示出来。

### 5.3 生命周期：onLoad / onShow / onUnload

| 函数 | 何时执行 | 本项目用途 |
|------|----------|------------|
| **onLoad** | 页面第一次创建 | 读 URL 参数 `options.id`（答题页的 sessionId） |
| **onShow** | 每次显示页面 | 刷新登录态、重新拉题库/计划数据 |
| **onUnload** | 页面被关闭 | 清除计时器 `clearTimer()` |

**例子（答题页）：**

```javascript
onLoad(options) {
  const sessionId = options && options.id ? options.id : '';
  // 从 URL /pages/quiz/session/session?id=xxx 里取出 id
  this.setData({ sessionId });
  this.reloadSession();
}
```

---

## 6. require 和 module.exports：怎么引用别的文件

### 6.1 引入别人写好的工具

```javascript
const api = require('../../../utils/api.js');
const authHelper = require('../../../utils/auth-helper.js');
```

| 部分 | 含义 |
|------|------|
| `require('路径')` | 加载另一个 js 文件 **导出的内容** |
| `../../../` | 向上退 3 层目录（从 setup 到 miniprogram 再进 utils） |
| `const api = ...` | 把导出的对象起名叫 `api`，后面用 `api.startQuizSession()` |

### 6.2 导出给别页用

在 `auth-helper.js` 末尾：

```javascript
module.exports = {
  getUserId,
  ensureProfileComplete,
  clearSession,
};
```

- **含义**：这个文件是一个 **模块**，只暴露列出的几个函数。  
- **别页用法**：`authHelper.getUserId()`。

**为什么要这样？**  
同样逻辑（登录、请求服务器）写一次，所有页面共用，避免复制粘贴。

---

## 7. wx 开头的 API：微信提供的工具箱

微信不允许随便用浏览器里的 `fetch`，要用 **`wx.xxx`**。

| API | 作用 | 本项目示例 |
|-----|------|------------|
| **wx.request** | 发 HTTP 请求 | `api.js` 里访问后端 |
| **wx.setStorageSync** | 存数据到手机本地 | 保存 token |
| **wx.getStorageSync** | 读本地数据 | 启动时读 token |
| **wx.showToast** | 底部短提示 | 「打卡成功」 |
| **wx.showLoading** | 全屏加载中 | 「提交中…」 |
| **wx.hideLoading** | 关掉 loading | 请求结束后 |
| **wx.showModal** | 确认对话框 | 考试交卷确认 |
| **wx.navigateTo** | 打开新页面（可返回） | 去答题页 |
| **wx.redirectTo** | 打开新页面（替换当前） | 去结果页 |
| **wx.switchTab** | 跳 Tab 页 | 回首页 |
| **wx.login** | 获取微信登录 code | 成员 B 微信登录用 |

### 7.1 本地存储 token 示例

```javascript
// 登录成功后保存
wx.setStorageSync('token', accessToken);
wx.setStorageSync('userInfo', user);

// 下次打开读取
const token = wx.getStorageSync('token');
```

- **Sync** = 同步，立刻读完/写完（简单好用）。  
- **作用**：用户关掉小程序再打开，仍保持登录（只要 token 没过期）。

---

## 8. 网络请求：怎么跟服务器说话

### 8.1 一次请求包含什么

浏览器/小程序访问 API，本质是：

```
你的小程序  ----HTTP---->  服务器 http://106.55.99.208:5000
              GET 或 POST
              带上 URL、参数、请求头
```

**例子：创建练习**

- **方法**：POST  
- **URL**：`/api/quizzes/session/start`  
- **Body（JSON）**：`{ "userId": "xxx", "size": 10, "bankId": "yyy" }`  
- **Header**：`Authorization: Bearer eyJhbG...`（证明你是谁）

### 8.2 项目里不要直接到处写 wx.request

统一走 `api.js` 的 **request**：

```javascript
function request(url, options = {}) {
  const fullUrl = baseUrl + url;           // 拼完整地址
  const token = getToken();                // 从本地取 token

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: options.method || 'GET',   // 默认 GET
      data: options.data,                // POST 的 body
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? 'Bearer ' + token : '',
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);   // 成功：把服务器返回的 JSON 交给后面
        } else {
          reject(new Error('请求失败'));
        }
      },
      fail(err) {
        reject(err);         // 网络断了等
      },
    });
  });
}
```

**逐行记忆：**

| 代码 | 意思 |
|------|------|
| `Promise` | 表示「将来才会知道结果」的异步操作 |
| `resolve(res.data)` | 成功，把结果交给 `.then()` |
| `reject(err)` | 失败，交给 `.catch()` |
| `statusCode 200` | HTTP 成功（服务器正常处理了） |
| `401` | 未授权，通常 token 过期或没登录 |

### 8.3 封装好的业务函数

```javascript
function startQuizSession(payload) {
  return request('/api/quizzes/session/start', {
    method: 'POST',
    data: payload,
  });
}
```

**页面里只关心业务：**

```javascript
api.startQuizSession({ userId, size: 10 })
  .then((res) => { /* 用 res */ })
  .catch((err) => { /* 提示错误 */ });
```

---

## 9. Promise 和 then：异步代码怎么读

### 9.1 为什么不能「等服务器」

```javascript
// ❌ 错误想象：服务器要 1 秒，代码停 1 秒
const res = api.startQuizSession(payload);  // 实际上 res 不是结果
```

网络请求 **慢**，如果整个小程序卡住等，界面会假死。所以用 **异步**：先发起请求，**过一会儿** 在回调里处理结果。

### 9.2 Promise 链式写法（本项目最常见）

```javascript
api.ensureValidAccessToken()          // 第 1 步：确保 token 有效
  .then(() => api.startQuizSession(payload))  // 第 2 步：创建会话
  .then((res) => {                     // 第 3 步：成功
    const sessionId = res.id || res._id;
    wx.navigateTo({ url: `/pages/quiz/session/session?id=${sessionId}` });
  })
  .catch((err) => {                    // 任一步失败都会进这里
    wx.showToast({ title: err.message || '失败', icon: 'none' });
  })
  .finally(() => {                     // 无论成功失败都执行
    this.setData({ starting: false });
  });
```

**怎么读 `.then` 链：**

1. 从上往下 **按顺序** 执行  
2. 上一步 **成功** → 进入下一个 `.then`  
3. **任何一步失败** → 跳到 `.catch`  
4. `.finally` → 收尾（关 loading、恢复按钮）

### 9.3 Promise.all / Promise.allSettled

**plan 页一次拉多个接口：**

```javascript
Promise.allSettled([
  api.getTodayReviewQuestions(),
  api.getStudyPlanStats(),
  api.getStudyPlans(),
]).then(([reviewRes, statsRes, plansRes]) => {
  // 分别看 status === 'fulfilled' 再取 value
});
```

- **allSettled**：几个请求 **并行** 发出，互不等；有的失败也不影响别的。  
- **作用**：计划页同时要「今日复习数 + 打卡统计 + 计划列表」，一次凑齐。

---

## 10. 完整链路：点「开始刷题」之后发生了什么

用 **序号 + 文件** 串起来（答辩讲流程用）：

```
用户点击「开始刷题」
    ↓
setup.wxml  bindtap="startQuiz"
    ↓
setup.js    startQuiz() 函数开始
    ↓
① authHelper.getUserId()     从本地 userInfo 取用户 ID，没有则 toast
    ↓
② 从 this.data 读取 bankIndex、sizeIndex 等，组装 payload 对象
    ↓
③ wx.setStorageSync(...)     记住用户上次选的题库（偏好）
    ↓
④ this.setData({ starting: true })   按钮进入 loading
    ↓
⑤ api.ensureValidAccessToken()       检查 token，过期则 refresh
    ↓
⑥ api.startQuizSession(payload)      POST 服务器创建会话
    ↓
⑦ 服务器返回 { id: 'sessionId...' }
    ↓
⑧ wx.navigateTo({ url: '.../session?id=...' })   打开答题页
    ↓
session.js  onLoad 读到 options.id
    ↓
⑨ api.getQuizSession(sessionId)      GET 拉取题目列表
    ↓
⑩ setData({ questions, ... })       界面显示第一题
    ↓
用户选题 → answers 对象记录每题答案
    ↓
用户点交卷 → finishPracticeSession()
    ↓
⑪ buildBatchAnswers()  把 answers 转成服务器要的数组
    ↓
⑫ api.submitSessionAnswers(...)     POST 批量提交答案
    ↓
⑬ api.finishQuizSession(...)        POST 结束会话，算分
    ↓
⑭ 服务器写 Record、错题入库 WrongQuestion
    ↓
⑮ showFinishedResult / 跳转 result 页
```

> **【截图建议】** 按这个顺序录演示视频，每一步配 1 句话说明。

---

## 11. 答题页核心代码逐行解释

### 11.1 记录用户选了哪个选项

```javascript
// 简化示例：单选题点某个选项
onSelectOption(e) {
  const index = e.currentTarget.dataset.index;  // wxml 里 data-index="{{idx}}"
  const qid = this.data.currentQuestion.id;     // 当前题目 ID
  this.setData({
    [`answers.${qid}`]: index,
  });
}
```

| 代码 | 解释 |
|------|------|
| `e` | 事件对象，包含「用户点了谁」 |
| `e.currentTarget.dataset.index` | wxml 标签上 `data-index="2"` 传过来的 2 |
| `` [`answers.${qid}`] `` | 动态属性名，等价于 `answers: { '题目ID': 2 }` |
| **结果** | `data.answers` 像 `{ 'q1': 0, 'q2': 3 }` 存每题选的选项下标 |

### 11.2 交卷 finishPracticeSession 逐行

```javascript
finishPracticeSession() {
  if (this.data.submitting) return;
  // 如果已经在提交中，直接 return，防止用户连点两次

  const { sessionId } = this.data;
  const batch = this.buildBatchAnswers();
  // buildBatchAnswers：遍历 questions，把 answers 转成
  // [{ questionId, answerIndex, timeSpentMs }, ...]

  if (!batch.length) {
    wx.showToast({ title: '请至少完成一题', icon: 'none' });
    return;
  }

  this.setData({ submitting: true });
  wx.showLoading({ title: '提交中…', mask: true });

  api.submitSessionAnswers(sessionId, {
    userId: authHelper.getUserId(),
    answers: batch,
  })
    .then(() => api.finishQuizSession(sessionId))
    // 先交答案，再告诉服务器「本场结束」

    .then((result) => {
      this.showFinishedResult({
        totalQuestions: result.total,
        totalCorrect: result.correct,
        acc: result.acc,
      });
    })
    .catch((err) => {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    })
    .finally(() => {
      wx.hideLoading();
      this.setData({ submitting: false });
    });
}
```

### 11.3 quiz-launch.js：一键开练

```javascript
function launchQuizWithIds(questionIds) {
  const ids = (questionIds || []).map((id) => String(id)).filter(Boolean);
  // map：数组每个元素转成字符串
  // filter(Boolean)：去掉空字符串、null

  if (!ids.length) {
    wx.showToast({ title: '暂无可用题目', icon: 'none' });
    return Promise.resolve(false);
  }

  return api.ensureValidAccessToken()
    .then(() => api.startQuizSession({ userId, questionIds: ids }))
    .then((res) => {
      const sessionId = res.id || res._id;
      wx.navigateTo({ url: `/pages/quiz/session/session?id=${sessionId}` });
    });
}
```

- **谁在用**：错题页「开始巩固」、计划页「今日复习」、复习计划「开始今日复习」。  
- **你只需记**：给它 **题目 ID 数组**，它帮你创建会话并跳转答题页。

---

## 12. 常见写法速查表

| 你在 wxml/js 里看到 | 是什么意思 |
|---------------------|------------|
| `{{ xxx }}` | 显示 data.xxx 的值 |
| `wx:if` / `wx:else` | 条件显示 |
| `wx:for` | 循环列表 |
| `bindtap="fn"` | 点击调用 Page 里的 fn 函数 |
| `bindchange` | picker 等控件值变化 |
| `data-xxx="{{}}"` | 给事件传参，在 js 里用 `e.currentTarget.dataset.xxx` 取 |
| `this.data` | 当前页所有数据 |
| `this.setData({})` | 改数据并刷新界面 |
| `this` | 当前页面实例 |
| `require()` | 引入模块 |
| `module.exports` | 导出模块 |
| `.then().catch().finally()` | 异步成功/失败/收尾 |
| `async` 本项目较少 | 多数用 Promise 链 |
| `GET` | 向服务器 **要** 数据 |
| `POST` | 向服务器 **提交** 数据 |
| `Bearer Token` | 登录凭证，放在请求头 |
| `401` | 没登录或 token 过期 |
| `404` | 地址不存在（如旧服务器无 batch 接口） |

---

## 附录：app.js 启动代码在干什么

```javascript
App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: config.BASE_URL,
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
    // 小程序冷启动时，把上次存的 token 放进内存，后面 getToken 更快
  },
});
```

| 概念 | 解释 |
|------|------|
| **App({})** | 整个应用只一个，比 Page 更全局 |
| **globalData** | 全局变量区，任何页面 `getApp().globalData.token` 能读到 |
| **onLaunch** | 用户第一次打开小程序时执行一次 |

---

## 附录：成员 A 建议学习顺序

1. 先看懂 **setup.wxml + setup.js**（一个按钮 + 一个请求）  
2. 再看 **api.js 的 request 和 startQuizSession**  
3. 再看 **session.js 的 finishPracticeSession**  
4. 最后看 **quiz-launch.js、wrong.js、plan.js**  

每看一个文件，在开发者工具 **Console** 里 `console.log(this.data)` 观察数据变化（调试时可临时加，提交前删掉）。

---

## 附录：答辩时怎么用这份文档

老师问「这行代码干什么的」，可以按四句话回答：

1. **在哪**：哪个文件、哪个函数  
2. **触发**：用户什么操作（点击/进入页面）  
3. **做什么**：改 data / 调 API / 跳转页面  
4. **结果**：界面或服务器发生什么变化  

**示例：**  
「`bindtap="startQuiz"` 在 setup.wxml 里绑定开始按钮，点击后执行 setup.js 的 startQuiz，先检查登录，再 POST 创建练习会话，成功后 navigateTo 到答题页。」

---

**文档结束**  
建议与 `成员A-...大作业报告-详细技术版.md` 一起使用：报告负责「交了什么作业」，本文负责「每一行代码什么意思」。
