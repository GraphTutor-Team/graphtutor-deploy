# MongoDB 截图脚本使用说明

## 📋 简介

这些脚本用于自动化执行 MongoDB 操作，生成截图所需的输出文件，帮助完成 NoSQL 大作业的截图要求。

## 🚀 快速开始

### 方法1：使用快捷脚本（推荐）

```powershell
# 在项目根目录执行
.\tools\run-screenshot.ps1
```

### 方法2：直接运行主脚本

```powershell
# 在项目根目录执行
.\tools\screenshot-mongodb.ps1
```

### 方法3：手动执行 MongoDB 脚本

```powershell
# 使用独立的 JavaScript 脚本
mongosh graphtutor --file tools\mongodb-screenshot-script.js
```

## 📁 输出文件

脚本会在 `nusql/GraphTutor_MongoDB_资料包/screenshots/` 目录下生成以下文件：

- `mongodb_operations_output.txt` - 完整操作输出（所有操作的结果）
- `01_集合统计.txt` - 集合统计输出
- `02_索引创建.txt` - 索引信息输出
- `03_CRUD操作.txt` - CRUD操作输出
- `04_数据模型示例.txt` - 数据模型示例
- `截图指南.md` - 详细的截图指南

## 📸 截图步骤

### 1. 执行脚本生成输出文件

```powershell
.\tools\run-screenshot.ps1
```

### 2. 打开 MongoDB Shell 进行截图

```powershell
mongosh
use graphtutor
```

### 3. 按照以下步骤截图

#### 必须截图（核心要求）：

1. **集合统计**
   ```javascript
   show collections
   db.users.countDocuments()
   db.questions.countDocuments()
   // ... 其他集合
   ```

2. **索引创建**
   ```javascript
   db.users.getIndexes()
   db.questions.getIndexes()
   db.questionbanks.getIndexes()
   ```

3. **CRUD操作**
   - Find: `db.users.find({ role: "student" }).limit(5).pretty()`
   - Insert: 插入一条测试数据
   - Update: 更新测试数据
   - Delete: 删除测试数据

4. **数据库导出**
   ```powershell
   mongodump --host 127.0.0.1:27017 --db graphtutor --out ./backup
   ```

#### 推荐截图（加分项）：

- 查询性能分析: `db.questions.find({ difficulty: 3 }).explain("executionStats")`
- 数据模型示例: `db.users.findOne()`
- 聚合查询: 统计查询示例

## 🛠️ 脚本参数

```powershell
.\tools\screenshot-mongodb.ps1 [参数]

参数说明:
  -OutputDir <路径>     输出目录（默认: nusql/GraphTutor_MongoDB_资料包/screenshots）
  -DbName <数据库名>    数据库名称（默认: graphtutor）
  -AutoScreenshot       启用自动截图功能（实验性）
```

## 💡 使用技巧

1. **查看输出文件**：生成的 `.txt` 文件包含了所有操作的输出，可以作为参考
2. **截图工具**：使用 Windows 截图工具 (Win + Shift + S) 或 Snipping Tool
3. **标注重点**：在截图上标注关键信息（如索引名称、数据量等）
4. **多角度展示**：同一个操作可以从不同角度截图（命令、结果、统计）

## 📝 截图命名建议

- `01_集合统计.png`
- `02_索引创建.png`
- `03_CRUD查询.png`
- `04_CRUD插入.png`
- `05_CRUD更新.png`
- `06_CRUD删除.png`
- `07_聚合查询.png`
- `08_数据库导出.png`
- `09_查询性能分析.png`
- `10_数据模型示例.png`

## ⚠️ 注意事项

1. 确保 MongoDB 服务已启动
2. 确保 `mongosh` 命令可用
3. 确保数据库 `graphtutor` 存在且有数据
4. 脚本会插入测试数据，执行完成后会自动删除

## 🔧 故障排除

### 问题1：找不到 mongosh

```powershell
# 检查 MongoDB 是否安装
mongosh --version

# 如果未安装，请先安装 MongoDB
# https://www.mongodb.com/try/download/community
```

### 问题2：无法连接到数据库

```powershell
# 检查 MongoDB 服务是否运行
net start MongoDB

# 或者手动启动
mongod --dbpath "你的数据目录路径"
```

### 问题3：数据库不存在

```powershell
# 先运行项目初始化脚本
node server/scripts/seed.js
```

## 📚 相关文档

- [截图指导文档](../nusql/GraphTutor_MongoDB_资料包/截图指导.md)
- [操作指南](../nusql/GraphTutor_MongoDB_资料包/操作指南.md)

---

**祝截图顺利！** 📸

