# 个人收藏 · Hero Banner

从 GraphTutor 小程序首页提取的 **图结构 · 智能练习** 横幅样式，可单独复制到其他小程序项目使用。

## 效果说明

- 圆角卡片 + 背景图 + 蓝色渐变遮罩
- 左上角胶囊 Badge（如 `GraphTutor`）
- 白色大标题 + 副标题
- 外链图加载失败时可回退本地图

## 目录

```
个人收藏/
├── README.md
├── hero-banner/          # 可复用小程序组件
│   ├── hero-banner.json
│   ├── hero-banner.wxml
│   ├── hero-banner.wxss
│   └── hero-banner.js
└── snippets/             # 从 index 页原样摘出的片段（便于对照）
    ├── index-hero.wxml
    ├── index-hero.wxss
    └── index-hero.js
```

## 用法一：作为组件（推荐）

1. 将 `hero-banner/` 整个文件夹复制到目标项目的 `components/hero-banner/`

2. 在页面 json 中注册：

```json
{
  "usingComponents": {
    "hero-banner": "/components/hero-banner/hero-banner"
  }
}
```

3. 在 wxml 中使用：

```xml
<hero-banner
  badge="GraphTutor"
  title="图结构 · 智能练习"
  desc="知识图谱、练习与计划，一站入口"
  image-url="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1400"
  fallback-url="/images/icon_ebd74bn8zis/guanxitu.png"
/>
```

## 用法二：直接粘贴片段

把 `snippets/` 里的 wxml、wxss、js 合并进你的页面即可（需自行在 `data` 里设置 `heroImage`）。

## 默认背景图

当前默认使用 Pexels 免费图库（与 `miniprogram/utils/image-library.js` 中 `HOME_IMAGE_SET.hero` 一致）。  
正式上线请在微信小程序后台配置 **downloadFile 合法域名**（如 `images.pexels.com`），或换成本地 `/images/` 路径。

## 来源

- 原页面：`miniprogram/pages/index/index.wxml`（`.index-hero` 区块）
- 样式：`miniprogram/pages/index/index.wxss`
