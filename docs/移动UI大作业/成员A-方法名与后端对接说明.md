# 成员 A — 方法名、页面与后端对接说明

> 面向 **学习中心模块**（练习 / 考试 / 答题 / 错题 / 计划 / 打卡 / 复习 / 统计）。  
> 配合报告《成员A-…大作业报告.md》与《成员A-零基础代码精读教程.md》使用。

---

## 0. 零基础：`onShow`、`wx.xxx` 是什么？（成员 A 用到的）

小程序里有两类「方法名」容易混在一起：

1. **页面生命周期** — 微信规定名字，到点自动调用（如 `onShow`）
2. **wx 开头** — 微信提供的系统能力（跳转、弹窗、存本地、发网络请求）
3. **自己起的名字** — 如 `loadData`、`startQuiz`（在 wxml 里 `bindtap="startQuiz"` 绑定）

下面只列 **成员 A 学习中心** 实际出现的。

### 0.1 一个页面长什么样？

每个页面目录有四个文件：

| 文件 | 作用 |
|------|------|
| `xxx.js` | **逻辑**：数据、函数、调 API |
| `xxx.wxml` | **结构**：按钮、文字、列表（类似 HTML） |
| `xxx.wxss` | **样式**：颜色、间距 |
| `xxx.json` | **配置**：标题等 |

`xxx.js` 里用 `Page({ ... })` 注册页面，大括号里写数据和函数：

```javascript
Page({
  data: { loading: true, list: [] },   // 界面要显示的数据
  onShow() { this.loadData(); },        // 生命周期：页面显示时
  loadData() { ... },                   // 自定义：自己起的函数名
});
```

- **`this.data`**：当前页面上显示用的数据（只读，改要用 `setData`）
- **`this.setData({ loading: false })`**：改数据并刷新界面（A 的所有页面都会用）

---

### 0.2 生命周期方法（名字固定，不能乱改）

微信在特定时刻**自动调用**这些函数，你不用手动调用它们。

| 方法名 | 什么时候触发 | 成员 A 里干什么 |
|--------|--------------|-----------------|
| **`onLoad(options)`** | 页面**第一次**打开 | 读 URL 参数。如 `session.js` 读 `options.id` 得到 sessionId；`result.js` 读分数参数 |
| **`onShow()`** | 每次页面**显示**（含从子页返回） | **最常用**：`requireLogin` → `loadData()` 拉后端数据。practice / wrong / plan / checkin / statistics / history / review-plans / graph / exam/setup 都有 |
| **`onUnload()`** | 页面被关闭/销毁 | `session.js`：清除考试倒计时 `timer`，防止内存泄漏 |
| **`onReady()`** | 页面首次渲染完成 | A 的页面基本没用（可答辩时说「本项目未使用」） |
| **`onHide()`** | 页面切到后台 | A 的页面基本没用 |

**为什么老看到 `onShow`？**  
Tab 页（练习/计划/错题）切回来、从答题页返回，都会再触发 `onShow`，所以适合 **刷新列表、重新拉数据**。

**典型写法（plan.js / wrong.js）：**

```javascript
onShow() {
  featurePage.requireLogin(this, () => this.loadData());
},
```

含义：先检查登录 → 登录有效再执行 `loadData` 请求服务器。

---

### 0.3 `wx.xxx` — 微信提供的 API（成员 A 用到的）

不能把小程序当普通网页，很多能力必须用 **`wx.`** 前缀。

#### 导航（跳页面）

| API | 作用 | A 里举例 |
|-----|------|----------|
| **`wx.navigateTo`** | 打开**新**页面，可点左上角返回 | 去答题页、去练习配置、去登录 |
| **`wx.redirectTo`** | 打开新页面并**替换**当前页（不能返回） | 交卷后去结果页、去回顾模式 |
| **`wx.switchTab`** | 跳到底部 **Tab** 页 | 回「练习」Tab、去「错题」Tab |

```javascript
wx.navigateTo({ url: '/pages/quiz/session/session?id=' + sessionId });
wx.switchTab({ url: '/pages/practice/practice' });
```

#### 本地存储（记住登录）

