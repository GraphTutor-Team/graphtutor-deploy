# 移动 UI 应用开发 — 大作业报告（成员 A · 详细技术版）

> **成员 A 负责：学习中心模块**（练习 / 考试 / 答题 / 错题 / 计划 / 打卡 / 复习 / 统计）  
> **搭档：成员 B** 负责账号与社交。两人共用 GraphTutor 小程序项目 `miniprogram/`。  
> **若不懂 WXML / JS / API 等基础语法**，请先阅读同目录 **`成员A-零基础代码精读教程.md`**（逐行解释 + 完整点击链路）。

---

## 封面

| 项目 | 内容 |
|------|------|
| **课程** | 移动 UI 应用开发 |
| **题目** | GraphTutor 智能学习助手小程序 |
| **学号** | （待填写） |
| **姓名** | （成员 A 待填） |
| **项目成员** | 成员 A（本人）、成员 B（姓名待填） |
| **本人分工** | 学习中心全流程开发与联调 |
| **答辩日期** | 2026 年　　月　　日 |

---

# 第一部分  技术体系说明

## 1.1 用到的技术一览

**表1 技术栈总表**

| 层次 | 技术 | 在本项目中的作用 |
|------|------|------------------|
| 运行平台 | 微信小程序 | 移动端载体，微信内免安装使用 |
| 视图层 | **WXML** | 页面结构（类似 HTML） |
| 样式层 | **WXSS** | 页面样式（类似 CSS，支持 rpx 适配） |
| 逻辑层 | **JavaScript (ES6+)** | 页面逻辑、事件、网络请求 |
| 配置 | **JSON** | `app.json` 页面路由、TabBar、窗口样式 |
| 网络 | **wx.request** | HTTP 调用 GraphTutor REST API |
| 存储 | **wx.setStorageSync** | 本地保存 Token、用户偏好 |
| 导航 | **wx.navigateTo / switchTab** | 页面跳转 |
| 后端 | Node.js + Express + MongoDB | 题库、错题、计划等业务（已有） |
| 鉴权 | **JWT Bearer Token** | 登录后访问需授权接口 |
| 协作 | Git | 与成员 B 分工提交代码 |

> **【截图位置：图1】** 微信开发者工具整体界面（模拟器 + 编辑器 + 调试器）。

## 1.2 微信小程序核心概念（课程知识点对应）

| 概念 | 说明 | 本项目示例 |
|------|------|------------|
| **Page 页面** | 每个页面由 js/json/wxml/wxss 四文件组成 | `pages/quiz/session/session.*` |
| **data 数据驱动** | `setData` 更新视图 | 答题页 `currentQuestion`、`answers` |
| **生命周期** | `onLoad` 接参数、`onShow` 刷新 | plan 页 `onShow` 拉计划数据 |
| **事件绑定** | `bindtap`、`bindchange` | 选题库 picker、提交按钮 |
| **列表渲染** | `wx:for` | 错题列表、选项列表 |
| **条件渲染** | `wx:if / wx:elif` | 加载中 / 错误 / 正常内容 |
| **TabBar** | 底部固定导航，最多 5 项 | 首页/练习/计划/错题/我的 |
| **模块化** | `require` 引入工具 | `require('../../utils/api.js')` |

## 1.3 项目目录结构（成员 A 相关）

