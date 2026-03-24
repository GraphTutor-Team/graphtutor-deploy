# GraphTutor 微信小程序

支持**虚拟登录**（默认，无需后端）与**真实后端登录**切换；接后端时只需改一处配置。

## 功能说明

- **首页**：未登录时引导去登录；已登录显示欢迎语、邮箱、状态与角色。
- **登录**：邮箱 + 密码；当前为虚拟登录，任意输入即可进入；接后端后改为请求 `POST /api/auth/login`。
- **我的**：展示头像首字、昵称、邮箱、角色与账号 ID，支持退出登录。
- **账号同步**：接后端后，请求头携带 `Authorization: Bearer <token>`，可调用 `GET /api/auth/me` 同步用户信息。

## 接后端：只需改一处

在 **`utils/config.js`** 中：将 `USE_VIRTUAL_LOGIN` 改为 `false`，将 `BASE_URL` 改为你的 GraphTutor 后端地址。无需改 `api.js` 逻辑，已根据 config 自动走虚拟或真实请求。

## 实验报告要点（满足「第二节课 实验1」常见要求）

1. **项目结构**
   - `app.js`：入口，全局存储 `token`、`userInfo`、`baseUrl`。
   - `app.json`：全局配置、页面路径、`window`、`tabBar`（首页、我的，含 icon 与选中态）。
   - `pages/index`：首页；`pages/login`：登录页；`pages/user`：我的。
   - `utils/api.js`：封装 `wx.request`，统一 baseUrl、Bearer token、`X-Client: miniprogram` 头。

2. **tabBar 配置**
   - 在 `app.json` 的 `tabBar` 中配置了 2 个 tab（最少 2 个、最多 5 个）。
   - 每个 tab 包含：`pagePath`、`text`、`iconPath`、`selectedIconPath`。
   - 使用 `color`、`selectedColor`、`backgroundColor`、`borderStyle` 等属性。

3. **页面与导航**
   - 首页 → 未登录可点击「去登录」跳转至登录页（`wx.navigateTo`）；登录后可「前往我的」切换 tab（`wx.switchTab`）。
   - 登录页为普通页面，登录成功后 `wx.switchTab` 到首页。
   - tabBar 页面：首页、我的。

4. **登录与账号同步**
   - 登录：调用后端 `POST /api/auth/login`，传入 `email`、`password`。
   - 将返回的 `accessToken`（或 `token`）和 `user` 存入 `globalData` 与 `wx.setStorageSync`。
   - 后续请求在 header 中携带 `Authorization: Bearer <token>`，实现与 Web 端同一账号的识别与同步。
   - 进入首页/我的时，若有 token 会请求 `GET /api/auth/me` 拉取最新用户信息并展示。

5. **与后端协作**
   - 后端对带请求头 `X-Client: miniprogram` 的请求做了 CSRF 豁免（小程序无法使用 Cookie 双提交）。
   - 后端 CORS 已支持多 origin，可按需设置 `MINIPROGRAM_ORIGIN` 等环境变量。

## 本地运行

1. **后端**
   - 在项目根目录下启动 GraphTutor 后端（如 `cd server && npm run dev`），确保 `PORT=5000` 或与下面 `baseUrl` 一致。

2. **小程序**
   - 用微信开发者工具打开本目录（`miniprogram`）。
   - 在「详情」→「本地设置」中勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**（本地开发用）。
   - 若后端不在本机，修改 `app.js` 中 `globalData.baseUrl` 为你的本机 IP（如 `http://192.168.x.x:5000`），确保手机与电脑在同一局域网时可访问。

3. **tabBar 图标**
   - 当前 `images/` 下为占位小图。如需更好效果，可替换为 81×81 像素的 PNG（`tab-home.png`、`tab-home-active.png`、`tab-user.png`、`tab-user-active.png`）。

## 目录结构

```
miniprogram/
├── app.js
├── app.json
├── app.wxss
├── project.config.json
├── sitemap.json
├── images/           # tabBar 图标
├── pages/
│   ├── index/        # 首页
│   ├── login/        # 登录
│   └── user/         # 我的
└── utils/
    ├── config.js     # 【接后端改这里】USE_VIRTUAL_LOGIN、BASE_URL
    └── api.js        # 请求封装，login/getMe 已预留后端逻辑
```

## 作业文档说明

若实验要求来自 `202510006870-冯宏津-实验1.doc`，因该文件为二进制 .doc 格式，无法在此直接解析。请根据任课教师给出的实验要求逐条对照上述「实验报告要点」补充或删减内容；本小程序已覆盖常见「实验1」要求：创建小程序、配置 tabBar、页面导航、登录页及与后端账号同步。
