# 故障排查

---

## 1. 登录 403「CSRF token验证失败」

**原因**：HTTP 下 Cookie 带 `Secure`，或 `CLIENT_URL` 与浏览器地址不一致。

**处理**：

1. `server/.env` 中 `CLIENT_URL` / `FRONTEND_URL` = 浏览器实际地址（如 `http://106.55.99.208:5000`）
2. `git pull` 后 `docker compose up -d --build --force-recreate server`
3. 清除站点 Cookie / 无痕窗口
4. 加 `COOKIE_SECURE=false` 并重启 server

详见 [部署运维-DEPLOYMENT.md §环境变量](./部署运维-DEPLOYMENT.md#2-环境变量serverenv)。

---

## 2. 502 / 无法访问

| 现象 | 处理 |
|------|------|
| 访问 `:80` 502 | 服务在 **5000**，用 `http://IP:5000` |
| 容器 Restarting | `docker compose logs server --tail 50` 查语法错误 |
| 安全组 | 放行 **5000**（及 22 SSH） |
| 首页 `recommendations` / `smart-review` 502 | 拉最新代码并重建 server（见下 §7） |

---

## 7. 小程序首页 502（推荐题目 / 今日复习）

**现象**：开发者工具 Console 出现：

- `GET .../api/v3/recommendations/questions` 502  
- `GET .../api/v3/smart-review/today` 502  

**原因**：旧版后端在错题 `populate`、推荐聚合查询异常时进程报错，网关返回 502。

**处理（服务器）** — 本次只改了 `server/`，**不要用 `--build`**：

```bash
cd /root/graphtutor-deploy
bash scripts/deploy-server-only.sh
```

若脚本不存在（旧代码），手动：

```bash
git pull origin main
docker cp server/src/. graphtutor-server:/app/server/src/
docker compose restart server
curl -s http://127.0.0.1:5000/api/health
```

**本地小程序**：微信开发者工具点 **编译** 刷新（`api.js` 已对首页接口做失败兜底，不再红屏）。

**可选**：`server/.env` 加 `RATE_LIMIT_API_MAX=500` 减轻真机测试限流。

---

## 5. `docker compose build` 卡住 / SSH 断开

**现象**：停在 `RUN npm run build` 或 `rendering chunks`，CPU 95%+、内存 94%+，久等后 SSH 断开。

**原因**：4G 轻量机全量构建 = 多次 `npm ci` + Vite 打包，内存不够会疯狂换页，不一定真卡死。

**处理**（按优先级）：

| 场景 | 做法 |
|------|------|
| 只改了 `server/` | `bash scripts/deploy-server-only.sh`（几十秒，推荐） |
| 必须完整 build | `tmux new -s build` 里构建；加 2G swap（见 [部署运维 §3.2](./部署运维-DEPLOYMENT.md#32-完整构建改了前端或首次部署)） |
| 已有镜像、只改后端 | `DOCKERFILE=Dockerfile.server-fast docker compose build server` |
| SSH 断了 | `tmux attach -t build` 看是否还在跑 |

加 swap（只需一次）：

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. 练习页「暂无题目」

1. **查库**（root 下 `/root/graphtutor-deploy`）：

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

2. **CS-ALGO = 0**：LeetCode 未导入 → [数据导入-DATA_IMPORT.md §3](./数据导入-DATA_IMPORT.md#3-java-实验--leetcode-编程题)

3. **有题但页面空**：`curl "http://127.0.0.1:5000/api/questions?subjectCode=CS-JAVA&limit=5&random=true"`

4. 点 **重新加载**；学科与题库筛选不要冲突

---

## 4. 编程题显示「简答题 / 未配置选项」

**原因**：容器内 **旧前端 dist**，不支持 `coding` 题型。

**处理**：按 [部署运维-DEPLOYMENT.md §4](./部署运维-DEPLOYMENT.md#4-仅更新-web-前端不整镜像-build) 更新 `client/dist`。

---

## 6. `npm not found` 在宿主机

宿主机未装 Node 是正常的。用 Docker 构建：

```bash
docker run --rm -v "$(pwd):/app" -w /app/client node:20-bullseye-slim bash -c "npm ci && npm run build"
```

---

## 7. 路径 `~/graphtutor-deploy` 不存在

项目在 **`/root/graphtutor-deploy`**。先 `sudo -i` 或 `cd /root/graphtutor-deploy`。

---

## 8. 导入 PDF 失败

- 确认容器内文件：`docker compose exec server ls -lh /app/server/data/import/`
- 缺 `pdf-parse`：`docker compose exec server npm install pdf-parse --no-save`
- 缺脚本：`docker cp` 见 [数据导入-DATA_IMPORT.md §4](./数据导入-DATA_IMPORT.md#4-旧镜像快速导入不全量-rebuild)

---

## 9. 忘记密码 / OAuth

- 忘记密码：`POST /api/auth/password/forgot` + 邮件（需配置 SMTP）
- GitHub 绑定：`PUT /api/auth/me/password`、绑定页 API

---

## 10. 获取帮助

1. `docker compose logs -f server`
2. 浏览器 F12 → Network 看失败请求 body
3. `curl http://127.0.0.1:5000/api/health`