```
miniprogram/
├── app.js                 # 全局 App，globalData: token/userInfo
├── app.json               # 页面注册 + TabBar（A 负责练习/计划/错题 Tab）
├── app.wxss               # 全局 CSS 变量 --color-primary
├── utils/
│   ├── config.js          # ★ BASE_URL 后端地址
│   ├── api.js             # ★ 请求封装、练习/错题/计划 API
│   ├── api-ext.js         # 复习计划、打卡扩展 API
│   ├── quiz-launch.js     # ★ 一键开练（A 编写/维护）
│   ├── quiz-helper.js     # 题目类型、判分辅助
│   ├── page-api.js        # 计划页/错题页聚合数据
│   ├── page-session.js    # 登录态页面加载模板
│   └── auth-helper.js     # 登录检测（B 编写，A 调用）
└── pages/
    ├── practice/          # 练习 Tab 入口
    ├── quiz/setup/        # ★ 练习配置
    ├── quiz/session/      # ★ 答题会话（核心）
    ├── exam/setup/        # ★ 考试配置
    ├── result/            # 结果页
    ├── wrong/             # ★ 错题 Tab
    ├── plan/              # ★ 计划 Tab
    ├── checkin/           # ★ 打卡
    ├── review-plans/      # ★ 复习计划
    ├── statistics/        # 学习统计
    └── history/           # 测验历史
```

---

# 第二部分  开发环境与联调教程

## 2.1 环境准备（Step by Step）

### 步骤 1：安装微信开发者工具

