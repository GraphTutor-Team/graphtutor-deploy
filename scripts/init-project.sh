#!/bin/bash
# GraphTutor V3.0 - 项目初始化脚本
# 用于首次部署前的准备工作

set -e

echo "🚀 GraphTutor V3.0 项目初始化"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${YELLOW}⚠️  $1 未安装${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ $1 已安装${NC}"
    return 0
}

# 1. 检查环境
echo ""
echo "📋 检查环境..."
check_command node || exit 1
check_command npm || exit 1

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js版本过低，需要 >= 16.0.0${NC}"
    exit 1
fi

# 2. 创建环境变量文件
echo ""
echo "📝 配置环境变量..."
if [ ! -f "server/.env" ]; then
    if [ -f "server/env.example" ]; then
        cp server/env.example server/.env
        echo -e "${GREEN}✅ 已创建 server/.env${NC}"
        echo -e "${YELLOW}⚠️  请编辑 server/.env，设置必需的环境变量！${NC}"
        echo -e "${YELLOW}   特别是 JWT_SECRET 和 JWT_REFRESH_SECRET${NC}"
    else
        echo -e "${RED}❌ server/env.example 不存在${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ server/.env 已存在${NC}"
fi

# 3. 创建上传目录
echo ""
echo "📁 创建必要目录..."
mkdir -p server/uploads/notes
chmod 755 server/uploads 2>/dev/null || true
chmod 755 server/uploads/notes 2>/dev/null || true
echo -e "${GREEN}✅ 上传目录已创建${NC}"

# 4. 安装依赖
echo ""
echo "📦 安装依赖..."
npm run setup
echo -e "${GREEN}✅ 依赖安装完成${NC}"

# 5. 检查MongoDB
echo ""
echo "🗄️  检查MongoDB..."
if docker ps | grep -q mongodb; then
    echo -e "${GREEN}✅ MongoDB容器正在运行${NC}"
elif command -v mongod &> /dev/null && pgrep mongod > /dev/null; then
    echo -e "${GREEN}✅ MongoDB服务正在运行${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB未运行${NC}"
    echo -e "${YELLOW}   请启动MongoDB：${NC}"
    echo -e "${YELLOW}   docker run -d -p 27017:27017 --name mongodb mongo:7${NC}"
    echo -e "${YELLOW}   或 sudo systemctl start mongod${NC}"
fi

# 6. 生成JWT密钥（如果未设置）
echo ""
echo "🔐 检查JWT密钥..."
if grep -q "your-secret-key-here-change-in-production" server/.env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  JWT_SECRET 仍为默认值，生成新密钥...${NC}"
    NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo -e "${GREEN}✅ 新密钥已生成（请手动更新到 server/.env）${NC}"
    echo -e "${YELLOW}   JWT_SECRET=$NEW_SECRET${NC}"
else
    echo -e "${GREEN}✅ JWT_SECRET 已配置${NC}"
fi

# 7. 构建前端（可选）
echo ""
read -p "是否现在构建前端？(y/n): " build_frontend
if [ "$build_frontend" = "y" ] || [ "$build_frontend" = "Y" ]; then
    echo "🏗️  构建前端..."
    cd client
    npm run build
    cd ..
    if [ -d "client/dist" ]; then
        echo -e "${GREEN}✅ 前端构建成功${NC}"
    else
        echo -e "${RED}❌ 前端构建失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  跳过前端构建${NC}"
fi

# 8. 总结
echo ""
echo "================================"
echo -e "${GREEN}✅ 初始化完成！${NC}"
echo ""
echo "下一步："
echo "1. 编辑 server/.env，设置所有必需的环境变量"
echo "2. 确保MongoDB已启动"
echo "3. 选择部署方式："
echo "   - Docker: docker-compose up -d"
echo "   - PM2: cd server && pm2 start server.js"
echo ""
echo "详细部署指南: DEPLOY.md"

