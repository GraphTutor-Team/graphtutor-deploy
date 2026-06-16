# 移动 UI 应用开发 — 大作业报告

---

## 封面

| 项目 | 内容 |
|------|------|
| **课程** | 移动 UI 应用开发 |
| **题目** | GraphTutor 智能学习助手小程序 |
| **项目名称** | GraphTutor |
| **专业班级** | （待填写） |
| **学号** | （待填写） |
| **姓名** | （待填写） |
| **指导教师** | （待填写） |
| **项目成员** | 成员 A、成员 B（两人一组，分工见附录 A） |
| **项目时间** | 2026 年 3 月 — 2026 年 6 月 |
| **答辩日期** | 2026 年　　月　　日 |

---

## 一、需求分析与方案

### 1.1 项目背景

随着在线学习与自主刷题需求的增长，学生需要在移动端随时练习、巩固错题并跟踪学习进度。GraphTutor 是一套面向高校学生的智能学习平台，已在 Web 端实现题库练习、错题本、学习计划、好友社交等功能。本大作业在 **微信小程序** 端实现核心学习流程，与现有后端 API 对接，实现「账号互通、数据同步、移动便携」的学习体验。

> **【截图位置：图1】**  
> 小程序首页整体界面（登录后状态，含用户昵称、快捷入口、今日复习提示）。  
> 建议路径：微信开发者工具 → `pages/index/index` 预览截图。

### 1.2 可行性分析

**技术可行性：** 课程已学习微信小程序 WXML、WXSS、JavaScript 及页面生命周期、事件绑定、网络请求等知识。项目采用微信原生小程序框架，通过 `wx.request` 调用 GraphTutor 后端 REST API，技术路线成熟。

**经济可行性：** 开发工具为微信开发者工具（免费），后端部署于已有服务器，无需额外采购软件。

**操作可行性：** 界面采用底部 Tab 导航（首页、练习、计划、错题、我的），符合用户使用习惯；主要操作路径不超过 3 次点击即可开始刷题或查看错题。

### 1.3 总体需求

| 类型 | 描述 |
|------|------|
| 用户角色 | 注册学生用户（与 Web 端共用账号） |
| 核心目标 | 移动端完成练习、错题巩固、计划打卡、基础社交 |
| 运行环境 | 微信客户端 + 微信开发者工具（开发调试） |
| 数据要求 | 与 Web 端共用 MongoDB，登录后数据一致 |

### 1.4 功能模块划分

本小程序按业务划分为五大模块：

1. **账号模块**：邮箱登录、注册、微信快捷登录、完善账号、退出登录  
2. **学习中心模块**：练习模式、考试模式、答题会话、结果页、测验历史  
3. **复习与计划模块**：错题本、复习计划、学习计划、每日打卡、学习统计  
4. **社交模块**：好友管理、私信消息、学习社区、排行榜  
5. **个人中心模块**：我的页入口聚合、笔记、收藏、成就、通知、知识图谱  

> **【截图位置：图2 功能模块结构图】**  
> 建议使用 draw.io / ProcessOn 绘制模块框图后插入，或用手绘扫描。  
> 参考结构：  
> `账号模块 → 首页`；`学习中心 → 练习Tab`；`复习计划 → 计划Tab/错题Tab`；`社交/个人 → 我的页入口`。

### 1.5 整体业务流程

典型用户使用流程如下：

1. 打开小程序 → 检测登录态  
2. 未登录 → 跳转登录页（邮箱或微信）→ 新用户完善账号  
3. 已登录 → 进入首页，查看今日复习与推荐  
4. 选择「练习」→ 选择题库与题量 → 答题 → 交卷 → 查看结果（错题自动入库）  
5. 在「错题」Tab 查看错题 → 按掌握度筛选 → 开始巩固  
6. 在「计划」Tab 查看学习计划 → 开始今日复习 / 每日打卡  
7. 在「我的」进入好友、笔记、统计等扩展功能  

> **【截图位置：图3 整体业务流程图】**  
> 流程图：登录 → 首页 → 练习/错题/计划 → 交卷/打卡 → 统计/社交。

### 1.6 非功能需求

- **界面**：统一主题色 `#1565c0`，卡片式布局，适配不同屏幕宽度（rpx）  
- **安全**：请求头携带 JWT Token，Token 过期自动刷新  
- **兼容**：开发阶段可关闭域名校验；正式上线需配置 HTTPS 合法域名  
- **性能**：首页数据短期缓存，列表分页加载  