| API | 作用 | A 里举例 |
|-----|------|----------|
| **`wx.getStorageSync(key)`** | **同步读取**本地缓存 | 读 `token`、读练习偏好 `PREFS_KEY` |
| **`wx.setStorageSync(key, val)`** | **同步写入**本地缓存 | 保存上次选的题库、题量 |
| **`wx.removeStorageSync(key)`** | 删除 | 退出登录时清 token（在 auth-helper 里） |

登录后 token 存本地，下次打开不用重新登录。

#### 提示与加载（用户反馈）

| API | 作用 | A 里举例 |
|-----|------|----------|
| **`wx.showToast`** | 底部短提示 1～2 秒 | 「打卡成功」「请选择题库」「提交失败」 |
| **`wx.showLoading`** | 全屏「加载中」 | 「提交中…」「准备题目…」「创建计划…」 |
| **`wx.hideLoading`** | 关闭 loading | 请求结束后必须调用 |
| **`wx.showModal`** | 中间确认框（确定/取消） | **考试交卷前**：「确定要交卷吗？」 |

Toast 的 `icon`：`success` 有勾，`none` 纯文字。

#### 界面与网络

| API | 作用 | A 里举例 |
|-----|------|----------|
| **`wx.setNavigationBarTitle`** | 改顶部标题 | session：「考试中」「练习结果」「逐题回顾」 |
| **`wx.request`** | 发 HTTP 请求 | **不直接在页面写**，统一封装在 `utils/api.js` 的 `request()` 里 |

#### A 没用但答辩可能问到的

| API | 作用 |
|-----|------|
| `wx.login` | 微信登录拿 code — **成员 B** 登录页用，A 不用 |
| `wx.navigateBack` | 返回上一页 — A 较少用（多用 switchTab / redirectTo） |

---

### 0.4 wxml 里常见绑定（和方法名对应）

| wxml 写法 | 含义 |
|-----------|------|
| `bindtap="startQuiz"` | 点击 → 调用 js 里 `startQuiz()` |
| `bindinput="onInput"` | 输入框内容变化 → `onInput(e)`，`e.detail.value` 是文字 |
| `wx:if="{{loading}}"` | 数据 loading 为 true 才显示这块 |
| `wx:for="{{list}}"` | 循环 list，每一项是 `item` |
| `data-id="{{item.id}}"` | 把 id 传给事件，js 里 `e.currentTarget.dataset.id` 取出 |

---

### 0.5 成员 A 各页：生命周期 + 主要自定义函数

| 页面 | 生命周期 | 主要自定义函数（自己起的名） |
|------|----------|------------------------------|
| practice | `onShow` | `loadSummary`、`goSetup`、`continueSession`、各 `launchXxx` 快捷练 |
| quiz/setup | `onLoad`、`onShow` | `loadBanks`、`startQuiz`、`savePrefs` |
| quiz/session | `onLoad`、`onUnload` | `loadSession`、`onSelectOption`、`submit`、`confirmSubmitExam` |
| exam/setup | `onShow` | `loadBanks`、`startExam` |
| result | `onLoad` | `goReview`、`goHistory`、`retryExam` |
| wrong | `onShow` | `loadData`、`onMarkMastered`、`onPracticeWrong` |
| plan | `onShow` | `loadData`、`onCheckIn`、`onCreateDefaultPlan` |
| checkin | `onShow` | `loadData`、`onCheckIn`、`onCreatePlan` |
| review-plans | `onShow` | `loadData`、`onStartReview`、`onCreatePlan` |
| statistics | `onShow` | `loadData` |
| history | `onShow` | `loadData`、`openReview` |
| graph | `onShow` | `loadData`、`reload` |

**工具文件里的自定义函数**（不是生命周期）：

| 文件 | 函数 | 一句话 |
|------|------|--------|
| feature-page.js | `requireLogin` | 检查 token，没登录显示「去登录」 |
| quiz-launch.js | `launchTodayReview` 等 | 拉题 → `startQuizSession` → `navigateTo` 答题页 |
| page-api.js | `fetchPlanSummary` 等 | 一次请求多个 API，拼成 Tab 页摘要 |
| api.js | `request`、`startQuizSession`… | 真正访问 `106.55.99.208:5000` |

