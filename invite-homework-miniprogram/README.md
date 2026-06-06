# GraphTutor 图论挑战赛 · 邀请函作业

独立微信小程序作业项目，文案与 **GraphTutor 主项目文档**（`功能清单.md`、`docs/PAGES_AND_FEATURES.md` 等）保持一致。

## 项目结构

```
invite-homework-miniprogram/   # 小程序前端
invite-homework-server/        # Node.js 作业服务器（视频 + 报名接口）
```

## 功能概览

| 底部 Tab | 内容 |
|---------|------|
| 赛事邀请 | 邀请函封面、活动信息、**map 地图组件** |
| 照片 | scroll-view 竖向大图列表 |
| 往期举办 | 图集 / 视频切换；视频默认走服务器 URL |
| 报名信息 | 自定义 **signup-form** 组件，POST 提交到服务器 |

### 自定义组件（实验要求）

- `components/section-header`：区块标题
- `components/signup-form`：报名表单，通过 `triggerEvent('submit')` 向页面提交

### 实验报告

可直接复制 **`EXPERIMENT_REPORT.md`** 到实验报告 Word，内含组件清单、截图建议与实验小结。

## 快速开始

### 1. 启动服务器

```bash
cd invite-homework-server
npm install
node index.js
```

启动后控制台会输出：

- 视频：`http://127.0.0.1:3000/1.mp4`、`/2.mp4`
- 健康检查：`GET /api/health`
- 报名提交：`POST /api/register`
- 报名列表：`GET /api/register`（查看 `registrations.json` 内容）

视频文件放在 `invite-homework-server/htdocs/` 目录（已附带 `1.mp4`、`2.mp4`）。

### 2. 配置小程序服务器地址

编辑 `utils/config.js`：

```js
// 推荐：直连 GraphTutor 主站后端（与网站共用 :5000）
const BACKEND_MODE = 'main';
const MAIN_BASE = 'http://106.55.99.208:5000';

// 或使用独立作业服务器（:3000）
// const BACKEND_MODE = 'homework';
// const HOMEWORK_BASE = 'http://106.55.99.208:3000';
```

**主站模式**需在 GraphTutor 服务器上：
1. 部署含 `server/src/routes/homeworkInvite.js` 的后端代码并重启
2. 将 `1.mp4`、`2.mp4` 放入 `server/homework-media/`（已可从作业服务器复制）

接口对照：

| 功能 | 主站 :5000 | 作业服 :3000 |
|------|-----------|-------------|
| 健康检查 | `GET /api/health` | `GET /api/health` |
| 报名提交 | `POST /api/homework/invite/register` | `POST /api/register` |
| 视频 | `/homework-media/1.mp4` | `/1.mp4` |

微信开发者工具勾选 **不校验合法域名**；正式上线需在小程序后台配置 request 合法域名。

### 3. 导入微信开发者工具

1. 打开微信开发者工具 → **导入项目**
2. 目录选择：`invite-homework-miniprogram`
3. AppID 可用测试号或 `touristappid`
4. **详情 → 本地设置** → 勾选 **不校验合法域名、web-view、TLS 版本以及 HTTPS 证书**

### 4. 验证流程

1. 顶部应显示 **服务器在线**（绿色徽章）
2. 「往期举办 → 视频」点击加载，可播放服务器视频
3. 「报名信息」填写并提交，成功后服务器目录生成/更新 `registrations.json`

## 可修改内容

| 文件 | 说明 |
|------|------|
| **`utils/content.js`** | **主文案配置**（对照 `功能清单.md`、`PAGES_AND_FEATURES.md`、`shop-data.js` 等） |
| `utils/config.js` | 服务器地址、地图坐标 |
| `pages/index/index.js` | Tab 逻辑（文案从 content.js 读取） |
| `invite-homework-server/htdocs/` | 替换视频文件 |

## 提交清单

作业需一并提交：

1. `invite-homework-miniprogram/` 完整小程序源码
2. `invite-homework-server/` 服务器源码（含 `htdocs` 视频）
3. 说明文档中注明服务器地址与启动方式

## 说明

- 小程序内 `assets/videos/` 为视频**备份**，页面默认播放服务器 URL
- GraphTutor 主项目后端（`:5000`）未接入本作业，本作业使用独立 `:3000` 服务器