---

## 二、项目设计

### 2.1 总体架构设计

系统采用 **前后端分离** 架构：小程序为表现层，GraphTutor Server 为业务与数据层，MongoDB 存储用户、题目、错题、计划等数据。

```
┌─────────────────┐     wx.request + JWT      ┌──────────────────┐
│  微信小程序       │ ────────────────────────► │  GraphTutor API  │
│  miniprogram/   │     X-Client: miniprogram  │  Node.js :5000   │
└────────┬────────┘                            └────────┬─────────┘
         │ wx.login()                                   │
         │         POST /api/auth/mp/login               ▼
         └──────────────────────────────────────► MongoDB
```

> **【截图位置：图4 系统架构图】**  
> 可使用上文 ASCII 重绘为正式架构图，或使用 PPT/draw.io 导出。

### 2.2 目录与页面结构设计

小程序主要目录如下：

```
miniprogram/
├── app.js / app.json / app.wxss    # 入口、TabBar、全局样式
├── utils/
│   ├── api.js                      # 请求封装、登录、Token
│   ├── api-ext.js                  # 扩展 API（好友、笔记、计划等）
│   ├── quiz-launch.js              # 一键开练、复习计划跳转
│   └── auth-helper.js              # 登录态、完善账号检测
└── pages/
    ├── index/          # 首页（Tab）
    ├── practice/       # 练习入口（Tab）
    ├── plan/           # 学习计划（Tab）
    ├── wrong/          # 错题本（Tab）
    ├── user/           # 我的（Tab）
    ├── login/ register/ account-complete/
    ├── quiz/setup/ quiz/session/
    ├── exam/setup/ result/
    └── …（好友、消息、笔记、统计等）
```

**表1 主要页面与 Tab 对应关系**

| Tab / 入口 | 页面路径 | 功能说明 |
|------------|----------|----------|
| 首页 | pages/index/index | 学习概览、快捷入口、通知摘要 |
| 练习 | pages/practice/practice | 跳转练习/考试配置 |
| 计划 | pages/plan/plan | 今日复习、打卡、进行中计划 |
| 错题 | pages/wrong/wrong | 错题列表、掌握度 Tab、开始巩固 |
| 我的 | pages/user/user | 功能菜单聚合、登录态、退出 |
| — | pages/login/login | 邮箱登录、微信快捷登录 |
| — | pages/quiz/session/session | 答题会话页 |
| — | pages/checkin/checkin | 每日打卡 |
| — | pages/friends/friends | 好友与好友请求 |
| — | pages/notes/notes | 学习笔记列表 |

> **【截图位置：图5】**  
> 微信开发者工具左侧「页面路径树」或 `app.json` 中 tabBar 配置界面截图。

### 2.3 界面设计说明

- **导航栏**：全局蓝色 `#1565c0`，标题「GraphTutor」  
- **TabBar**：5 项——首页、练习、计划、错题、我的；选中色与导航栏一致  
- **卡片**：圆角白色卡片 + 浅阴影，用于列表与统计区块  
- **按钮**：主按钮渐变蓝；次要按钮描边样式（`styles/buttons.wxss`）  
- **登录注册**：统一表单样式（`styles/auth-form.wxss`），密码框支持显示/隐藏  

> **【截图位置：图6】**  
> 五个 Tab 各一张缩略图拼成「主要界面一览」（可用开发者工具多页拼图）。

### 2.4 接口设计（与后端对接）

**表2 核心 API 接口列表**

| 接口路径 | 方法 | 功能 | 小程序封装 |
|----------|------|------|------------|
| /api/auth/login | POST | 邮箱密码登录 | api.login() |
| /api/auth/mp/login | POST | 微信 code 登录 | api.loginWithMiniProgram() |
| /api/auth/mp/complete-account | POST | 完善/绑定账号 | api.completeAccount() |
| /api/auth/me | GET | 获取当前用户 | api.getMe() |
| /api/quizzes/session/start | POST | 创建练习会话 | api.startQuizSession() |
| /api/quizzes/session/:id/answers/batch | POST | 批量提交答案 | api.submitSessionAnswers() |
| /api/v3/wrong-questions | GET | 错题列表 | api.getWrongQuestions() |
| /api/v3/study-plans | GET/POST | 学习计划 | api.getStudyPlans() |
| /api/v3/study-plans/:id/check-in | POST | 每日打卡 | apiExt.checkInStudyPlan() |
| /api/v3/review-plans/:id/execute | POST | 执行复习计划 | apiExt.executeReviewPlan() |
| /api/v3/friends | GET | 好友列表 | apiExt.getFriends() |
| /api/v3/notes | GET/POST | 笔记 CRUD | apiExt.getNotes() / createNote() |

