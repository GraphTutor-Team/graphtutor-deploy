# 部署与服务器运维

面向 **Docker Compose** 部署（腾讯云轻量等 Linux 服务器）。

| 项 | 示例值 |
|----|--------|
| 代码目录 | `/root/graphtutor-deploy` |
| 远程仓库 | `https://github.com/ErMoDer/graphtutor-deploy.git` |
| 环境变量 | `server/.env`（不提交 Git） |
| 访问地址 | `http://106.55.99.208:5000` |

> **注意**：项目只在 **root** 目录下，用 `ubuntu` 用户时路径为 `/root/graphtutor-deploy`，不是 `~/graphtutor-deploy`。

---

## 1. 首次部署

```bash
sudo -i
cd /root
git clone https://github.com/ErMoDer/graphtutor-deploy.git
cd graphtutor-deploy

cp server/env.example server/.env
nano server/.env   # 见下文「环境变量」

docker compose up -d --build
```

验证：

```bash
curl -s http://127.0.0.1:5000/api/health
docker compose ps
```

---

## 2. 环境变量（`server/.env`）

### 必改（生产）

```env
NODE_ENV=production
PORT=5000

JWT_SECRET=<随机32字节hex>
JWT_REFRESH_SECRET=<另一段随机hex>

CLIENT_URL=http://106.55.99.208:5000
FRONTEND_URL=http://106.55.99.208:5000

ENABLE_SWAGGER=false
```

生成密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### HTTP 部署与 CSRF

使用 **http://IP:5000** 时，若登录 403「CSRF token验证失败」：

1. `CLIENT_URL` / `FRONTEND_URL` 必须与浏览器地址栏 **完全一致**（含 `http://` 和端口）
2. 拉最新代码并重建 server
3. 清除站点 Cookie 后重试
4. 仍失败时在 `.env` 加：`COOKIE_SECURE=false`，然后 `docker compose up -d --force-recreate server`

### 可选

| 变量 | 用途 |
|------|------|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub 登录 |
| `MINIPROGRAM_APP_ID` / `MINIPROGRAM_APP_SECRET` | 小程序登录 |
| `ENABLE_CODE_RUN=true` | 编程题在线运行 Java（容器内需 JDK + unzip） |
| `OPENAI_API_KEY` | AI 出题 |

改 `.env` 后生效：

```bash
docker compose up -d --force-recreate server
```

---

## 3. 日常更新代码

```bash
cd /root/graphtutor-deploy
git pull origin main
docker compose up -d --build
```

仅后端改动、加快更新：

```bash
git pull origin main
docker compose up -d --build --force-recreate server
```

### 查看日志

```bash
docker compose ps
docker compose logs --tail=100 server
docker compose logs -f server
```

---

## 4. 仅更新 Web 前端（不整镜像 build）

当 **`client/` 有改动**（如编程题界面）而全量 `docker compose build` 太慢时：

```bash
cd /root/graphtutor-deploy
git pull origin main

docker run --rm \
  -v "$(pwd):/app" \
  -w /app/client \
  node:20-bullseye-slim \
  bash -c "npm config set registry https://registry.npmmirror.com && npm ci --include=optional && npm i @rollup/rollup-linux-x64-gnu --no-save && npm run build"

docker cp client/dist/. graphtutor-server:/app/client/dist/
```

浏览器 **Ctrl+Shift+R** 强刷。

> 只导入题库、只改 `.env`：**不需要** 执行本节。

---

## 5. 上传导入用文件

面板 / WinSCP 上传到：

```text
/root/graphtutor-deploy/server/data/import/
```

| 文件名 | 用途 |
|--------|------|
| `ms.pdf` | 二级 MS 选择题 |
| `wps.pdf` | 二级 WPS 选择题 |
| `java_submissions.csv` | Java 实验编程题 |
| `leetcode-master.zip` | LeetCode Java 参考题 |

容器内路径（导入脚本用）：

```text
/app/server/data/import/
```

宿主机上传后需拷进容器（未挂载时）：

```bash
docker cp /root/graphtutor-deploy/server/data/import/. graphtutor-server:/app/server/data/import/
```

导入命令见 [DATA_IMPORT.md](./DATA_IMPORT.md)。

---

## 6. 常用命令速查

| 场景 | 命令 |
|------|------|
| 健康检查 | `curl http://127.0.0.1:5000/api/health` |
| 停止服务 | `docker compose down` |
| 导入演示题 | `docker compose exec server node scripts/seed-demo-content.js` |
| 查 MongoDB 题量 | 见 [DATA_IMPORT.md](./DATA_IMPORT.md) |
| 容器内装 unzip | `docker compose exec server apt-get update && apt-get install -y unzip` |

---

## 7. Docker 架构说明

- **server**：Node 20，托管 API + 静态前端 `client/dist`，端口 **5000**
- **mongodb**：27017（卷持久化）
- **redis**：6379（卷持久化）
- 上传目录：`./server/uploads` 挂载到容器

无 Nginx 时直接访问 **`http://公网IP:5000`**。小程序正式版需 **HTTPS 域名**。

---

## 8. 相关文档

- [DATA_IMPORT.md](./DATA_IMPORT.md) — 题库导入
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — 故障排查
- [MINIPROGRAM_INTEGRATION.md](./MINIPROGRAM_INTEGRATION.md) — 小程序
