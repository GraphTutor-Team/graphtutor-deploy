# 数据导入指南

主程序与小程序共用 MongoDB，**导入一次** 两边都能用（需登录、学科/题库筛选正确）。

---

## 1. 演示数据（CS 学科）

```bash
# 服务器 Docker
docker compose exec server node scripts/seed-demo-content.js

# 本地
npm run seed:demo
```

| 学科 | 题库 key | 约题量 |
|------|-----------|--------|
| CS-DS | `demo-cs-ds` | 10 |
| CS-NET | `demo-cs-net` | 10 |
| CS-WEB | `demo-cs-web` | 28 |

---

## 2. 计算机二级 MS/WPS（PDF）

### 准备文件

上传到 `server/data/import/`：

- `ms.pdf` — 二级 MS 精选 300 题
- `wps.pdf` — 二级 WPS 精选 300 题

```bash
docker cp server/data/import/. graphtutor-server:/app/server/data/import/
```

### 导入

```bash
docker compose exec server node scripts/import-external-content.js \
  --ms-pdf /app/server/data/import/ms.pdf \
  --wps-pdf /app/server/data/import/wps.pdf
```

| 学科 | 题库 key | 约题量 |
|------|-----------|--------|
| CERT-MS | `ncre-ms-300` | 300 |
| CERT-WPS | `ncre-wps-300` | 276 |

本地：`npm run seed:import-external`

---

## 3. Java 实验 + LeetCode 编程题

### 准备文件

- `java_submissions.csv`
- `leetcode-master.zip`

### 依赖（LeetCode 解压）

```bash
docker compose exec server bash -c "apt-get update && apt-get install -y unzip"
```

确保容器内为最新解析脚本（`git pull` 后）：

```bash
docker cp server/src/utils/codingContentParser.js graphtutor-server:/app/server/src/utils/
docker cp server/src/models/Question.js graphtutor-server:/app/server/src/models/
```

### 导入

```bash
docker compose exec server node scripts/import-coding-content.js \
  --csv /app/server/data/import/java_submissions.csv \
  --leetcode-zip /app/server/data/import/leetcode-master.zip
```

| 学科 | 题库 key | 约题量 | 题型 |
|------|-----------|--------|------|
| CS-JAVA | `java-lab-submissions` | 99 | `coding` |
| CS-ALGO | `leetcode-java-master` | 66 | `coding` |

本地：`npm run seed:import-coding`

### 验证题量

```bash
docker compose exec server node -e "
import mongoose from 'mongoose';
import Question from './src/models/Question.js';
await mongoose.connect(process.env.MONGODB_URI);
for (const c of ['CS-ALGO','CS-JAVA','CERT-MS','CERT-WPS']) {
  console.log(c, await Question.countDocuments({ subjectCode: c }));
}
process.exit(0);
"
```

---

## 4. 旧镜像快速导入（不全量 rebuild）

若容器是旧镜像、缺少脚本：

```bash
cd /root/graphtutor-deploy
git pull origin main

docker cp server/scripts/import-external-content.js graphtutor-server:/app/server/scripts/
docker cp server/scripts/import-coding-content.js graphtutor-server:/app/server/scripts/
docker cp server/data/import-manifest.json graphtutor-server:/app/server/data/
docker cp server/src/utils/officeExamPdfParser.js graphtutor-server:/app/server/src/utils/
docker cp server/src/utils/codingContentParser.js graphtutor-server:/app/server/src/utils/
docker cp server/src/models/Question.js graphtutor-server:/app/server/src/models/

docker compose exec server npm install pdf-parse --no-save
# 再执行上面导入命令
```

编程题导入后建议：`docker compose restart server`

---

## 5. Web 端使用

| 学科 | 内容 |
|------|------|
| 计算机等级考试 → MS/WPS | 选择题 |
| Java 编程 | 99 道编程题 |
| 算法与 LeetCode | 66 道编程题 |

练习页选学科后点 **重新加载**。编程题需 **新前端 dist** 才显示代码编辑器，见 [DEPLOYMENT.md §4](./DEPLOYMENT.md#4-仅更新-web-前端不整镜像-build)。

---

## 6. 数据文件与脚本

| 路径 | 说明 |
|------|------|
| `server/data/import-manifest.json` | 学科/题库清单 |
| `server/data/demo-content.json` | 演示题 |
| `server/scripts/import-external-content.js` | PDF 导入 |
| `server/scripts/import-coding-content.js` | CSV/ZIP 导入 |
| `server/scripts/seed-demo-content.js` | 演示 seed |

脚本可重复执行（upsert，不重复插题）。
