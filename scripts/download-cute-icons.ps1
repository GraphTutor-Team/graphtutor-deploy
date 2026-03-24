# GraphTutor V3.0 - 下载温馨可爱图标包脚本 (PowerShell)
# 
# 从多个来源下载图标资源

Write-Host "🎨 开始下载温馨可爱的图标包..." -ForegroundColor Cyan
Write-Host ""

# 创建图标目录
$ICONS_DIR = "client/src/assets/icons"
if (-not (Test-Path $ICONS_DIR)) {
    New-Item -ItemType Directory -Path $ICONS_DIR -Force | Out-Null
}

Write-Host "📁 图标目录: $ICONS_DIR" -ForegroundColor Green
Write-Host ""

# 方法1: 使用 npm 安装图标库（推荐）
Write-Host "📦 方法1: 安装 npm 图标包..." -ForegroundColor Yellow
Set-Location client

# 安装 Tabler Icons
Write-Host "正在安装 @tabler/icons-react..." -ForegroundColor Yellow
npm install @tabler/icons-react --save

# 安装 Lucide Icons
Write-Host "正在安装 lucide-react..." -ForegroundColor Yellow
npm install lucide-react --save

Set-Location ..

Write-Host ""
Write-Host "✅ 图标库安装完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📝 使用方法：" -ForegroundColor Cyan
Write-Host "   import { IconBook } from '@tabler/icons-react';"
Write-Host "   import { BookOpen } from 'lucide-react';"
Write-Host ""
Write-Host "💡 提示：图标已通过 npm 安装，可以直接在代码中使用！" -ForegroundColor Yellow

