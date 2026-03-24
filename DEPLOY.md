# GraphTutor Docker 部署说明

## 一键启动（推荐）

在项目根目录执行：

```bash
docker compose up -d --build
```

- **MongoDB**：端口 `27017`
- **Redis**：端口 `6379`
- **应用**：浏览器访问 **http://localhost:5000**（前端 + 接口同一端口）

首次构建会拉取镜像并编译前端，可能需要几分钟。

## 常用命令

```bash
# 查看运行状态
docker compose ps

# 查看后端日志
docker compose logs -f server

# 停止
docker compose down

# 停止并删除数据卷
docker compose down -v
```

## 环境变量

- 容器会读取 `server/.env`（`env_file`），用于 AI、OAuth 等可选配置。
- 密钥可在项目根目录建 `.env` 并设置 `JWT_SECRET`、`JWT_REFRESH_SECRET`，或在 `docker-compose.yml` 里写死（仅测试用）。
- OAuth 回调：当前部署下 `FRONTEND_URL` 已设为 `http://localhost:5000`，微信/GitHub 回调地址填 `http://你的域名:5000/api/auth/oauth/xxx/callback` 即可。

## 说明

- 前端由 Node 在生产环境一并托管，无需单独 nginx。
- 上传目录挂载为 `./server/uploads`，重启后保留。
- 数据库与 Redis 使用 Docker 卷持久化。

## 常见问题（Windows + Docker Desktop）

- **WSL integration unexpectedly stopped**：先在弹窗点 `Restart the WSL integration`，若仍失败执行：

```powershell
wsl --shutdown
net stop LxssManager
net start LxssManager
```

然后重启 Docker Desktop 再执行 `docker compose up -d --build`。

- **Rollup musl 可选依赖缺失**：已在 `Dockerfile` 使用 Debian 基础镜像并补装 rollup 可选包，若仍遇到旧缓存问题，执行：

```powershell
docker compose build --no-cache
docker compose up -d
```
