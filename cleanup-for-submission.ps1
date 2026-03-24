# GraphTutor 项目清理脚本 - 提交作业前使用
# 功能：清理所有第三方库、构建产物和运行时生成的文件
# 使用方法：.\cleanup-for-submission.ps1

Write-Host "🧹 GraphTutor 项目清理脚本" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

$removedItems = @()

# 1. 清理 node_modules 目录
Write-Host "📦 清理 node_modules 目录..." -ForegroundColor Yellow
$nodeModulesDirs = @(
    ".\node_modules",
    ".\client\node_modules",
    ".\server\node_modules",
    ".\server\client\node_modules"
)

foreach ($dir in $nodeModulesDirs) {
    if (Test-Path $dir) {
        Write-Host "  删除: $dir" -ForegroundColor Gray
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        $removedItems += $dir
    }
}

# 2. 清理构建产物
Write-Host "`n🏗️  清理构建产物..." -ForegroundColor Yellow
$buildDirs = @(
    ".\client\dist",
    ".\client\build",
    ".\server\dist",
    ".\server\build"
)

foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Write-Host "  删除: $dir" -ForegroundColor Gray
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        $removedItems += $dir
    }
}

# 3. 清理环境变量文件
Write-Host "`n🔐 清理环境变量文件..." -ForegroundColor Yellow
$envFiles = @(
    ".\.env",
    ".\client\.env",
    ".\server\.env",
    ".\client\.env.local",
    ".\client\.env.production",
    ".\client\.env.development"
)

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "  删除: $file" -ForegroundColor Gray
        Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
        $removedItems += $file
    }
}

# 4. 清理日志文件
Write-Host "`n📝 清理日志文件..." -ForegroundColor Yellow
$logFiles = Get-ChildItem -Path . -Filter "*.log" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules" }
foreach ($file in $logFiles) {
    Write-Host "  删除: $file" -ForegroundColor Gray
    Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
    $removedItems += $file.FullName
}

# 5. 清理临时文件
Write-Host "`n🗑️  清理临时文件..." -ForegroundColor Yellow
$tempPatterns = @("*.tmp", "*.temp", "*.cache", ".DS_Store", "Thumbs.db")
foreach ($pattern in $tempPatterns) {
    $files = Get-ChildItem -Path . -Filter $pattern -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules" }
    foreach ($file in $files) {
        Write-Host "  删除: $file" -ForegroundColor Gray
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
        $removedItems += $file.FullName
    }
}

# 6. 清理编辑器配置文件（可选，根据需要取消注释）
# Write-Host "`n⚙️  清理编辑器配置..." -ForegroundColor Yellow
# $editorDirs = @(".vscode", ".idea", "*.swp", "*.swo", "*~")
# foreach ($item in $editorDirs) {
#     if (Test-Path $item) {
#         Write-Host "  删除: $item" -ForegroundColor Gray
#         Remove-Item -Path $item -Recurse -Force -ErrorAction SilentlyContinue
#         $removedItems += $item
#     }
# }

# 7. 清理数据库备份JSON文件（在server目录下）
Write-Host "`n💾 清理数据库备份JSON文件..." -ForegroundColor Yellow
$backupFiles = Get-ChildItem -Path ".\server" -Filter "backup-*.json" -ErrorAction SilentlyContinue
foreach ($file in $backupFiles) {
    Write-Host "  删除: $file" -ForegroundColor Gray
    Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
    $removedItems += $file.FullName
}

# 总结
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "✅ 清理完成！" -ForegroundColor Green
Write-Host "`n已删除 $($removedItems.Count) 个项目" -ForegroundColor Green
Write-Host "`n📋 数据库导出位置：" -ForegroundColor Cyan
Write-Host "   nusql\GraphTutor_MongoDB_资料包\backup\" -ForegroundColor Yellow
Write-Host "`n💡 提示：" -ForegroundColor Cyan
Write-Host "   - 数据库备份已保留在 backup 目录中" -ForegroundColor Gray
Write-Host "   - 如需重新安装依赖，运行: npm run setup" -ForegroundColor Gray
Write-Host "   - 提交前请检查 .gitignore 文件" -ForegroundColor Gray

