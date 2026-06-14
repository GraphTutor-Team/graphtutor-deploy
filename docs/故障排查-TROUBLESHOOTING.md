# 故障排查

---

## 1. 登录 403「CSRF token验证失败」

**原因**：HTTP 下 Cookie 带 `Secure`，或 `CLIENT_URL` 与浏览器地址不一致。

**处理**：

1. `server/.env` 中 `CLIENT_URL` / `FRONTEND_URL` = 浏览器实际地址（如 `http://106.55.99.208:5000`）
2. `git pull` 后 `docker compose up -d --build --force-recreate server`
3. 清除站点 Cookie / 无痕窗口
4. 加 `COOKIE_SECURE=false` 并重启 server

详见 [DEPLOYMENT.md §环境变量](./DEPLOYMENT.md#2-环境变量serverenv)。

---

## 2. 502 / 无法访问

| 现象 | 处理 |
|------|------|
| 访问 `:80` 502 | 服务在 **5000**，用 `http://IP:5000` |
| 容器 Restarting | `docker compose logs server --tail 50` 查语法错误 |
| 安全组 | 放行 **5000**（及 22 SSH） |

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

2. **CS-ALGO = 0**：LeetCode 未导入 → [DATA_IMPORT.md §3](./DATA_IMPORT.md#3-java-实验--leetcode-编程题)

3. **有题但页面空**：`curl "http://127.0.0.1:5000/api/questions?subjectCode=CS-JAVA&limit=5&random=true"`

4. 点 **重新加载**；学科与题库筛选不要冲突

---

## 4. 编程题显示「简答题 / 未配置选项」

**原因**：容器内 **旧前端 dist**，不支持 `coding` 题型。

**处理**：按 [DEPLOYMENT.md §4](./DEPLOYMENT.md#4-仅更新-web-前端不整镜像-build) 更新 `client/dist`。

---

## 5. `docker compose build` 卡在 rendering chunks

**原因**：小内存机器打包前端慢，不一定卡死。

**处理**：

- 等 10～20 分钟，或 `top` 看 CPU
- 加 swap：`fallocate -l 2G /swapfile && …`
- 用 **方式 A** 单独 Docker 构建前端，不必全量 rebuild

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
- 缺脚本：`docker cp` 见 [DATA_IMPORT.md §4](./DATA_IMPORT.md#4-旧镜像快速导入不全量-rebuild)

---

## 9. 忘记密码 / OAuth

- 忘记密码：`POST /api/auth/password/forgot` + 邮件（需配置 SMTP）
- GitHub 绑定：`PUT /api/auth/me/password`、绑定页 API

---

## 10. 获取帮助

1. `docker compose logs -f server`
2. 浏览器 F12 → Network 看失败请求 body
3. `curl http://127.0.0.1:5000/api/health`
