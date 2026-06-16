# GraphTutor V3.0 - 生产环境Dockerfile
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# 安装依赖
RUN npm config set registry https://registry.npmmirror.com && npm ci && \
    cd client && npm ci --include=optional && npm i @rollup/rollup-linux-x64-gnu --no-save && \
    cd ../server && npm ci

# 复制源代码
COPY . .

# 限制 Node 内存，避免 4G 机器 OOM（构建会慢一些但更稳）
ENV NODE_OPTIONS=--max-old-space-size=1536

# 构建前端
WORKDIR /app/client
RUN npm run build

# 生产环境镜像
FROM node:20-bullseye-slim

WORKDIR /app

# 只复制必要的文件
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/

# 安装生产依赖
WORKDIR /app/server
RUN npm ci --production

# 暴露端口
EXPOSE 5000

# 启动服务
CMD ["node", "server.js"]

