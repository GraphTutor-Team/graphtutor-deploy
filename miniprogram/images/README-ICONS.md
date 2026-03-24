# tabBar 图标说明

已生成 8 个 SVG 图标（灰/蓝两套），需转为 81×81 PNG 供 tabBar 使用。

## 图标对应关系

| 文件名 | 用途 | 颜色 |
|--------|------|------|
| tab-home.svg | 首页（未选中） | #9AA4B2 |
| tab-home-active.svg | 首页（选中） | #1565C0 |
| tab-practice.svg | 练习（未选中） | #9AA4B2 |
| tab-practice-active.svg | 练习（选中） | #1565C0 |
| tab-plan.svg | 计划（未选中） | #9AA4B2 |
| tab-plan-active.svg | 计划（选中） | #1565C0 |
| tab-user.svg | 我的（未选中） | #9AA4B2 |
| tab-user-active.svg | 我的（选中） | #1565C0 |

## 转为 PNG 的方法

### 方法一：在线工具（最快）
1. 打开 https://svgtopng.com 或 https://cloudconvert.com/svg-to-png
2. 上传对应 `.svg` 文件
3. 设置输出尺寸为 **81×81**
4. 下载 PNG，重命名为 `tab-xxx.png` 或 `tab-xxx-active.png`
5. 放入本目录，覆盖原有占位 PNG

### 方法二：本地 Node 脚本
在 `miniprogram` 目录下执行：
```bash
npm init -y
npm install sharp --save-dev
node -e "
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const dir = './images';
['tab-home','tab-home-active','tab-practice','tab-practice-active','tab-plan','tab-plan-active','tab-user','tab-user-active'].forEach(name => {
  sharp(path.join(dir, name+'.svg')).resize(81,81).png().toFile(path.join(dir, name+'.png')).then(()=>console.log(name+' ok'));
});
"
```

### 方法三：微信开发者工具
部分版本支持直接引用 SVG，若你的基础库支持，可在 `app.json` 的 tabBar 中尝试将 `iconPath` 改为 `.svg` 路径（需实测）。
