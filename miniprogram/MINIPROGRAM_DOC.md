# GraphTutor 小程序 — 技术说明与更新指南

本文档记录当前用到的组件、技术栈和配置，便于后续维护与扩展。**有更新时请同步改此文件。**

---

## 一、目录结构

```
miniprogram/
├── app.js                 # 入口，globalData: token / userInfo / baseUrl
├── app.json               # 全局配置、pages、window、tabBar
├── app.wxss               # 全局样式与 CSS 变量
├── project.config.json    # 微信开发者工具项目配置
├── sitemap.json
├── images/                # tabBar 图标（81×81 PNG）
├── pages/
│   ├── index/             # 首页（tabBar）
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── login/             # 登录页（非 tabBar）
│   │   ├── login.js
│   │   ├── login.json
│   │   ├── login.wxml
│   │   └── login.wxss
│   └── user/              # 我的（tabBar）
│       ├── user.js
│       ├── user.json
│       ├── user.wxml
│       └── user.wxss
└── utils/
    ├── config.js          # 【接后端/改模式只改这里】USE_VIRTUAL_LOGIN、BASE_URL
    └── api.js             # 请求封装、login / loginWithAvatar / getMe
```

---

## 二、使用的组件（WXML）

| 组件 | 用途 |
|------|------|
| **view** | 布局容器（页面结构、卡片、行） |
| **text** | 纯文本（状态、角色等） |
| **image** | 头像展示（微信选择头像、首页/我的头像） |
| **input** | 登录页昵称（`type="nickname"` 可获取微信昵称）、手机号/学校/年级选填 |
| **picker** | 登录页性别（mode="selector"） |
| **button** | 登录/去登录/退出；`open-type="chooseAvatar"` 选择头像；`open-type="getPhoneNumber"` 授权手机号 |

---

## 三、使用的 API 与能力

| 能力 / API | 用途 |
|------------|------|
| **wx.getStorageSync / wx.setStorageSync** | 持久化 token、userInfo（虚拟登录） |
| **wx.getFileSystemManager().saveFile()** | 将选择头像的临时路径存为持久路径 |
| **wx.navigateTo** | 跳转至登录页（非 tabBar） |
| **wx.switchTab** | 切换 tab（首页 ↔ 我的）、登录成功后回首页 |
| **wx.showToast** | 登录成功、已退出等提示 |
| **open-type="chooseAvatar"** + **bindchooseavatar** | 调起微信选头像，获取临时路径 |
| **input type="nickname"** | 昵称输入，可由微信填充昵称 |
| **open-type="getPhoneNumber"** + **bindgetphonenumber** | 授权获取手机号（返回 code，需后端解密；部分环境返回 phoneNumber） |
| **wx.login** | 登录时获取 code，接后端可换 openid/session_key |

---

## 三点一、图库资源配置（新增）

- 统一图库配置文件：`utils/image-library.js`
- 当前已接入免费图库源（商城、首页、通讯录动态、练习/计划/图谱/错题页 banner 均可使用）：
  - `https://images.unsplash.com`
  - `https://images.pexels.com`
  - `https://cdn.pixabay.com`
- 说明：
  - 页面图片都保留本地 `fallback`，当线上图失败时会自动回退本地图标。
  - 上线前需要在小程序后台配置以上域名到 `downloadFile/image` 合法域名。

---

## 四、技术要点

- **配置与模式**：`utils/config.js` 中 `USE_VIRTUAL_LOGIN`、`BASE_URL` 控制虚拟登录或接后端。
- **请求封装**：`utils/api.js` 提供 `request`、`login`、`loginWithAvatar`、`getMe`；请求头带 `X-Client: miniprogram`、`Authorization: Bearer <token>`（接后端时用）。
- **全局状态**：`App.globalData` 存 token、userInfo、baseUrl；各页在 `onShow` 中同步登录态与展示数据（如 `userFirstChar`）。
- **样式**：`app.wxss` 用 CSS 变量（如 `--color-primary`、`--radius-sm`）统一主题；页面用 rpx、flex 做适配。
- **导航**：`app.json` 中 `pages`、`window`、`tabBar`（首页 + 我的，含 icon）。

---

## 五、接后端时修改位置

| 位置 | 说明 |
|------|------|
| **utils/config.js** | `USE_VIRTUAL_LOGIN = false`，`BASE_URL = '你的后端根地址'`（如 `https://api.xxx.com` 或 `http://192.168.x.x:5000`） |
| **utils/api.js** | 无需改逻辑；若后端有「小程序专用登录」接口，可在 `loginWithAvatar` 中改为先 `wx.login` 取 code 再请求该接口 |
| **后端** | 对请求头 `X-Client: miniprogram` 做 CSRF 豁免；CORS 允许小程序请求来源 |

---

## 六、tabBar 图标资源（iconfont 三套 zip）

从 iconfont 下载的压缩包用途如下（解压后文件名可能略有差异，以实际为准）：

| 压缩包 | 内容 | 用途 |
|--------|------|------|
| **icon_ebd74bn8zis.zip** / **icon_owrcjwoavs.zip** | 同名 **PNG**（如 `shouye.png`、`guanxitu.png`、`rili.png`、`wode.png`） | 生成 **81×81** 的 `tab-*.png`，供 **tabBar** 使用 |
| **icon_cufz2qo4fir.zip** | 同名 **SVG** | 可整包放到 `images/iconfont/` 等目录，在页面里用 `<image src="...">` 引用（tabBar 仍须用 PNG） |

**脚本**：

- **`scripts/import_iconfont_png.py`**：从本机解压目录读取上述 PNG（脚本内可改路径），缩放为 81×81，写入 `images/tab-home*.png`、`tab-practice*.png`、`tab-plan*.png`、`tab-user*.png`。未选中/选中若包内为单色，可暂用同一图；需要不同选中色时请从 iconfont 再导出「选中色」PNG 后替换 `*-active.png`。
- **`scripts/split_tab_icons.py`**：若使用 Gemini 等 **2×4 图集**，可从图集裁切出 8 张 tab 图标。

---

## 七、后续更新时可改的点

- **新增页面**：在 `app.json` 的 `pages` 中增加路径，新建对应 `pages/xxx/` 四件套（js/json/wxml/wxss）。
- **新增 tab**：在 `app.json` 的 `tabBar.list` 中增加一项（pagePath、text、iconPath、selectedIconPath），最多 5 个。
- **换主题色**：改 `app.wxss` 中的 `--color-primary`、`--color-primary-light` 等变量。
- **换 tab 图标**：替换 `images/` 下 `tab-*.png`（建议 81×81），或运行 `scripts/import_iconfont_png.py` 从 iconfont PNG 重新导入。
- **虚拟登录改为邮箱密码**：在登录页恢复邮箱/密码表单项，提交时调用 `api.login(email, password)` 而非 `api.loginWithAvatar(nickname, avatarUrl)`（需在 config 中关闭虚拟登录并设置 BASE_URL）。

---

## 八、版本与备注（更新时填写）

| 日期 | 变更摘要 |
|------|----------|
| （示例）2025-xx-xx | 初版：首页、登录（微信头像+昵称）、我的；虚拟登录 + 后端预留 |
|  | 更多信息：手机号（授权/手动）、性别/学校/年级选填；wx.login 取 code；我的页展示手机/性别/学校/年级 |
|  |  |

---

*文档路径：`miniprogram/MINIPROGRAM_DOC.md`，有结构或技术变更时请同步更新此文件。*