请求统一在 `utils/api.js` 的 `request()` 中设置：

- Header：`Authorization: Bearer <token>`  
- Header：`X-Client: miniprogram`  
- BaseURL：`utils/config.js` 中 `BASE_URL`（如 `http://106.55.99.208:5000`）

> **【截图位置：图7】**  
> `utils/config.js` 中 BASE_URL 配置代码截图（可打码敏感信息）。  
> **【截图位置：图8】**  
> `utils/api.js` 中 request 封装核心代码截图（约 15～25 行）。

### 2.5 数据设计说明

小程序端不直连数据库，数据由后端 Mongoose 模型管理。与小程序密切相关的后端模型包括：

**表3 主要数据模型（后端）**

| 模型 | 主要字段 | 说明 |
|------|----------|------|
| User | email, passwordHash, name, learningExp, points | 用户账号 |
| Question | content, options, answerIndex, subjectCode | 题目 |
| WrongQuestion | userId, questionId, masteryStatus, nextReviewAt | 错题本 |
| StudyPlan | userId, name, dailyTarget, stats | 学习计划 |
| StudyCheckIn | userId, planId, date, completedQuestions | 打卡记录 |
| ReviewPlan | userId, strategy, dailyCount | 复习计划 |
| Friendship / FriendRequest | fromUserId, toUserId, status | 好友关系 |
| Note | userId, title, content, type | 学习笔记 |

---

## 三、项目实现

> 本节按模块说明实现思路，并预留效果截图位置。代码实现以「关键逻辑截图」为主，避免大段粘贴源码。

### 3.1 账号模块实现

**实现思路：**

1. `app.js` 启动时从本地存储读取 `token` 与 `userInfo`  
2. 登录页提供邮箱密码与微信快捷登录；微信登录调用 `wx.login` 获取 code 后请求 `/api/auth/mp/login`  
3. 若返回 `needsProfileCompletion: true`，跳转 `account-complete` 页绑定或完善账号  
4. `auth-helper.js` 在 Tab 页 `onShow` 中检测登录与完善状态，未满足则跳转对应页  

**成员分工：** 成员 B 负责（见附录 A）

> **【截图位置：图9】** 登录页（邮箱 + 微信快捷登录按钮）  
> **【截图位置：图10】** 完善账号页（绑定已有账号 / 新注册）  
> **【截图位置：图11】** 代码截图：`pages/login/login.js` 中微信登录逻辑（`loginWithMiniProgram` 调用段）

### 3.2 练习与考试模块实现

**实现思路：**

1. `pages/quiz/setup/setup`：拉取题库列表 `getQuestionBanks()`，用户选择题库与题量  
2. 调用 `api.startQuizSession({ userId, questionIds })` 创建会话，跳转 `quiz/session`  
3. 答题页本地记录选项，交卷时 `submitSessionAnswers()` 批量提交；若后端无 batch 接口则逐条降级  
4. 交卷后跳转 `pages/result/result` 展示得分与正确率  
5. 考试模式 `exam/setup` 增加计时与交卷逻辑，流程与练习类似  

**成员分工：** 成员 A 负责

> **【截图位置：图12】** 练习配置页（选择题库、题量）  
> **【截图位置：图13】** 答题会话页（题目 + 选项 + 进度）  
> **【截图位置：图14】** 结果页（得分、正确率）  
> **【截图位置：图15】** 代码截图：`utils/quiz-launch.js` 中 `launchQuizWithIds` 函数

### 3.3 错题与复习模块实现

**实现思路：**

1. `pages/wrong/wrong`：调用 `getWrongQuestions()`，支持按掌握度 Tab 筛选（待巩固/学习中/已掌握）  
2. 点击「开始巩固」通过 `quiz-launch.launchWrongPractice()` 拉错题 ID 并开练  
3. `pages/review-plans/review-plans`：列表展示复习计划，「开始今日复习」调用 `executeReviewPlan` 获取 `questionIds` 后跳转答题页  
4. 后端 `ReviewPlan.getTodayQuestions()` 按策略（到期/未掌握等）筛选错题  

