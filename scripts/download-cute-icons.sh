#!/bin/bash

# GraphTutor V3.0 - 下载温馨可爱图标包脚本
# 
# 从多个来源下载图标资源

echo "🎨 开始下载温馨可爱的图标包..."
echo ""

# 创建图标目录
ICONS_DIR="client/src/assets/icons"
mkdir -p "$ICONS_DIR"

echo "📁 图标目录: $ICONS_DIR"
echo ""

# 方法1: 使用 npm 安装图标库（推荐）
echo "📦 方法1: 安装 npm 图标包..."
cd client

# 安装 Tabler Icons
echo "正在安装 @tabler/icons-react..."
npm install @tabler/icons-react --save

# 安装 Lucide Icons
echo "正在安装 lucide-react..."
npm install lucide-react --save

cd ..

echo ""
echo "✅ 图标库安装完成！"
echo ""
echo "📝 使用方法："
echo "   import { IconBook } from '@tabler/icons-react';"
echo "   import { BookOpen } from 'lucide-react';"
echo ""
echo "💡 提示：图标已通过 npm 安装，可以直接在代码中使用！"

