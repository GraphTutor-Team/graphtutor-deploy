#!/bin/bash
# GraphTutor 项目清理脚本 - 提交作业前使用
# 功能：清理所有第三方库、构建产物和运行时生成的文件
# 使用方法：chmod +x cleanup-for-submission.sh && ./cleanup-for-submission.sh

echo "🧹 GraphTutor 项目清理脚本"
echo "============================================================"
echo ""

removed_count=0

# 1. 清理 node_modules 目录
echo "📦 清理 node_modules 目录..."
for dir in "./node_modules" "./client/node_modules" "./server/node_modules" "./server/client/node_modules"; do
    if [ -d "$dir" ]; then
        echo "  删除: $dir"
        rm -rf "$dir"
        ((removed_count++))
    fi
done

# 2. 清理构建产物
echo ""
echo "🏗️  清理构建产物..."
for dir in "./client/dist" "./client/build" "./server/dist" "./server/build"; do
    if [ -d "$dir" ]; then
        echo "  删除: $dir"
        rm -rf "$dir"
        ((removed_count++))
    fi
done

# 3. 清理环境变量文件
echo ""
echo "🔐 清理环境变量文件..."
for file in "./.env" "./client/.env" "./server/.env" "./client/.env.local" "./client/.env.production" "./client/.env.development"; do
    if [ -f "$file" ]; then
        echo "  删除: $file"
        rm -f "$file"
        ((removed_count++))
    fi
done

# 4. 清理日志文件
echo ""
echo "📝 清理日志文件..."
find . -name "*.log" -type f ! -path "*/node_modules/*" -exec rm -f {} \; -print | while read file; do
    if [ -n "$file" ]; then
        echo "  删除: $file"
        ((removed_count++))
    fi
done

# 5. 清理临时文件
echo ""
echo "🗑️  清理临时文件..."
for pattern in "*.tmp" "*.temp" "*.cache" ".DS_Store" "Thumbs.db"; do
    find . -name "$pattern" -type f ! -path "*/node_modules/*" -exec rm -f {} \; -print | while read file; do
        if [ -n "$file" ]; then
            echo "  删除: $file"
            ((removed_count++))
        fi
    done
done

# 6. 清理数据库备份JSON文件（在server目录下）
echo ""
echo "💾 清理数据库备份JSON文件..."
find ./server -name "backup-*.json" -type f -exec rm -f {} \; -print | while read file; do
    if [ -n "$file" ]; then
        echo "  删除: $file"
        ((removed_count++))
    fi
done

# 总结
echo ""
echo "============================================================"
echo "✅ 清理完成！"
echo ""
echo "已删除 $removed_count 个项目"
echo ""
echo "📋 数据库导出位置："
echo "   nusql/GraphTutor_MongoDB_资料包/backup/"
echo ""
echo "💡 提示："
echo "   - 数据库备份已保留在 backup 目录中"
echo "   - 如需重新安装依赖，运行: npm run setup"
echo "   - 提交前请检查 .gitignore 文件"

