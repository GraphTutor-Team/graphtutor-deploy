# GraphTutor MongoDB 截图辅助脚本
# 用途：自动执行 MongoDB 操作并生成截图所需的输出文件

param(
    [string]$OutputDir = "nusql/GraphTutor_MongoDB_资料包/screenshots",
    [string]$DbName = "graphtutor",
    [switch]$AutoScreenshot = $false
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 获取项目根目录
$projectRoot = Split-Path -Parent $PSScriptRoot
# 创建输出目录
$outputPath = Join-Path $projectRoot $OutputDir
if (-not (Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
    Write-Host "✅ 创建输出目录: $outputPath" -ForegroundColor Green
}

# 检查 mongosh 是否可用
try {
    $mongoshVersion = mongosh --version 2>&1
    Write-Host "✅ MongoDB Shell 已安装" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未找到 mongosh，请先安装 MongoDB" -ForegroundColor Red
    exit 1
}

# 生成 MongoDB 操作脚本
$mongoshScript = @"
// GraphTutor MongoDB 截图操作脚本
// 自动生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

use $DbName

print("=".repeat(80))
print("📊 1. 集合统计")
print("=".repeat(80))
print("\n所有集合列表:")
show collections

print("\n" + "=".repeat(80))
print("各集合数据量统计:")
print("=".repeat(80))

const collections = [
    "users", "questions", "questionbanks", "subjects", "records",
    "wrongquestions", "roleapplications", "quizsessions", "knowledgenodes",
    "groups", "learninggoals", "achievements", "studyplans", "reviewplans",
    "favorites", "favoritefolders", "notes"
]

collections.forEach(col => {
    try {
        const count = db[col].countDocuments()
        print(\`\${col}: \${count}\`)
    } catch(e) {
        print(\`\${col}: 集合不存在或查询失败\`)
    }
})

print("\n" + "=".repeat(80))
print("📑 2. 索引创建和验证")
print("=".repeat(80))

const indexCollections = ["users", "questions", "questionbanks", "wrongquestions", "studyplans"]

indexCollections.forEach(col => {
    print(\`\n\${col.toUpperCase()} 集合索引:\`)
    try {
        const indexes = db[col].getIndexes()
        printjson(indexes)
    } catch(e) {
        print(\`集合 \${col} 不存在\`)
    }
})

print("\n" + "=".repeat(80))
print("🔍 3. CRUD 操作示例")
print("=".repeat(80))

print("\n3.1 查询操作 (Find):")
print("-".repeat(80))
print("查询学生用户 (前5条):")
db.users.find({ role: "student" }).limit(5).pretty()

print("\n查询中等难度以上的题目 (前5条):")
db.questions.find({ difficulty: { \$gte: 3 } }).limit(5).pretty()

print("\n查询官方题库:")
db.questionbanks.find({ isOfficial: true }).pretty()

print("\n3.2 聚合查询示例:")
print("-".repeat(80))
print("统计各难度题目数量:")
db.questions.aggregate([
    { \$group: { _id: "\$difficulty", count: { \$sum: 1 } } },
    { \$sort: { _id: 1 } }
])

print("\n3.3 插入操作 (Insert):")
print("-".repeat(80))
print("插入测试题目...")
const insertResult = db.questions.insertOne({
    content: "测试题目：MongoDB是什么类型的数据库？",
    type: "single",
    options: ["关系型数据库", "NoSQL数据库", "图数据库", "时序数据库"],
    answerIndex: 1,
    answer: 1,
    difficulty: 1,
    subjectCode: "CS",
    explain: "MongoDB是NoSQL文档数据库",
    source: "bank",
    createdAt: new Date(),
    updatedAt: new Date()
})
print("插入结果:")
printjson(insertResult)

const testId = insertResult.insertedId

print("\n3.4 更新操作 (Update):")
print("-".repeat(80))
print("更新测试题目难度...")
const updateResult = db.questions.updateOne(
    { _id: testId },
    { \$set: { difficulty: 2, updatedAt: new Date() } }
)
print("更新结果:")
printjson(updateResult)

print("\n3.5 删除操作 (Delete):")
print("-".repeat(80))
print("删除测试题目...")
const deleteResult = db.questions.deleteOne({ _id: testId })
print("删除结果:")
printjson(deleteResult)

print("\n" + "=".repeat(80))
print("📈 4. 查询性能分析")
print("=".repeat(80))

print("\n查询执行计划分析:")
const explainResult = db.questions.find({ difficulty: 3, subjectCode: "CS-DS" }).explain("executionStats")
printjson({
    executionTimeMillis: explainResult.executionStats.executionTimeMillis,
    totalDocsExamined: explainResult.executionStats.totalDocsExamined,
    totalKeysExamined: explainResult.executionStats.totalKeysExamined,
    winningPlan: explainResult.queryPlanner.winningPlan
})

print("\n" + "=".repeat(80))
print("📄 5. 数据模型示例")
print("=".repeat(80))

const sampleCollections = ["users", "questions", "questionbanks", "wrongquestions", "studyplans"]

sampleCollections.forEach(col => {
    print(\`\n\${col.toUpperCase()} 集合文档示例:\`)
    try {
        const doc = db[col].findOne()
        if (doc) {
            printjson(doc)
        } else {
            print(\`集合 \${col} 为空\`)
        }
    } catch(e) {
        print(\`集合 \${col} 不存在\`)
    }
})

print("\n" + "=".repeat(80))
print("✅ 所有操作完成!")
print("=".repeat(80))
"@

# 保存 mongosh 脚本到临时文件
$scriptFile = Join-Path $env:TEMP "mongodb_screenshot_script.js"
$mongoshScript | Out-File -FilePath $scriptFile -Encoding UTF8

Write-Host "`n📝 开始执行 MongoDB 操作..." -ForegroundColor Cyan
Write-Host "输出目录: $outputPath`n" -ForegroundColor Gray

# 使用独立的 JavaScript 脚本文件（更可靠）
$jsScriptFile = Join-Path $PSScriptRoot "mongodb-screenshot-script.js"

# 执行 MongoDB 脚本并捕获输出
$outputFile = Join-Path $outputPath "mongodb_operations_output.txt"
try {
    if (Test-Path $jsScriptFile) {
        # 使用独立的 JS 文件
        mongosh $DbName --quiet --file $jsScriptFile | Tee-Object -FilePath $outputFile
    } else {
        # 回退到临时脚本文件
        mongosh $DbName --quiet --file $scriptFile | Tee-Object -FilePath $outputFile
    }
    
    Write-Host "`n✅ MongoDB 操作执行完成!" -ForegroundColor Green
    Write-Host "📄 输出已保存到: $outputFile" -ForegroundColor Cyan
    
    # 生成分步骤的输出文件
    Write-Host "`n📋 生成分步骤输出文件..." -ForegroundColor Cyan
    
    # 1. 集合统计
    $collectionsFile = Join-Path $outputPath "01_集合统计.txt"
    $collectionsScript = Join-Path $PSScriptRoot "mongodb-collections.js"
    if (Test-Path $collectionsScript) {
        mongosh $DbName --quiet --file $collectionsScript | Out-File -FilePath $collectionsFile -Encoding UTF8
    }
    
    # 2. 索引信息
    $indexesFile = Join-Path $outputPath "02_索引创建.txt"
    $indexesScript = Join-Path $PSScriptRoot "mongodb-indexes.js"
    if (Test-Path $indexesScript) {
        mongosh $DbName --quiet --file $indexesScript | Out-File -FilePath $indexesFile -Encoding UTF8
    }
    
    # 3. CRUD 操作
    $crudFile = Join-Path $outputPath "03_CRUD操作.txt"
    $crudScript = Join-Path $PSScriptRoot "mongodb-crud.js"
    if (Test-Path $crudScript) {
        mongosh $DbName --quiet --file $crudScript | Out-File -FilePath $crudFile -Encoding UTF8
    }
    
    # 4. 数据模型示例
    $modelsFile = Join-Path $outputPath "04_数据模型示例.txt"
    $modelsScript = Join-Path $PSScriptRoot "mongodb-models.js"
    if (Test-Path $modelsScript) {
        mongosh $DbName --quiet --file $modelsScript | Out-File -FilePath $modelsFile -Encoding UTF8
    }
    
    Write-Host "✅ 分步骤文件生成完成!" -ForegroundColor Green
    
    # 生成截图指南
    $guideFile = Join-Path $outputPath "截图指南.md"
    $guideContent = @"
# MongoDB 截图指南

## 📸 截图步骤

### 1. 打开 MongoDB Shell
\`\`\`powershell
mongosh
use graphtutor
\`\`\`

### 2. 执行以下操作并截图

#### 必须截图（核心要求）：
1. **集合统计** - 查看文件: \`01_集合统计.txt\`
   - 执行: \`show collections\`
   - 执行: \`db.users.countDocuments()\` 等统计命令

2. **索引创建** - 查看文件: \`02_索引创建.txt\`
   - 执行: \`db.users.getIndexes()\`
   - 执行: \`db.questions.getIndexes()\`

3. **CRUD操作** - 查看文件: \`03_CRUD操作.txt\`
   - Find: \`db.users.find({ role: "student" }).limit(5).pretty()\`
   - Insert: 插入一条测试数据
   - Update: 更新测试数据
   - Delete: 删除测试数据

4. **数据库导出**
   \`\`\`powershell
   mongodump --host 127.0.0.1:27017 --db graphtutor --out ./backup
   \`\`\`

### 3. 推荐截图（加分项）：
- 查询性能分析: \`db.questions.find({ difficulty: 3 }).explain("executionStats")\`
- 数据模型示例: \`db.users.findOne()\`
- 聚合查询: 统计查询示例

## 📁 输出文件说明

- \`mongodb_operations_output.txt\` - 完整操作输出
- \`01_集合统计.txt\` - 集合统计输出
- \`02_索引创建.txt\` - 索引信息输出
- \`03_CRUD操作.txt\` - CRUD操作输出
- \`04_数据模型示例.txt\` - 数据模型示例

## 💡 截图技巧

1. 使用 Windows 截图工具 (Win + Shift + S)
2. 确保命令和结果都清晰可见
3. 可以标注关键信息
4. 保存为 PNG 格式

## 📝 截图命名建议

- \`01_集合统计.png\`
- \`02_索引创建.png\`
- \`03_CRUD查询.png\`
- \`04_CRUD插入.png\`
- \`05_CRUD更新.png\`
- \`06_CRUD删除.png\`
- \`07_聚合查询.png\`
- \`08_数据库导出.png\`
- \`09_查询性能分析.png\`
- \`10_数据模型示例.png\`

---
生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
    $guideContent | Out-File -FilePath $guideFile -Encoding UTF8
    
    Write-Host "`n📖 截图指南已生成: $guideFile" -ForegroundColor Cyan
    
    # 如果启用了自动截图功能
    if ($AutoScreenshot) {
        Write-Host "`n📸 尝试自动截图..." -ForegroundColor Cyan
        # 这里可以集成截图工具，如 SnippingTool 或第三方工具
        Write-Host "提示: 可以使用 Windows 截图工具 (Win + Shift + S) 手动截图" -ForegroundColor Yellow
    }
    
    Write-Host "`n✨ 所有文件已生成完成!" -ForegroundColor Green
    Write-Host "📂 输出目录: $outputPath" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ 执行出错: $_" -ForegroundColor Red
    exit 1
} finally {
    # 清理临时文件
    if (Test-Path $scriptFile) {
        Remove-Item $scriptFile -Force
    }
}

