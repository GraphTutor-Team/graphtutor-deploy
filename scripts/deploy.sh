#!/bin/bash
# GraphTutor V3.0 - 部署脚本

set -e

echo "🚀 开始部署 GraphTutor V3.0..."

# 检查环境变量
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

# 安装依赖
echo "📦 安装依赖..."
npm ci
cd client && npm ci && cd ..
cd server && npm ci && cd ..

# 构建前端
echo "🏗️  构建前端..."
cd client
npm run build
cd ..

# 检查构建结果
if [ ! -d "client/dist" ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 构建完成"

# 如果使用Docker
if [ "$USE_DOCKER" = "true" ]; then
    echo "🐳 使用Docker部署..."
    docker-compose up -d --build
    echo "✅ Docker部署完成"
else
    echo "📝 请手动启动服务："
    echo "  后端: cd server && npm start"
    echo "  前端: 使用nginx或其他静态服务器服务 client/dist"
fi

echo "🎉 部署完成！"