**成员分工：** 成员 A 负责

> **【截图位置：图16】** 错题 Tab 列表（含掌握度筛选）  
> **【截图位置：图17】** 复习计划页 + 「开始今日复习」按钮  
> **【截图位置：图18】** 代码截图：`utils/quiz-launch.js` 中 `launchReviewPlan` 与 `extractQuestionId`

### 3.4 计划与打卡模块实现

**实现思路：**

1. `pages/plan/plan`：聚合展示今日需复习题数、进行中计划、本周打卡统计  
2. `pages/checkin/checkin`：展示关联计划与最近打卡记录  
3. 打卡调用 `apiExt.checkInStudyPlan(planId, payload)`；若无 active 计划则自动 `createStudyPlan` 默认计划后再打卡  
4. 后端修复打卡路由变量遮蔽问题，保证 `POST .../check-in` 正常返回  

**成员分工：** 成员 A 主导，成员 B 协助联调

> **【截图位置：图19】** 计划 Tab（今日复习、打卡按钮、计划列表）  
> **【截图位置：图20】** 每日打卡页（立即打卡 + 最近打卡记录）  
> **【截图位置：图21】** 代码截图：`pages/checkin/checkin.js` 中 `doCheckIn` 逻辑

### 3.5 社交与个人中心模块实现

**实现思路：**

1. `pages/user/user`：分区展示学习中心、学习工具、学习分析、社交工具入口  
2. `pages/friends/friends`：好友列表 + 收到/发出的请求，支持接受、拒绝  
3. `pages/messages/messages`：会话列表，进入 `chat` 页查看与发送消息  
4. `pages/notes/notes`：笔记列表、详情、新建/编辑  
5. 扩展 API 集中在 `utils/api-ext.js`，与 Web 端 `client/src/api/v3` 对齐  

**成员分工：** 成员 B 负责

> **【截图位置：图22】** 我的页（各功能入口分区）  
> **【截图位置：图23】** 好友页（好友列表 + 待处理请求）  
> **【截图位置：图24】** 笔记列表页  
> **【截图位置：图25】** 代码截图：`pages/user/user.js` 中菜单数据结构（learningCenter / socialTools）

### 3.6 网络与登录态封装

**实现思路：**

- `ensureValidAccessToken()`：请求前检查 Token 是否过期，过期则 `refreshAccessToken()`  
- 401 响应统一清除会话并跳转登录页  
- 所有需登录接口经 `feature-page.requireLogin` 或 `authHelper.ensureProfileComplete` 保护  

> **【截图位置：图26】** 代码截图：`utils/api.js` 中 Token 刷新相关函数

---

## 四、项目调试

### 4.1 测试环境

| 项目 | 配置 |
|------|------|
| 开发工具 | 微信开发者工具 Stable |
| 基础库 | 3.x（以 project.config.json 为准） |
| 后端地址 | http://106.55.99.208:5000 |
| 数据库 | MongoDB（与 Web 共用） |
| 测试账号 | al72886828@gmail.com（自备账号，演示数据通过 seed 脚本导入） |

### 4.2 功能测试用例

**表4 功能测试用例表**

| 编号 | 测试模块 | 测试步骤 | 预期结果 | 实际结果 | 是否通过 |
|------|----------|----------|----------|----------|----------|
| T01 | 登录 | 输入邮箱密码点击登录 | 进入首页，显示用户信息 | （待填写） | ☐ |
| T02 | 微信登录 | 点击微信快捷登录 | 登录成功或跳转完善账号 | （待填写） | ☐ |
| T03 | 练习 | 选择题库开始练习，完成 3 题交卷 | 跳转结果页，显示得分 | （待填写） | ☐ |
| T04 | 错题入库 | 故意答错 1 题后打开错题 Tab | 错题列表中出现该题 | （待填写） | ☐ |
| T05 | 复习计划 | 复习计划页点击「开始今日复习」 | 进入答题页，题目正常显示 | （待填写） | ☐ |
| T06 | 打卡 | 计划页或打卡页点击「今日打卡」 | 提示打卡成功，记录更新 | （待填写） | ☐ |
| T07 | 好友 | 打开好友页 | 显示好友列表或待处理请求 | （待填写） | ☐ |
| T08 | 笔记 | 打开笔记列表 | 显示笔记条目，可进入详情 | （待填写） | ☐ |
| T09 | 统计 | 打开学习统计页 | 显示正确率或趋势数据 | （待填写） | ☐ |
| T10 | 退出 | 我的页退出登录 | 清除登录态，跳转登录 | （待填写） | ☐ |

