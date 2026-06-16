#!/usr/bin/env bash
# 仅更新 server 源码，不跑 docker build（适合 4G 小内存机器，避免 npm run build 卡死）
# 用法: bash scripts/deploy-server-only.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker ps --format '{{.Names}}' | grep -qx 'graphtutor-server'; then
  echo "错误: graphtutor-server 容器未运行，请先 docker compose up -d"
  exit 1
fi

echo "==> git pull"
git pull origin main

echo "==> 复制 server 源码到容器"
docker cp server/src/. graphtutor-server:/app/server/src/
docker cp server/scripts/. graphtutor-server:/app/server/scripts/

echo "==> 重启 server"
docker compose restart server

echo "==> 健康检查"
sleep 2
curl -sf http://127.0.0.1:5000/api/health && echo
echo "完成。仅改了 client/ 或 package.json 时，仍需完整 build。"