---

### 0.6 串起来：点「开始练习」发生了什么？

```
用户点击按钮（wxml bindtap="startQuiz"）
  → setup.js 的 startQuiz() 运行
  → wx.showToast 若未选题库
  → api.ensureValidAccessToken() 检查登录
  → api.startQuizSession(...) 内部 wx.request POST 后端
  → 成功：wx.navigateTo 打开 session 页
  → session.js onLoad 读到 id
  → session.js loadSession → api.getQuizSession
  → 用户答题，改 this.data.answers
  → 点交卷：wx.showModal 确认 → wx.showLoading
  → api.submitSessionAnswers + finishQuizSession
  → wx.hideLoading → wx.redirectTo 结果页
```

---

## 1. 页面 ↔ 主体功能

### 1.1 底部 Tab（最常用）

| Tab | 目录 | 主体功能 |
|-----|------|----------|
| 练习 | `pages/practice/` | 快捷入口：继续未完成会话、今日复习、推荐题、错题巩固 |
| 计划 | `pages/plan/` | 今日复习数、学习计划、一键打卡、创建默认计划 |
| 错题 | `pages/wrong/` | 错题列表、掌握度 Tab、标记掌握、单题再练 |

### 1.2 子页面

| 目录 | 主体功能 |
|------|----------|
| `pages/quiz/setup/` | 选学科 / 题库 / 题量，创建练习会话 |
| `pages/quiz/session/` | **答题核心页**：选题、填空、交卷、考试计时 |
| `pages/exam/setup/` | 考试模式：计时 + 题量，创建会话 |
| `pages/result/` | 交卷后展示得分（读 URL 参数或本地数据） |
| `pages/checkin/` | 打卡记录列表、打卡、创建计划 |
| `pages/review-plans/` | 复习计划列表、创建计划、执行今日复习 |
| `pages/statistics/` | 综合分析与学习趋势图表 |
| `pages/history/` | 已完成的测验会话历史 |
| `pages/graph/` | 知识图谱热力图、路径推荐（扩展） |

### 1.3 公共工具文件（非页面，但 A 必用）

| 文件 | 职责 |
|------|------|
| `utils/config.js` | 服务器地址 `BASE_URL`、是否虚拟登录 |
| `utils/api.js` | 统一 HTTP 请求、登录态、测验 / 错题 / 计划等 API |
| `utils/api-ext.js` | v3 扩展 API（复习计划、打卡、学科树、标记掌握等） |
| `utils/quiz-launch.js` | **一键开练**：拉题 ID → `startQuizSession` → 跳 session |
| `utils/quiz-helper.js` | 题目渲染、选项、判题、组装交卷 payload |
| `utils/page-api.js` | 计划 / 错题 / 练习 Tab 首页汇总数据 |
| `utils/auth-helper.js` | `getUserId`、`ensureProfileComplete`、登出 |
| `utils/feature-page.js` | `requireLogin`：页面 onShow 时检查登录 |

---

## 2. 如何连接后端

### 2.1 配置（唯一必改处）

`miniprogram/utils/config.js`：

```javascript
const USE_VIRTUAL_LOGIN = false;                    // false = 连真服务器
const BASE_URL = 'http://106.55.99.208:5000';       // GraphTutor API 根地址
```

### 2.2 请求链路

```
页面 xxx.js
  → api.xxx() 或 apiExt.xxx() 或 quizLaunch.xxx()
    → api.ensureValidAccessToken()   // 过期则 refresh
    → api.request(url, { method, data })
      → wx.request({
           url: BASE_URL + '/api/...',
           header: {
             Authorization: 'Bearer <token>',
             X-Client: 'miniprogram',
           }
         })
  → 服务器 server/src/routes/...
  → MongoDB（与 Web 共用）
```

### 2.3 登录态相关方法（`api.js` + `auth-helper.js`）

