# 轻量化服务器：拉取更新与 `.env` 配置

面向已用 Docker Compose 部署 GraphTutor 的 Linux 服务器（如腾讯云轻量应用服务器）。

| 项 | 值 |
|----|-----|
| 代码目录（示例） | `/root/graphtutor-deploy` |
| 远程仓库 | `https://github.com/ErMoDer/graphtutor-deploy.git` |
| 环境变量文件 | `server/.env`（**不会**随 `git pull` 覆盖） |
| API 地址（示例） | `http://106.55.99.208:5000` |

---

## 1. 日常更新（拉代码 + 重启服务）

SSH 登录服务器后执行：

```bash
# 进入项目目录（按你实际路径修改）
cd /root/graphtutor-deploy

# 拉取最新代码
git pull origin main

# 重新构建并启动（含 server + mongodb + redis）
docker compose up -d --build
```

若只改了后端代码、想加快更新，可只重建 server 容器：

```bash
cd /root/graphtutor-deploy
git pull origin main
docker compose up -d --build --force-recreate server
```

### 查看状态与日志

```bash
# 容器是否在跑
docker compose ps

# 查看后端日志（最近 100 行，持续跟踪加 -f）
docker compose logs --tail=100 server
docker compose logs -f server
```

### 更新后验证

```bash
curl http://106.55.99.208:5000/api/health
```

正常应返回 JSON，其中 `ok: true`。若已配置小程序登录，还应有：

```json
"features": {
  "miniprogramLogin": {
    "configured": true,
    "appId": "wx2bd6cc462dccaecf"
  }
}
```

---

## 2. 首次克隆（新机器）

```bash
cd /root
git clone https://github.com/ErMoDer/graphtutor-deploy.git
cd graphtutor-deploy

# 从示例复制环境变量（只需做一次）
cp server/env.example server/.env

# 编辑 .env（见下一节）
nano server/.env

# 首次启动
docker compose up -d --build
```

---

## 3. 进入并编辑 `server/.env`

环境变量在 **`server/.env`**，不在项目根目录。该文件已在 `.gitignore` 中，`git pull` **不会**删除或覆盖它。

### 打开编辑器

```bash
cd /root/graphtutor-deploy

# 方式一：nano（上手简单，Ctrl+O 保存，Ctrl+X 退出）
nano server/.env

# 方式二：vi / vim
vi server/.env
```

### 若文件不存在

```bash
cd /root/graphtutor-deploy
cp server/env.example server/.env
nano server/.env
```

### 必改项（生产环境）

```env
NODE_ENV=production
PORT=5000

# JWT 密钥（务必改成随机长字符串，不要用示例值）
JWT_SECRET=这里填随机字符串
JWT_REFRESH_SECRET=这里填另一段随机字符串

# 浏览器访问地址（与公网 IP/域名一致，含协议和端口）
CLIENT_URL=http://106.55.99.208:5000
FRONTEND_URL=http://106.55.99.208:5000

# Docker 内 MongoDB 一般不用改；compose 会注入 MONGODB_URI
# 若用外部 MongoDB，在此填写连接串
# MONGODB_URI=mongodb://...

# 生产建议关闭 Swagger
ENABLE_SWAGGER=false
```

生成随机 JWT 密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

运行两次，分别填入 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`。

### 小程序登录（可选）

在微信公众平台 → **开发 → 开发管理 → 开发设置** 获取 AppSecret：

```env
MINIPROGRAM_APP_ID=wx2bd6cc462dccaecf
MINIPROGRAM_APP_SECRET=你的小程序AppSecret
```

> **注意**：`MINIPROGRAM_*` 是小程序凭证，与开放平台网站应用的 `WECHAT_*` 不是同一套，不要混用。  
> **AppSecret 只写在服务器 `.env`，不要提交到 Git。**

### GitHub 登录（可选）

```env
GITHUB_CLIENT_ID=你的ClientID
GITHUB_CLIENT_SECRET=你的ClientSecret
```

回调地址需在 GitHub OAuth App 中配置为：  
`http://106.55.99.208:5000/api/auth/oauth/github/callback`

---

## 4. 改完 `.env` 后如何生效

修改环境变量后**必须重启** backend 容器：

```bash
cd /root/graphtutor-deploy
docker compose up -d --force-recreate server
```

无需重新 `git pull`，也无需 `--build`（除非同时更新了代码）。

再次验证：

```bash
curl http://106.55.99.208:5000/api/health
```

---

## 5. 常用命令速查

| 场景 | 命令 |
|------|------|
| 拉代码并更新 | `git pull origin main && docker compose up -d --build` |
| 只改 `.env` | `nano server/.env` → `docker compose up -d --force-recreate server` |
| 看容器状态 | `docker compose ps` |
| 看后端日志 | `docker compose logs -f server` |
| 停止全部服务 | `docker compose down` |
| 健康检查 | `curl http://106.55.99.208:5000/api/health` |
| 导入演示学科/题库 | 见下方「演示数据导入」 |

