#!/bin/bash
# GraphTutor V3.0 - 一键部署脚本

set -e

echo "🚀 GraphTutor V3.0 部署脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 未安装，请先安装 $1${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ $1 已安装${NC}"
}

# 检查必需命令
echo "📋 检查环境..."
check_command node
check_command npm

# 检查环境变量文件
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  server/.env 不存在，从示例文件创建...${NC}"
    if [ -f "server/env.example" ]; then
        cp server/env.example server/.env
        echo -e "${YELLOW}⚠️  请编辑 server/.env 文件，设置必需的环境变量！${NC}"
        echo -e "${YELLOW}   特别是 JWT_SECRET 和 JWT_REFRESH_SECRET${NC}"
        read -p "按回车键继续（确保已配置环境变量）..."
    else
        echo -e "${RED}❌ server/env.example 不存在${NC}"
        exit 1
    fi
fi

# 选择部署方式
echo ""
echo "请选择部署方式："
echo "1) Docker Compose（推荐）"
echo "2) PM2 + Nginx（传统方式）"
echo "3) 仅构建前端"
read -p "请输入选项 (1-3): " deploy_option

case $deploy_option in
    1)
        echo ""
        echo "🐳 使用 Docker Compose 部署..."
        
        check_command docker
        check_command docker-compose
        
        # 构建前端
        echo ""
        echo "📦 构建前端..."
        cd client
        npm install
        npm run build
        cd ..
        
        if [ ! -d "client/dist" ]; then
            echo -e "${RED}❌ 前端构建失败：dist目录不存在${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ 前端构建成功${NC}"
        
        # Docker部署
        echo ""
        echo "🐳 启动Docker容器..."
        docker-compose down 2>/dev/null || true
        docker-compose up -d --build
        
        echo ""
        echo -e "${GREEN}✅ 部署完成！${NC}"
        echo ""
        echo "访问地址："
        echo "  前端: http://localhost"
        echo "  API: http://localhost/api"
        echo "  健康检查: http://localhost/api/health"
        echo ""
        echo "查看日志: docker-compose logs -f"
        ;;
        
    2)
        echo ""
        echo "🖥️  使用 PM2 + Nginx 部署..."
        
        check_command pm2
        
        # 安装依赖
        echo ""
        echo "📦 安装依赖..."
        npm run setup
        
        # 构建前端
        echo ""
        echo "📦 构建前端..."
        cd client
        npm run build
        cd ..
        
        if [ ! -d "client/dist" ]; then
            echo -e "${RED}❌ 前端构建失败：dist目录不存在${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ 前端构建成功${NC}"
        
        # 启动后端
        echo ""
        echo "🚀 启动后端服务..."
        cd server
        pm2 delete graphtutor-server 2>/dev/null || true
        pm2 start server.js --name graphtutor-server
        pm2 save
        cd ..
        
        echo ""
        echo -e "${GREEN}✅ 后端服务已启动${NC}"
        echo ""
        echo "下一步："
        echo "1. 配置Nginx（参考 部署指南.md）"
        echo "2. 设置Nginx指向 client/dist 目录"
        echo "3. 配置API代理到 http://localhost:5000"
        echo ""
        echo "查看PM2状态: pm2 list"
        echo "查看日志: pm2 logs graphtutor-server"
        ;;
        
    3)
        echo ""
        echo "📦 仅构建前端..."
        cd client
        npm install
        npm run build
        cd ..
        
        if [ ! -d "client/dist" ]; then
            echo -e "${RED}❌ 前端构建失败${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ 前端构建成功${NC}"
        echo "构建产物位于: client/dist"
        ;;
        
    *)
        echo -e "${RED}❌ 无效选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 完成！${NC}"