| 方法名 | 所在文件 | 作用 |
|--------|----------|------|
| `getToken()` | api.js | 读本地 JWT |
| `saveTokens(access, refresh)` | api.js | 登录成功后写入 storage |
| `clearSession()` | api.js / auth-helper.js | 退出登录，清空 token |
| `ensureValidAccessToken()` | api.js | 发请求前保证 token 有效 |
| `refreshAccessToken()` | api.js | 401 时用 refreshToken 换新 token |
| `getUserId()` | auth-helper.js | 从 userInfo 取当前用户 `_id` |
| `ensureProfileComplete()` | auth-helper.js | 未完善资料则跳转完善页 |

---

## 3. 核心 API 方法名 ↔ 后端接口

### 3.1 练习 / 考试 / 交卷（`utils/api.js`）

| 方法名 | HTTP | 后端路径 | 用途 |
|--------|------|----------|------|
| `getQuestionBanks(params)` | GET | `/api/questions/banks` | 练习/考试配置页拉题库列表 |
| `startQuizSession(payload)` | POST | `/api/quizzes/session/start` | 创建答题会话（传 userId、bankId/size 或 questionIds） |
| `getQuizSession(sessionId, reveal)` | GET | `/api/quizzes/session/:id` | 答题页加载题目（reveal 复习模式显示解析） |
| `submitQuizAnswer(sessionId, payload)` | POST | `/api/quizzes/session/:id/answer` | 单题提交（降级用） |
| `submitQuizAnswersBatch(sessionId, payload)` | POST | `/api/quizzes/session/:id/answers/batch` | 批量交卷 |
| `submitSessionAnswers(sessionId, payload)` | 封装 | 先 batch，失败再逐条 `submitQuizAnswer` | session.js 交卷入口 |
| `finishQuizSession(sessionId)` | POST | `/api/quizzes/session/:id/finish` | 结束会话、算分 |
| `isBatchSubmitUnavailable(err)` | — | — | 判断 batch 接口是否不可用 |

**典型调用页：** `quiz/setup.js`、`exam/setup.js` → `startQuizSession`；`quiz/session.js` → `getQuizSession` + `submitSessionAnswers` + `finishQuizSession`。

### 3.2 错题（`utils/api.js` + `api-ext.js`）

| 方法名 | HTTP | 后端路径 | 用途 |
|--------|------|----------|------|
| `getWrongQuestions(params)` | GET | `/api/v3/wrong-questions` | 错题列表（可筛 masteryStatus） |
| `getWrongQuestionStats()` | GET | `/api/v3/wrong-questions/stats` | 总数 / 未掌握 / 学习中 / 已掌握 |
| `markWrongQuestionMastered(questionId)` | api-ext | PUT `/api/v3/wrong-questions/:id/master` | 标记已掌握 |

**典型调用页：** `wrong/wrong.js`、`page-api.js` 的 `fetchWrongSummary`。

### 3.3 计划 / 打卡（`utils/api.js` + `api-ext.js`）

| 方法名 | HTTP | 后端路径 | 用途 |
|--------|------|----------|------|
| `getStudyPlans(params)` | GET | `/api/v3/study-plans` | 学习计划列表 |
| `createStudyPlan(data)` | POST | `/api/v3/study-plans` | 新建计划 |
| `getStudyPlanStats()` | GET | `/api/v3/study-plans/stats` | 打卡天数、连续天数、题量 |
| `defaultStudyPlanPayload()` | api-ext | — | 生成默认计划 JSON（本地） |
| `checkInStudyPlan(planId, payload)` | api-ext | POST `/api/v3/study-plans/:id/check-in` | 每日打卡 |
| `getAllCheckIns(params)` | api-ext | GET `/api/v3/study-plans/check-ins` | 打卡历史 |

**典型调用页：** `plan/plan.js`、`checkin/checkin.js`。

### 3.4 复习（`utils/api.js` + `api-ext.js`）