### 演示数据导入（学科 + 练习题）

主程序与小程序共用 MongoDB，导入一次即可用于展示与测试。

**服务器（Docker）**：

```bash
cd /root/graphtutor-deploy
git pull origin main
docker compose exec server node scripts/seed-demo-content.js
```

**本地开发**：

```bash
npm run seed:demo
```

导入内容：

| 学科 | 演示题库 key | 约题量 |
|------|----------------|--------|
| 数据结构 CS-DS | `demo-cs-ds` | 10 |
| 计算机网络 CS-NET | `demo-cs-net` | 10 |
| Web 开发 CS-WEB | `demo-cs-web` | 28（HTML/CSS/JS） |

- 脚本可重复执行（已存在则更新，不重复插入）
- 数据文件：`server/data/demo-content.json`、`server/data/starter_question_bank.json`
- 可选：完整学科树仍可用 `npm run seed:subjects` 导入

**计算机二级 MS/WPS PDF（你提供的 300 题）**：

```bash
# 默认读取微信文件路径；也可指定 PDF
npm run seed:import-external
# 或
node server/scripts/import-external-content.js --ms-pdf "路径/ms.pdf" --wps-pdf "路径/wps.pdf"
```

Docker 服务器（需先把 PDF 上传到 `server/data/import/` 或挂载路径）：

```bash
docker compose exec server node scripts/import-external-content.js \
  --ms-pdf /app/server/data/import/ms.pdf \
  --wps-pdf /app/server/data/import/wps.pdf
```

导入学科：`CERT` / `CERT-MS` / `CERT-WPS`；题库 `ncre-ms-300`、`ncre-wps-300`（约 576 题）。

**Java 实验 + LeetCode 编程题**：

```bash
npm run seed:import-coding
# 或指定路径
node server/scripts/import-coding-content.js \
  --csv "路径/java_submissions.csv" \
  --leetcode-zip "路径/leetcode-master.zip"
```

Docker 服务器：

```bash
docker compose exec server node scripts/import-coding-content.js \
  --csv /app/server/data/import/java_submissions.csv \
  --leetcode-zip /app/server/data/import/leetcode-master.zip
```

导入内容：

| 学科 | 题库 key | 来源 | 约题量 |
|------|-----------|------|--------|
| CS-JAVA | `java-lab-submissions` | java_submissions.csv | 99 |
| CS-ALGO | `leetcode-java-master` | leetcode-master.zip | 67 |

编程题题型为 `coding`，可在 Web「测验会话」中编写代码并对照参考实现判分。

**启用 Java 在线运行（可选）**：

服务器需安装 JDK（`javac` / `java` 在 PATH 中），并在 `server/.env` 设置：

```env
ENABLE_CODE_RUN=true
```

前端练习页可点击「运行代码」本地编译执行（有超时与危险 API 拦截，仅适合练习环境）。

---

## 6. 注意事项

1. **`miniprogram/` 会随 `git pull` 下载到磁盘**，但 Docker 只构建/运行 `server` 与 Web 前端，不影响服务。
2. **`server/.env` 不要提交 Git**，也不要发到聊天/截图里（含 AppSecret、JWT 密钥）。
3. 小程序正式版要求 **HTTPS 域名**；当前 `http://IP:5000` 仅适合开发者工具 + 关闭域名校验调试。
4. 若 `git pull` 冲突，先备份 `.env`：`cp server/.env /root/server.env.bak`，再处理冲突；`.env` 通常不会冲突。

### 登录报 403（CSRF token验证失败）/ 401 连环失败

**现象**：浏览器控制台出现 `api/auth/login` 403、`api/auth/refresh` 403，其它接口 401。

**原因**：Docker 默认 `NODE_ENV=production`，旧版代码在 HTTP 访问（`http://IP:5000`）时 CSRF Cookie 带 `Secure` 标志，浏览器不会保存，导致登录 POST 被拒绝。

**处理**：

1. 确认 `server/.env` 中 `FRONTEND_URL` / `CLIENT_URL` 为 **http://** 开头的实际访问地址（与浏览器地址栏一致）。
2. 拉取含 CSRF 修复的最新代码并重建：
   ```bash
   cd /root/graphtutor-deploy
   git pull origin main
   docker compose up -d --build --force-recreate server
   ```
3. 浏览器 **清除该站点 Cookie 与 localStorage**（或无痕窗口重试），再登录。
4. 若仍异常，可在 `server/.env` 显式加一行：`COOKIE_SECURE=false`，然后 `docker compose up -d --force-recreate server`。

---

## 7. 相关文档

- [小程序对接指南](./MINIPROGRAM_INTEGRATION.md)
- [环境变量完整示例](../server/env.example)
