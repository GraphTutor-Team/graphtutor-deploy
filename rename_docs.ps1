# 批量重命名MD文件为中文名
# 执行: .\rename_docs.ps1

$files = @{
    "FEATURES_COMPLETE.md" = "完整功能文档.md"
    "TECHNICAL_DOCUMENTATION.md" = "技术文档.md"
    "DATABASE_DESIGN.md" = "数据库设计文档.md"
    "DEPLOYMENT_GUIDE.md" = "部署指南.md"
    "DEVELOPMENT_GUIDE.md" = "开发指南.md"
    "DOCUMENTATION_INDEX.md" = "文档索引.md"
    "QUICK_START.md" = "快速开始指南.md"
    "QUICK_START_V3.md" = "快速开始指南V3.md"
    "SUBMISSION_CHECKLIST.md" = "提交检查清单.md"
    "CHANGELOG_V3.0.md" = "更新日志.md"
    "TEST_SUMMARY.md" = "测试总结.md"
    "BEAUTIFICATION_AND_TESTING.md" = "美化与测试.md"
}

foreach ($oldName in $files.Keys) {
    $newName = $files[$oldName]
    if (Test-Path $oldName) {
        Write-Host "重命名: $oldName -> $newName"
        Rename-Item -Path $oldName -NewName $newName -Force
    } else {
        Write-Host "文件不存在: $oldName"
    }
}

Write-Host "完成！"