| 方法名 | HTTP | 后端路径 | 用途 |
|--------|------|----------|------|
| `getTodayReviewQuestions(params)` | GET | `/api/v3/smart-review/today` | 今日待复习题目 |
| `getReviewPlans(params)` | api-ext | GET `/api/v3/review-plans` | 复习计划列表 |
| `createReviewPlan(data)` | api-ext | POST `/api/v3/review-plans` | 创建复习计划 |
| `defaultReviewPlanPayload()` | api-ext | — | 默认复习计划模板 |
| `executeReviewPlan(planId)` | api-ext | POST `/api/v3/review-plans/:id/execute` | 执行计划，返回今日复习题 ID |

**典型调用页：** `review-plans/review-plans.js`、`page-api.js`、`home-api.js`。

### 3.5 统计 / 首页数据（`utils/api.js` + `page-api.js`）

| 方法名 | HTTP | 后端路径 | 用途 |
|--------|------|----------|------|
| `getComprehensiveAnalysis(days)` | GET | `/api/v3/enhanced-analytics/comprehensive` | 效率分、正确率等 |
| `getLearningTrend(days)` | GET | `/api/analytics/trend` | 学习趋势 |
| `getRecommendedQuestions(params)` | GET | `/api/v3/recommendations/questions` | 首页 / 练习页推荐题 |
| `fetchPlanSummary()` | page-api | 组合多个 API | 计划 Tab 汇总 |
| `fetchWrongSummary()` | page-api | 组合多个 API | 错题 Tab 汇总 |
| `fetchPracticeSummary()` | page-api | 组合多个 API | 练习 Tab 汇总 |
| `fetchGraphSummary()` | page-api | 组合 API | 图谱页汇总 |

**典型调用页：** `statistics/statistics.js`、`plan/plan.js`、`practice/practice.js`、`wrong/wrong.js`。

### 3.6 学科 / 题库 / 历史（`api-ext.js` + `api.js`）

| 方法名 | 用途 |
|--------|------|
| `getSubjectTree()` | 学科树（setup 筛选用） |
| `flattenSubjects(tree, out)` | 把树拍平成列表 |
| `getQuestionBankDetail(id)` | 单个题库详情 |
| `listQuizSessions(params)` | 未完成 / 已完成会话（practice、history） |

---

## 4. 一键开练方法（`utils/quiz-launch.js`）

| 方法名 | 做什么 | 谁调用 |
|--------|--------|--------|
| `extractQuestionId(item)` | 从错题/复习项里取出题目 ID | 内部 |
| `launchQuizWithIds(questionIds)` | 用指定 ID 列表创建会话并跳答题页 | 内部总入口 |
| `launchTodayReview()` | 拉今日复习题 → 开练 | practice |
| `launchRecommendedPractice(limit)` | 拉推荐题 → 开练 | practice |
| `launchWrongPractice(options)` | 拉错题 ID → 开练 | practice、wrong |
| `launchSingleQuestion(questionId)` | 单题再练 | practice、wrong |
| `launchDailyChallenge()` | 每日挑战 | practice |
| `launchFavoritePractice(folderId)` | 收藏夹练习 | favorites（扩展） |
| `launchPathPractice(nodeKey, limit)` | 按知识点路径练 | graph |
| `launchReviewPlan(planId)` | 执行复习计划 → 开练 | review-plans、plan |

**内部固定流程：** `authHelper.getUserId()` → `api.ensureValidAccessToken()` → `api.startQuizSession({ userId, questionIds })` → `wx.navigateTo` session 页。

---

## 5. 答题页工具方法（`utils/quiz-helper.js`）

| 方法名 | 作用 |
|--------|------|
| `stripHtml(text)` | 去掉 HTML 标签，显示纯文本题干 |
| `normalizeQuestionId(q)` | 统一题目 ID 字段 |
| `normalizeOptions(question)` | 解析选择题选项 |
| `getSelectedAnswer(answersMap, questionId)` | 读某题已选答案 |
| `toggleAnswer(prev, index, type)` | 点选项：单选/多选切换 |
| `buildFillBlanks(question, selected)` | 填空题输入框数据 |
| `hasValidSelection(type, selected)` | 是否已作答（交卷前校验） |
| `selectionHint(type)` | 未作答时的提示文案 |
| `buildAnswerPayload(question, selected, userId)` | 组装一条交卷记录给 API |
| `isCorrectOption(question, index)` | 复习模式判断对错 |
| `typeLabel(type)` / `optionLabel(index)` | 显示「单选题」「A/B/C」 |