1. 打开 [微信公众平台 → 开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 下载 Stable 版  
2. 安装后用微信扫码登录  

> **【截图位置：图2】** 开发者工具登录成功界面。

### 步骤 2：导入项目

1. 打开开发者工具 → **导入项目**  
2. 目录选择：`GraphTutor/miniprogram`  
3. AppID：使用 `project.config.json` 中配置的 AppID（或使用测试号）  
4. 点击「导入」  

### 步骤 3：配置后端地址

编辑 `miniprogram/utils/config.js`：

```javascript
const USE_VIRTUAL_LOGIN = false;
const BASE_URL = 'http://106.55.99.208:5000';  // 改成你的服务器地址
```

### 步骤 4：开发阶段关闭域名校验

1. 开发者工具右上角 **详情**  
2. **本地设置** → 勾选 **不校验合法域名、web-view、TLS 版本…**  
3. 否则真机/模拟器请求 HTTP IP 会报 `url not in domain list`  

> **【截图位置：图3】** 「不校验合法域名」勾选位置。

### 步骤 5：先由成员 B 完成登录

成员 A 的 Tab 页依赖 Token。调试流程：

1. 成员 B 完成登录页 → 用邮箱 `al72886828@gmail.com` 登录  
2. 确认 Storage 中有 `token`（调试器 → Storage）  
3. 再调试练习/错题/计划模块  

> **【截图位置：图4】** Application → Storage 中 token 字段。

## 2.2 网络请求封装教程（utils/api.js）

### 2.2.1 设计思路

所有 API 经统一 `request()` 发出，自动附加：

- Header：`Authorization: Bearer <accessToken>`  
- Header：`X-Client: miniprogram`  
- 401 时清除会话并提示重新登录  

### 2.2.2 核心代码说明（答辩可讲）

```javascript
// 伪代码结构（实际见 utils/api.js）
function request(url, options) {
  const token = wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client': 'miniprogram',
      },
      success(res) {
        if (res.statusCode === 401) { /* 跳转登录 */ }
        resolve(res.data);
      },
      fail: reject,
    });
  });
}
```

> **【截图位置：图5】** `utils/api.js` 中 request 函数代码截图（15～30 行）。  
> **【截图位置：图6】** Network 面板一次成功的 `/api/quizzes/session/start` 请求（含 Request Headers）。

### 2.2.3 Token 刷新

请求前调用 `api.ensureValidAccessToken()`：

1. 读本地 `token`、`tokenExpiresAt`  
2. 若快过期 → `POST /api/auth/refresh` 换新 Token  
3. 再发业务请求  

**教程要点：** 成员 A 所有「开始练习」「拉错题」入口，链式调用都以 `ensureValidAccessToken()` 开头。

---

# 第三部分  功能实现教程（成员 A 模块）

## 3.1 练习配置页（quiz/setup）

### 3.1.1 功能说明

用户选择题库、学科、难度、题量 → 点击「开始练习」→ 创建会话 → 跳转答题页。

### 3.1.2 用到的 UI 组件

| 组件 | 用途 |
|------|------|
| `<picker mode="selector">` | 题库/题量/难度/学科下拉 |
| `<button bindtap="startQuiz">` | 开始练习 |
| `wx.showLoading` | 创建会话等待 |

### 3.1.3 实现步骤教程

**Step 1 — onShow 检查登录**

```javascript
onShow() {
  if (!authHelper.ensureProfileComplete()) return;
  this.checkLoginAndLoad();
}
```

**Step 2 — 加载题库列表**

```javascript
api.ensureValidAccessToken()
  .then(() => api.getQuestionBanks({ limit: 100 }))
  .then((banks) => {
    // 填入 data.banks、bankNames 供 picker 显示
  });
```

接口：`GET /api/v3/banks`

**Step 3 — 用户点击开始练习**

```javascript
const payload = {
  userId,
  size: 10,              // 题量
  bankId: '...',         // 可选
  subjectCode: 'CS-DS',  // 可选
  difficulty: '3',       // 可选
};
api.startQuizSession(payload).then((res) => {
  const sessionId = res.id || res._id;
  wx.navigateTo({ url: `/pages/quiz/session/session?id=${sessionId}` });
});
```

接口：`POST /api/quizzes/session/start`

**Step 4 — 偏好记忆**

用 `wx.setStorageSync('gt_quiz_setup_prefs', {...})` 记住上次选题，提升体验。

> **【截图位置：图7】** 练习配置页完整 UI。  
> **【截图位置：图8】** setup.js 中 startQuiz 函数代码截图。

---

## 3.2 答题会话页（quiz/session）— 核心

### 3.2.1 页面数据模型

| 字段 | 含义 |
|------|------|
| `sessionId` | 会话 ID（onLoad 从 url 参数 `id` 获取） |
| `questions` | 题目数组 |
| `currentIndex` | 当前题号 |
| `answers` | `{ questionId: 用户答案 }` |
| `submitting` | 防重复提交 |
| `examMode` | 是否考试模式（计时） |

### 3.2.2 实现步骤教程

**Step 1 — 加载会话**

```javascript
onLoad(options) {
  this.setData({ sessionId: options.id });
  this.reloadSession();
}

reloadSession() {
  api.getQuizSession(sessionId).then((session) => {
    // 解析 session.questions → setData
    this.renderCurrentQuestion();
  });
}
```

接口：`GET /api/quizzes/session/:id`

**Step 2 — 用户选择选项**

```javascript
onSelectOption(e) {
  const index = e.currentTarget.dataset.index;
  const qid = this.data.currentQuestion.id;
  this.setData({ [`answers.${qid}`]: index });
}
```

**Step 3 — 交卷（练习模式）**

```javascript
finishPracticeSession() {
  const batch = this.buildAnswerBatch(); // [{ questionId, answerIndex, timeSpentMs }, ...]
  api.submitSessionAnswers(sessionId, { userId, answers: batch })
    .then(() => api.finishQuizSession(sessionId))
    .then(() => {
      wx.redirectTo({ url: `/pages/result/result?sessionId=${sessionId}` });
    });
}
```

接口：

- `POST /api/quizzes/session/:id/answers/batch`（批量提交）  
- 失败 404 时 `api.js` 自动 **降级逐条** `POST .../answer`  
- `POST /api/quizzes/session/:id/finish`（结束会话）

**Step 4 — 错题自动入库（后端）**

交卷后服务端 `recordSideEffects` 会把答错题目写入 `WrongQuestion` 集合，小程序无需额外调用。

> **【截图位置：图9】** 答题页（题目+选项+进度条）。  
> **【截图位置：图10】** 交卷后结果页。  
> **【截图位置：图11】** session.js 中 finishPracticeSession 代码截图。

### 3.2.3 考试模式差异（exam/setup → session?exam=1）

- URL 带 `exam=1&limitMin=30`  
- `onLoad` 启动 `setInterval` 计时器  
- 时间到或手动交卷走 `submitExam()`  
- 同样批量提交 + finish  

> **【截图位置：图12】** 考试模式顶部计时显示（若有）。

---

## 3.3 一键开练工具（utils/quiz-launch.js）

### 3.3.1 为什么单独封装

错题 Tab、计划 Tab、复习计划页都需要：**拿一组 questionId → 创建 session → 跳转答题**。避免重复代码，统一由 `launchQuizWithIds(ids)` 处理。

### 3.3.2 教程：如何从新入口增加「开始练习」

```javascript
// 1. 在页面 js 顶部
const quizLaunch = require('../../utils/quiz-launch.js');

// 2. 按钮事件
onStartReview() {
  quizLaunch.launchTodayReview();      // 今日复习
  // 或
  quizLaunch.launchWrongPractice({ limit: 20, masteryStatus: 'unmastered' });
  // 或
  quizLaunch.launchReviewPlan(planId);
}
```

### 3.3.3 extractQuestionId 说明

错题列表返回的是 **WrongQuestion 文档**，真正题目 ID 在 `questionId` 字段，不能误用 `_id`：

```javascript
function extractQuestionId(item) {
  if (item.questionId != null && item.questionId !== '') {
    return String(item.questionId);
  }
  return String(item._id || '');
}
```

> **【截图位置：图13】** quiz-launch.js 全文或 launchQuizWithIds 截图。

---

## 3.4 错题本 Tab（pages/wrong）

### 3.4.1 功能说明

- 展示错题总数、待巩固/学习中/已掌握统计  
- Tab 切换筛选 `masteryStatus`  
- 「开始巩固」调用 `launchWrongPractice`  

### 3.4.2 实现教程

**Step 1 — 聚合数据（page-api.js）**

```javascript
Promise.allSettled([
  api.getWrongQuestionStats(),
  api.getWrongQuestions({ limit: 20, masteryStatus }),
])
```

**Step 2 — WXML 列表**

```xml
<view wx:for="{{items}}" wx:key="id" bindtap="openItem">
  <text>{{item.title}}</text>
  <text>错误 {{item.errorCount}} 次</text>
</view>
```

**Step 3 — 切换掌握度 Tab**

```javascript
onTabChange(e) {
  const key = e.currentTarget.dataset.key;
  this.setData({ masteryTab: key });
  this.loadList({ masteryStatus: key || undefined });
}
```

接口：`GET /api/v3/wrong-questions?masteryStatus=unmastered`

> **【截图位置：图14】** 错题 Tab 全貌（含掌握度 Tab）。  
> **【截图位置：图15】** 点击「开始巩固」进入答题页连贯截图。

---

## 3.5 计划 Tab 与打卡（plan / checkin）

### 3.5.1 计划页数据流

```
onShow → pageSession.loadAuthenticatedPage
       → pageApi.fetchPlanSummary()
       → 并行请求：
            getTodayReviewQuestions  → todayReviewCount
            getStudyPlanStats        → 打卡天数/连续天
            getStudyPlans            → activePlans
       → setData 刷新界面
```

### 3.5.2 今日复习

```javascript
startTodayReview() {
  quizLaunch.launchTodayReview();
}
```

内部：`GET /api/v3/smart-review/today` → 取 questionIds → `launchQuizWithIds`

### 3.5.3 打卡教程

```javascript
doCheckIn() {
  if (!activePlanId) {
    // 无计划：先 createStudyPlan(defaultStudyPlanPayload())
    return this.createDefaultPlan().then(() => this.doCheckIn());
  }
  apiExt.checkInStudyPlan(activePlanId, {
    completedQuestions: 0,
    correctQuestions: 0,
    mood: 'normal',
    summary: '小程序打卡',
  });
}
```

接口：`POST /api/v3/study-plans/:id/check-in`

**联调记录：** 曾遇服务端变量名 `checkIn` 遮蔽函数导致失败，已修复（见第四部分）。

> **【截图位置：图16】** 计划 Tab（今日复习数 + 打卡按钮）。  
> **【截图位置：图17】** 打卡页 + Toast「打卡成功」。  
> **【截图位置：图18】** plan.js 中 doCheckIn 代码截图。

---

## 3.6 复习计划页（review-plans）

### 3.6.1 流程

1. `GET /api/v3/review-plans` 列表  
2. 点击「开始今日复习」→ `POST /api/v3/review-plans/:id/execute`  
3. 响应中 `questionIds` → `launchQuizWithIds`  

### 3.6.2 无计划时

可调用 `apiExt.createReviewPlan(apiExt.defaultReviewPlanPayload())` 创建默认计划。

> **【截图位置：图19】** 复习计划列表 + 开始按钮。

---

## 3.7 学习统计（statistics）

调用 `api.getComprehensiveAnalysis()`、`getLearningTrend()` 等，用简单列表或数字展示正确率、做题量。

> **【截图位置：图20】** 统计页截图。

---

# 第四部分  项目调试教程

## 4.1 常用调试手段

| 工具 | 用途 | 操作 |
|------|------|------|
| **Console** | 看 log / 报错 | 调试器 → Console |
| **Network** | 看 API 请求/响应 | 调试器 → Network |
| **Storage** | 看 token | 调试器 → Storage |
| **AppData** | 看页面 data | 调试器 → AppData |
| **真机预览** | 测真机网络 | 预览 → 扫码 |

## 4.2 常见问题排查表

| 现象 | 可能原因 | 解决方法 |
|------|----------|----------|
| request:fail domain | 未配合法域名 | 开发期关闭域名校验 |
| 401 未授权 | Token 过期 | 重新登录；检查 ensureValidAccessToken |
| 创建练习失败 | 未登录/题库空 | 先登录；服务器 seed 演示题库 |
| 错题 Tab 空 | 尚未答错题 | 故意错一题再交卷 |
| 打卡失败 | 后端 bug / 无计划 | 修复路由；自动创建默认计划 |
| 复习计划无题 | questionId 提取错 | 用 quiz-launch.extractQuestionId |

## 4.3 功能测试用例（成员 A）

**表2 测试用例**

| 编号 | 模块 | 步骤 | 预期 | 实际 | 通过 |
|------|------|------|------|------|------|
| A01 | 练习 | 选 10 题练习并交卷 | 结果页显示分数 | （待填） | ☐ |
| A02 | 错题 | 错 1 题后看错题 Tab | 出现该题 | （待填） | ☐ |
| A03 | 巩固 | 错题页点开始巩固 | 进入答题 | （待填） | ☐ |
| A04 | 计划 | 开始今日复习 | 有题可答 | （待填） | ☐ |
| A05 | 打卡 | 点击今日打卡 | 成功提示 | （待填） | ☐ |
| A06 | 复习计划 | 执行计划 | 跳转 session | （待填） | ☐ |
| A07 | 考试 | 限时交卷 | 结果正确 | （待填） | ☐ |

> **【截图位置：图21】** Network 中一次失败的请求 + Console 报错（调试过程留证，可选）。  
> **【截图位置：图22】** 修复后打卡成功（对比图，可选）。

---

# 第五部分  需求与设计（小组共同 · 精简）

## 5.1 项目背景

GraphTutor 学习平台小程序端，实现移动刷题与错题巩固，与 Web 共用账号与 MongoDB。

## 5.2 成员分工

| 成员 | 模块 |
|------|------|
| **A（本人）** | 练习、考试、答题、错题、计划、打卡、复习、统计 |
| **B** | 登录、我的、好友、消息、笔记、社区、UI 样式 |

## 5.3 架构图

```
[微信小程序] --wx.request/JWT--> [GraphTutor API :5000] --> [MongoDB]
```

> **【截图位置：图23】** 自绘架构图或功能模块图（标注 A/B 分工颜色）。

---

# 第六部分  项目总结（成员 A 个人）

## 6.1 实现成果

完成学习中心 **7 条主路径**：练习配置→答题→结果；错题列表→巩固；计划→今日复习；打卡；复习计划执行；考试计时；统计查看。

## 6.2 技术收获（请改写为个人话，200～400 字）

（模板，提交前必改）

通过本次开发，我系统实践了微信小程序 **Page 生命周期、数据绑定、picker 组件、Promise 链式请求** 等课程知识。在 `quiz/session` 答题页中，理解了如何用 `setData` 驱动视图、如何用对象存储多题答案；在 `api.js` 封装中掌握了 JWT 鉴权与 Token 刷新；在联调阶段学会用 **Network 面板** 定位 401/404/500 错误。与成员 B 分工协作：B 保证登录态，A 保证业务 Tab 数据正确，每周联调一次。遇到打卡接口与服务端 review 计划策略两类 bug，通过阅读后端路由与日志完成修复。今后可继续优化统计图表与答题动画体验。

## 6.3 不足与展望

- 统计页图表可引入 ec-canvas 或 uCharts  
- 答题页可增加「标记不确定」功能  
- 正式上架需 HTTPS 与微信合法域名配置  

---

# 第七部分  演示视频脚本（成员 A 负责片段）

| 时间 | 操作 | 讲解词参考 |
|------|------|------------|
| 0:50–1:40 | 练习 setup → session → result | 「成员 A 负责练习模块，选择题库后开始答题，交卷后自动写入错题本。」 |
| 1:40–2:10 | 错题 Tab → 开始巩固 | 「错题按掌握度分类，一键重新练习。」 |
| 2:10–2:40 | 计划 Tab → 今日复习 / 打卡 | 「计划页聚合复习与打卡，与后端学习统计同步。」 |
| 2:40–3:00 | 复习计划 execute | 「复习计划按策略拉取到期错题。」 |

---

# 附录 A  成员 A 负责 API 速查表

| 功能 | 方法 | 路径 | 封装函数 |
|------|------|------|----------|
| 题库列表 | GET | /api/v3/banks | getQuestionBanks |
| 创建会话 | POST | /api/quizzes/session/start | startQuizSession |
| 获取会话 | GET | /api/quizzes/session/:id | getQuizSession |
| 批量答题 | POST | .../answers/batch | submitSessionAnswers |
| 结束会话 | POST | .../finish | finishQuizSession |
| 错题列表 | GET | /api/v3/wrong-questions | getWrongQuestions |
| 今日复习 | GET | /api/v3/smart-review/today | getTodayReviewQuestions |
| 学习计划 | GET | /api/v3/study-plans | getStudyPlans |
| 创建计划 | POST | /api/v3/study-plans | createStudyPlan |
| 打卡 | POST | /api/v3/study-plans/:id/check-in | checkInStudyPlan |
| 复习计划 | GET/POST | /api/v3/review-plans | getReviewPlans / executeReviewPlan |

---

# 附录 B  截图清单（成员 A 共 23 处）

| 编号 | 内容 |
|------|------|
| 图1 | 开发者工具全貌 |
| 图2 | 工具登录 |
| 图3 | 不校验合法域名 |
| 图4 | Storage token |
| 图5 | api.js request 代码 |
| 图6 | Network 成功请求 |
| 图7 | 练习配置页 |
| 图8 | setup startQuiz 代码 |
| 图9 | 答题页 |
| 图10 | 结果页 |
| 图11 | finishPracticeSession 代码 |
| 图12 | 考试计时（可选） |
| 图13 | quiz-launch.js 代码 |
| 图14 | 错题 Tab |
| 图15 | 巩固练习连贯操作 |
| 图16 | 计划 Tab |
| 图17 | 打卡成功 |
| 图18 | plan doCheckIn 代码 |
| 图19 | 复习计划页 |
| 图20 | 统计页 |
| 图21 | 调试报错（可选） |
| 图22 | 修复对比（可选） |
| 图23 | 架构/模块图（自绘） |

---

**报告结束 · 成员 A 详细技术版**  
> 导出 Word/PDF 时：宋体五号、1.5 倍行距、首行缩进 2 字符；图片居中并在下方标注图号。
