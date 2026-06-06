# 实验三 · 小程序组件使用 — 报告要点

> 项目：`invite-homework-miniprogram`（GraphTutor 图论挑战赛邀请函）  
> 可复制到实验报告 Word 中，按老师要求增删截图说明。

---

## 一、实验目的对照

| 实验要求 | 本项目实现 |
|---------|-----------|
| 掌握视图、表单、导航、媒体、地图组件 | 见下方「组件清单」 |
| 组件事件与 setData | Tab 切换、表单输入、视频加载等 |
| 组件间通信 triggerEvent | `signup-form` → 页面 `onFormSubmit` |
| 自定义组件封装 | `section-header`、`signup-form` |
| 邀请函主页 + 相关界面 | 四 Tab：赛事邀请 / 照片 / 往期 / 报名 |
| 视频完整展示 | 服务器 `1.mp4`、`2.mp4` + 懒加载与错误降级 |

---

## 二、项目结构

```
invite-homework-miniprogram/
├── app.js / app.json / app.wxss
├── utils/
│   ├── config.js      # 服务器地址
│   └── content.js     # GraphTutor 文案（与主项目文档同步）
├── components/
│   ├── section-header/   # 自定义：区块标题
│   └── signup-form/      # 自定义：报名表单 + triggerEvent
├── pages/index/          # 单页四 Tab
└── assets/               # 图片、图标、视频备份
```

配套服务器：`invite-homework-server/`（Express，端口 3000）

---

## 三、组件使用清单

### 视图组件
- **view**：页面布局、卡片、底部导航
- **scroll-view**：照片 Tab 竖向滚动列表
- **swiper / swiper-item**：往期举办「图集」轮播

### 表单组件
- **input**：姓名、学号、手机号（signup-form 组件内）
- **textarea**：备注
- **radio / radio-group**：报名身份（选手 / 志愿者）
- **checkbox / checkbox-group**：技能方向多选、同意说明
- **button**：提交、加载视频、打开地图

### 媒体组件
- **image**：邀请函封面、现场照片、Tab 图标；支持 `lazy-load`、点击预览
- **video**：往期举办「视频」Tab，服务器 URL 播放

### 地图组件
- **map**：赛事地点标记，`markers` + `show-location`
- **wx.openLocation**：一键打开系统地图导航

### 导航
- 自定义底部四栏（赛事邀请 / 照片 / 往期 / 报名），`bindtap` + `setData({ activeTab })`

---

## 四、自定义组件与通信

### section-header
- **properties**：`title`、`subtitle`
- **用途**：各 Tab 统一标题样式

### signup-form
- **properties**：`submitting`（父页面控制加载态）
- **triggerEvent('submit', payload)**：校验通过后向页面提交
- **resetForm()**：父页面提交成功后调用清空表单

页面注册（`index.json`）：
```json
"usingComponents": {
  "section-header": "/components/section-header/section-header",
  "signup-form": "/components/signup-form/signup-form"
}
```

---

## 五、服务器对接

1. 启动：`cd invite-homework-server && node index.js`
2. 配置：`utils/config.js` 中 `SERVER_BASE`
3. 接口：
   - `GET /api/health` — 顶部「服务器在线」徽章
   - `POST /api/register` — 报名表单提交
   - `GET /api/register` — 查看报名列表
   - `/1.mp4`、`/2.mp4` — 视频静态资源
4. 开发者工具勾选「不校验合法域名」；真机预览改用局域网 IP

---

## 六、实验结果（可附截图）

建议截图位置：
1. 赛事邀请页（封面 + 活动亮点 + 地图）
2. 照片 Tab（scroll-view 列表 + 点击预览）
3. 往期 Tab 图集（swiper 轮播）与视频（video 播放）
4. 报名 Tab（表单 + 提交成功弹窗）
5. 服务器 `registrations.json` 或 `GET /api/register` 返回

---

## 七、小结

本实验以 GraphTutor 校园图论挑战赛为主题，完成邀请函类小程序，综合运用视图、表单、媒体、地图组件及自定义组件封装；通过 `triggerEvent` 实现父子通信，并对接 Node.js 服务器实现视频展示与报名数据持久化，满足实验三「组件使用 + 页面交互 + 数据管理」要求。
