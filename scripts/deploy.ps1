# GraphTutor V3.0 - Windows部署脚本

$ErrorActionPreference = "Stop"

Write-Host "🚀 开始部署 GraphTutor V3.0..." -ForegroundColor Green

# 检查环境变量
if (-not $env:NODE_ENV) {
    $env:NODE_ENV = "production"
}

# 安装依赖
Write-Host "📦 安装依赖..." -ForegroundColor Yellow
npm ci
Set-Location client
npm ci
Set-Location ..
Set-Location server
npm ci
Set-Location ..

# 构建前端
Write-Host "🏗️  构建前端..." -ForegroundColor Yellow
Set-Location client
npm run build
Set-Location ..

# 检查构建结果
if (-not (Test-Path "client/dist")) {
    Write-Host "❌ 前端构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 构建完成" -ForegroundColor Green

# 如果使用Docker
if ($env:USE_DOCKER -eq "true") {
    Write-Host "🐳 使用Docker部署..." -ForegroundColor Yellow
    docker-compose up -d --build
    Write-Host "✅ Docker部署完成" -ForegroundColor Green
} else {
    Write-Host "📝 请手动启动服务：" -ForegroundColor Yellow
    Write-Host "  后端: cd server && npm start"
    Write-Host "  前端: 使用nginx或其他静态服务器服务 client/dist"
}

Write-Host "🎉 部署完成！" -ForegroundColor Green