> **【截图位置：图27】** 测试用例 T03～T04 连续操作截图（练习交卷 + 错题 Tab 对比）。

### 4.3 调试问题与解决方案

**表5 主要问题与解决记录**

| 序号 | 问题描述 | 原因分析 | 解决方法 | 负责成员 |
|------|----------|----------|----------|----------|
| 1 | 每日打卡点击无反应或报错 | 服务端打卡路由中变量名 `checkIn` 与导入函数同名，导致调用失败 | 修改 `studyPlans.js`，将返回值改为 `record` | 成员 A |
| 2 | 复习计划「开始今日复习」无题目 | 错题记录 ID 与题目 ID 混淆；到期策略未匹配空 `nextReviewAt` | 修正 `extractQuestionId`；后端 `ReviewPlan` 策略修复 | 成员 A |
| 3 | 真机预览 request:fail | 未配置合法域名或 BASE_URL 错误 | 开发阶段关闭域名校验；统一 `config.js` 服务器地址 | 成员 B |
| 4 | 微信登录后反复跳转完善页 | `needsProfileCompletion` 未正确更新 | 完善账号成功后刷新 token 与 userInfo | 成员 B |
| 5 | 批量交卷部分服务器失败 | 旧版后端无 batch 接口 | `submitSessionAnswers` 404 时降级逐条提交 | 成员 A |

> **【截图位置：图28】** 打卡成功 Toast + 最近打卡列表（验证问题 1 已修复）  
> **【截图位置：图29】** 开发者工具 Network 面板一次成功 API 请求（可选）

### 4.4 演示数据导入（联调辅助）

为便于答辩演示好友、笔记、错题等模块，项目提供一键导入脚本 `server/scripts/seed-user-demo.js`，向**已有账号**导入演示数据（不创建、不修改用户密码）：

```bash
docker compose exec \
  -e SEED_TARGET_EMAIL=你的邮箱 \
  server node scripts/seed-user-demo.js
```

导入内容包括：演示好友、笔记、错题、计划、打卡、通知、私信等。

---

## 五、项目总结

### 5.1 实现思路与流程回顾

本项目以 **GraphTutor 学习平台** 为背景，在小程序端实现「登录 → 练习 → 错题 → 计划 → 打卡 → 统计/社交」的完整闭环。技术上采用微信原生小程序 + RESTful API，通过统一的 `api.js` 封装网络与鉴权，通过 Tab + 我的页菜单组织功能。两人分工上，成员 A 侧重学习中心与答题流程，成员 B 侧重账号、社交与个人中心，并行开发后在接口层联调。

### 5.2 项目优点

1. **功能较完整**：覆盖练习、考试、错题、计划、打卡、好友、笔记等，超出基础课程 demo 水平  
2. **前后端分离**：真实对接远程 API，具备实际部署与联调经验  
3. **与 Web 数据同步**：同一账号多端一致，体现完整系统设计  
4. **代码结构清晰**：utils 分层、页面四件套、样式复用便于维护  

### 5.3 不足与改进方向

1. 部分页面 UI 仍可进一步统一美化  
2. 消息模块以 REST 拉取为主，实时性弱于 WebSocket 方案  
3. 正式上架需 HTTPS 域名与微信审核配置  
4. 离线刷题、推送提醒等尚未实现  

### 5.4 收获与体会

（此处由每位同学结合自己分工撰写 150～300 字，示例方向如下，提交时请改写为个人真实体会。）

**成员 A 示例方向：** 通过练习与错题模块开发，掌握了小程序页面跳转、异步请求链式调用与答题状态管理；在调试打卡与复习计划过程中加深了对前后端联调的理解。

**成员 B 示例方向：** 通过登录与社交模块开发，熟悉了微信登录流程、Token 机制与登录态拦截；在完善账号与好友请求功能中体会到接口设计与用户体验的平衡。

---

## 六、演示视频操作脚本（待录制）

> 视频命名：`项目演示视频`（一组一份，建议 3～5 分钟）。  
> 录制工具：微信开发者工具「真机预览」录屏，或 OBS 录开发者工具窗口。

