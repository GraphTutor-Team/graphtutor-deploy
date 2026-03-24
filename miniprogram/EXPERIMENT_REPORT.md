# 小程序实验1 报告要点（可复制到实验1.doc）

## 一、实验目的
- 创建微信小程序项目，配置页面与 tabBar。
- 实现登录功能，并与 GraphTutor Web 端共用后端、同步识别账号。

## 二、实验内容与步骤

### 1. 项目创建与结构
- 在 GraphTutor 项目下新建 `miniprogram` 文件夹，作为小程序代码存放目录。
- 主要文件：`app.js`（入口与全局数据）、`app.json`（全局配置与 tabBar）、`app.wxss`（全局样式）、`project.config.json`（项目配置）。
- 页面：`pages/index`（首页）、`pages/login`（登录）、`pages/user`（我的）。

### 2. 全局配置（app.json）
- **pages**：配置三个页面路径，第一个为首页。
- **window**：设置导航栏标题「GraphTutor」、背景色等。
- **tabBar**：配置底部 tabBar，满足实验要求：
  - 最少 2 个、最多 5 个 tab，本实验配置 2 个（首页、我的）。
  - 每个 tab 包含：pagePath、text、iconPath、selectedIconPath。
  - tabBar 属性：color、selectedColor、backgroundColor、borderStyle。

### 3. 页面与导航
- **首页（index）**：未登录显示「去登录」按钮，已登录显示欢迎语和邮箱；点击「去登录」使用 `wx.navigateTo` 跳转登录页，点击「前往我的」使用 `wx.switchTab` 切换 tab。
- **登录页（login）**：输入邮箱、密码，点击登录调用后端接口；登录成功后使用 `wx.switchTab` 返回首页。
- **我的（user）**：展示当前用户昵称、邮箱、角色，提供「退出登录」。

### 4. 登录与账号同步
- 登录请求：`POST /api/auth/login`，请求体为 `{ email, password }`，与 Web 端使用同一后端、同一套账号。
- 登录成功后保存返回的 `accessToken` 和 `user` 到全局数据与本地存储。
- 之后所有请求在 Header 中携带 `Authorization: Bearer <token>`，实现账号识别。
- 进入首页或「我的」时，若有 token 会请求 `GET /api/auth/me` 拉取最新用户信息并展示，实现与 Web 端账号同步。

### 5. 后端配合
- 后端对请求头 `X-Client: miniprogram` 的请求做了 CSRF 豁免（小程序无法使用 Cookie）。
- 后端 CORS 支持多 origin，便于本地调试。

## 三、实验结果
- 小程序具备首页、登录页、我的页，底部 tabBar 可切换首页与我的。
- 使用与 Web 端相同的邮箱密码可登录，登录后能正确显示用户信息并实现账号同步。

## 四、小结
本实验完成了小程序项目创建、tabBar 配置、页面导航以及登录与账号同步功能，满足「第二节课 实验1」中关于页面、tabBar、登录的常见要求；具体表述可根据你的课程文档（202510006870-冯宏津-实验1.doc）中的题目要求稍作增删。