**典型调用页：** `quiz/session/session.js` 几乎全部交互都经过 quiz-helper。

---

## 6. 各页面主要方法名（Page 内）

小程序每个页面是一个 `Page({ ... })` 对象，下面是 **成员 A 页面** 里常见的方法名及含义。

| 页面 | 方法名 | 含义 |
|------|--------|------|
| **通用** | `onLoad(options)` | 页面第一次打开，读 URL 参数 |
| | `onShow()` | 每次显示（含从子页返回），常在这里 `loadData` |
| | `loadData()` / `reload()` | 拉后端数据刷新界面 |
| **practice.js** | `goSetup()` | 跳练习配置 |
| | `continueSession()` | 继续未完成会话 |
| | `onQuickReview()` 等 | 调 `quizLaunch.launchXxx` |
| **quiz/setup.js** | `loadBanks()` | 拉题库 |
| | `startQuiz()` | `startQuizSession` 并跳转 |
| **quiz/session.js** | `loadSession()` | `getQuizSession` |
| | `onSelectOption()` | 记录选项 |
| | `submit()` / `confirmSubmitExam()` | 交卷（Modal 确认后 `submitSessionAnswers`） |
| | `buildBatchPayload()` | 用 quiz-helper 组装答案数组 |
| **wrong.js** | `loadData()` | 错题 + 统计 |
| | `onMarkMastered()` | `markWrongQuestionMastered` |
| | `onPracticeWrong()` | `launchWrongPractice` |
| **plan.js** | `onCheckIn()` | `checkInStudyPlan` |
| | `onCreateDefaultPlan()` | `createStudyPlan(defaultStudyPlanPayload())` |
| **review-plans.js** | `onStartReview()` | `launchReviewPlan` |
| | `onCreatePlan()` | `createReviewPlan` |
| **statistics.js** | `loadData()` | `getComprehensiveAnalysis` + `getLearningTrend` |
| **feature-page.js** | `requireLogin(page, onReady)` | 未登录 / token 失效时拦截 |

---

## 7. 一条完整练习的方法调用顺序

```
1. setup.js  → startQuizSession({ userId, bankId, size })
2. session.js → getQuizSession(sessionId)
3. 用户点选项 → toggleAnswer / buildFillBlanks（仅本地 data.answers）
4. session.js → buildAnswerPayload × N → submitSessionAnswers
5. session.js → finishQuizSession(sessionId)
6. redirectTo result 页
7. 后端自动写入错题本 → wrong.js 下次 getWrongQuestions 可见
```

---

## 8. 与成员 B 的边界（答辩用）

| 模块 | 主要方法文件 | 示例方法 |
|------|--------------|----------|
| **A 学习中心** | api.js、quiz-*、page-api | `startQuizSession`、`getWrongQuestions`、`checkInStudyPlan` |
| **B 账号社交** | api.js 登录段、api-ext 社交段 | `loginWithMiniProgram`、`searchUsers`、`sendMessage` |

公共层 **`api.request`**、**`ensureValidAccessToken`** 两人共用。

---

## 9. 答辩 30 秒版

> 我负责学习中心。页面在 practice、quiz、wrong、plan 等目录；业务上通过 `api.js` 和 `api-ext.js` 的方法访问 `BASE_URL` 对应 REST 接口，JWT 放在 Authorization 头；开练统一走 `quiz-launch.js` 的 `launchXxx` 系列，最终都调用 `startQuizSession`；答题页用 `quiz-helper` 处理选项与交卷 payload，交卷调用 `submitSessionAnswers` 和 `finishQuizSession`，数据与 Web 共用 MongoDB。

---

## 10. 相关文档

- `成员A-学号-姓名-《移动UI应用开发》大作业报告.md` — 正式报告
- `成员A-零基础代码精读教程.md` — 逐行代码讲解
- `大作业配图-架构与流程图.md` — 图2/3/4 模块与流程图
- `docs/部署运维-DEPLOYMENT.md` — 服务器与 `config.js` 地址