| 时间 | 操作步骤 | 画面要点 |
|------|----------|----------|
| 0:00–0:25 | 开场介绍项目名称与成员分工 | 首页或标题页 |
| 0:25–0:50 | 展示登录（邮箱或微信） | 登录页 → 登录成功 |
| 0:50–1:40 | 练习流程：选题库 → 答 2～3 题 → 交卷 → 结果 | setup → session → result |
| 1:40–2:20 | 打开错题 Tab，展示错题；进入复习计划并开始复习 | wrong → review-plans → session |
| 2:20–2:50 | 计划 Tab：今日打卡；打开打卡记录页 | plan → checkin |
| 2:50–3:20 | 我的页：好友、笔记或统计任选 2 项展示 | user → friends / notes |
| 3:20–3:40 | 总结一句话：已实现功能与后端同步 | 回到首页 |
| 3:40–4:00 | 结束 | 项目 Logo 或封面 |

**录制注意：** 提前用测试账号登录；确保网络可访问后端；关闭无关通知；操作流畅、语速适中。

---

## 附录 A  两人分工说明（项目制作）

| 分工 | 成员 | 主要职责 | 主要页面/文件 | 工作量占比 |
|------|------|----------|---------------|------------|
| **成员 A** | （姓名待填） | **学习中心**：练习、考试、答题、结果、错题、计划、打卡、复习计划、统计 | `pages/practice/`、`quiz/`、`exam/`、`wrong/`、`plan/`、`checkin/`、`review-plans/`、`statistics/`；`utils/quiz-launch.js`、`api.js` 练习相关 | 约 50% |
| **成员 B** | （姓名待填） | **账号与社交**：登录注册、完善账号、我的页、好友、消息、笔记、社区、通知；UI 样式 | `pages/login/`、`register/`、`account-complete/`、`user/`、`friends/`、`messages/`、`notes/`、`community/`；`utils/auth-helper.js`、`api-ext.js` 社交相关；`styles/auth-form.wxss` | 约 50% |

**共同完成：** `app.json` Tab 配置、`utils/config.js` 后端地址、联调测试、大作业报告、演示视频、答辩讲解。

**协作接口：** 成员 A 的答题/错题模块依赖成员 B 的登录态；成员 B 的「我的页」菜单跳转至成员 A 的功能页。约定 API 封装规范后并行开发，每周联调 1 次。

---

## 附录 B  提交材料清单（自查）

| 序号 | 材料 | 命名 | 状态 |
|------|------|------|------|
| 1 | 项目源代码 | 项目源代码/ | ☐ |
| 2 | 演示视频 | 项目演示视频.mp4 | ☐ |
| 3 | 大作业报告 | 学号-姓名-《移动UI应用开发》大作业报告.pdf | ☐ |
| 4 | 评分表 | 学号-姓名-《移动UI应用开发》大作业评分表.xlsx | ☐ |
| 5 | 答辩 PPT | 答辩PPT（本次暂不提交） | — |

---

## 附录 C  截图清单汇总（共 29 处，提交前逐项替换）

| 编号 | 位置说明 |
|------|----------|
| 图1 | 首页（登录后） |
| 图2 | 功能模块结构图（自绘） |
| 图3 | 整体业务流程图（自绘） |
| 图4 | 系统架构图（自绘） |
| 图5 | 开发者工具页面结构 / app.json |
| 图6 | 五 Tab 界面一览 |
| 图7 | config.js BASE_URL |
| 图8 | api.js request 封装 |
| 图9 | 登录页 |
| 图10 | 完善账号页 |
| 图11 | login.js 微信登录代码 |
| 图12 | 练习配置页 |
| 图13 | 答题页 |
| 图14 | 结果页 |
| 图15 | quiz-launch.js 代码 |
| 图16 | 错题 Tab |
| 图17 | 复习计划页 |
| 图18 | launchReviewPlan 代码 |
| 图19 | 计划 Tab |
| 图20 | 打卡页 |
| 图21 | checkin.js 代码 |
| 图22 | 我的页 |
| 图23 | 好友页 |
| 图24 | 笔记列表 |
| 图25 | user.js 菜单代码 |
| 图26 | Token 刷新代码 |
| 图27 | 测试连续操作 |
| 图28 | 打卡成功验证 |
| 图29 | Network 请求（可选） |

---

**报告结束**

> 转 PDF 说明：将本 Markdown 复制到 Word，按考核要求设置宋体五号、1.5 倍行距、首行缩进 2 字符；插入截图后导出 PDF。封面单独排版。
