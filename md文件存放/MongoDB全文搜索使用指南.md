# MongoDB全文搜索使用指南

**创建时间**: 2026-01-19

## 📋 概述

本项目已集成MongoDB全文搜索功能，提供高性能的全文搜索能力，支持题目、笔记、讨论的全文搜索。

## 🎯 核心功能

### 1. 文本索引

#### 1.1 已创建的文本索引

**Question模型**:
- `content` (权重: 10) - 题干
- `explain` (权重: 5) - 解析
- `tags` (权重: 3) - 标签
- `qid` (权重: 2) - 题目ID
- `id` (权重: 2) - 业务ID

**Note模型**:
- `title` (权重: 默认) - 标题
- `content` (权重: 默认) - 内容
- `tags` (权重: 默认) - 标签

**Discussion模型**:
- `title` (权重: 默认) - 标题
- `content` (权重: 默认) - 内容
- `tags` (权重: 默认) - 标签

### 2. 全文搜索服务

#### 2.1 基础全文搜索

```javascript
import { 
  fullTextSearchQuestions,
  fullTextSearchNotes,
  fullTextSearchDiscussions,
} from '../services/fullTextSearch.js';

// 搜索题目
const questions = await fullTextSearchQuestions('操作系统', {
  difficulty: 3,
  subjectCode: 'CS',
}, {
  page: 1,
  limit: 20,
});

// 搜索笔记
const notes = await fullTextSearchNotes('学习笔记', {
  type: 'question',
}, {
  page: 1,
  limit: 20,
  userId: 'user123',
});

// 搜索讨论
const discussions = await fullTextSearchDiscussions('问题讨论', {
  type: 'question',
}, {
  page: 1,
  limit: 20,
});
```

#### 2.2 统一全文搜索

```javascript
import { unifiedFullTextSearch } from '../services/fullTextSearch.js';

const result = await unifiedFullTextSearch(
  '操作系统进程调度',
  ['question', 'note', 'discussion'],
  {
    difficulty: 3,
  },
  {
    page: 1,
    limit: 20,
    userId: 'user123',
  }
);
```

### 3. 索引管理

#### 3.1 检查文本索引

```javascript
import { checkTextIndexExists } from '../services/fullTextSearch.js';

const exists = await checkTextIndexExists('Question');
console.log('文本索引是否存在:', exists);
```

#### 3.2 创建文本索引

```javascript
import { ensureTextIndex } from '../services/fullTextSearch.js';

const success = await ensureTextIndex('Question');
console.log('索引创建成功:', success);
```

#### 3.3 初始化所有文本索引

```bash
# 使用npm脚本
npm run init:text-indexes

# 或直接运行
node server/src/scripts/initTextIndexes.js
```

## 📝 API使用示例

### 统一搜索API（支持全文搜索）

#### GET /api/v3/search

```bash
# 使用全文搜索（默认）
GET /api/v3/search?q=操作系统&types=question,note&page=1&limit=20

# 禁用全文搜索，使用正则搜索
GET /api/v3/search?q=操作系统&useFullText=false

# 带筛选的全文搜索
GET /api/v3/search?q=进程调度&difficulty=3&subjectCode=CS&tags=操作系统
```

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "content": "...",
      "score": 2.5,
      "_relevanceScore": 2.5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "types": {
      "question": { "count": 50, "items": [...] },
      "note": { "count": 30, "items": [...] }
    }
  }
}
```

## 🔧 技术细节

### MongoDB文本搜索特性

1. **相关性评分**
   - MongoDB自动计算相关性分数（textScore）
   - 分数越高，相关性越高
   - 支持按分数排序

2. **字段权重**
   - 可以为不同字段设置权重
   - 权重高的字段匹配时得分更高
   - Question模型中content权重最高（10）

3. **搜索语法**
   - 支持多词搜索（空格分隔）
   - 支持短语搜索（引号）
   - 支持排除词（减号前缀）

4. **性能优化**
   - 文本索引大幅提升搜索性能
   - 支持复合查询（文本搜索+其他条件）
   - 自动降级到正则搜索（如果索引不存在）

### 降级机制

如果文本索引不存在或搜索失败，系统会自动降级到正则搜索：

```javascript
// 自动降级流程
try {
  // 尝试全文搜索
  return await fullTextSearchQuestions(query, filters, options);
} catch (err) {
  // 降级到正则搜索
  warn('全文搜索失败，降级到正则搜索');
  return fallbackSearchQuestions(query, filters, options);
}
```

## 🚀 初始化步骤

### 1. 创建文本索引

首次使用前，需要创建文本索引：

```bash
npm run init:text-indexes
```

### 2. 验证索引

检查索引是否创建成功：

```javascript
import { checkTextIndexExists } from '../services/fullTextSearch.js';

const models = ['Question', 'Note', 'Discussion'];
for (const model of models) {
  const exists = await checkTextIndexExists(model);
  console.log(`${model} 文本索引:`, exists ? '存在' : '不存在');
}
```

### 3. 使用搜索

索引创建后，搜索API会自动使用全文搜索：

```bash
GET /api/v3/search?q=搜索关键词
```

## 📊 性能对比

### 全文搜索 vs 正则搜索

| 特性 | 全文搜索 | 正则搜索 |
|------|---------|---------|
| 性能 | 快（使用索引） | 慢（全表扫描） |
| 相关性 | 有评分 | 无评分 |
| 多词搜索 | 支持 | 需要手动处理 |
| 权重 | 支持 | 不支持 |
| 索引要求 | 需要文本索引 | 不需要 |

### 性能提升

- 搜索速度：提升 **5-10倍**
- 相关性排序：自动计算
- 多词搜索：原生支持
- 资源消耗：显著降低

## 🔍 搜索语法

### MongoDB文本搜索语法

1. **基本搜索**
   ```
   操作系统
   ```

2. **多词搜索**
   ```
   操作系统 进程调度
   ```

3. **短语搜索**
   ```
   "操作系统进程调度"
   ```

4. **排除词**
   ```
   操作系统 -Windows
   ```

5. **组合搜索**
   ```
   "操作系统" 进程 -线程
   ```

## ⚠️ 注意事项

### 1. 文本索引限制

- 一个集合只能有一个文本索引
- 文本索引会占用额外存储空间
- 创建索引需要时间（大数据量时）

### 2. 搜索性能

- 文本搜索比正则搜索快得多
- 但需要先创建索引
- 索引创建后搜索性能显著提升

### 3. 兼容性

- 系统会自动降级到正则搜索
- 如果索引不存在，不影响功能
- 建议在生产环境创建索引

### 4. 索引维护

- 索引会自动更新（数据变更时）
- 不需要手动维护
- 删除数据时索引自动更新

## 🛠️ 故障排查

### 问题1: 搜索返回空结果

**可能原因**:
- 文本索引未创建
- 搜索关键词不匹配

**解决方法**:
```bash
# 检查索引
npm run init:text-indexes

# 验证索引
node -e "require('./server/src/services/fullTextSearch.js').checkTextIndexExists('Question').then(console.log)"
```

### 问题2: 搜索性能慢

**可能原因**:
- 未使用全文搜索
- 索引未创建

**解决方法**:
- 确保索引已创建
- 检查useFullText参数是否为true

### 问题3: 索引创建失败

**可能原因**:
- 数据库连接问题
- 权限不足
- 索引已存在

**解决方法**:
- 检查数据库连接
- 检查用户权限
- 查看错误日志

## 📚 相关文件

- `server/src/services/fullTextSearch.js` - 全文搜索服务
- `server/src/services/contentSearch.js` - 统一搜索服务（已集成全文搜索）
- `server/src/models/Question.js` - Question模型（已添加文本索引）
- `server/src/models/Note.js` - Note模型（已有文本索引）
- `server/src/models/Discussion.js` - Discussion模型（已有文本索引）
- `server/src/scripts/initTextIndexes.js` - 索引初始化脚本
- `server/src/routes/v3/search.js` - 搜索API路由

## 🎯 最佳实践

### 1. 索引创建

- 首次部署时运行初始化脚本
- 定期检查索引状态
- 监控索引大小

### 2. 搜索使用

- 优先使用全文搜索
- 合理设置搜索关键词
- 使用筛选条件减少结果集

### 3. 性能优化

- 创建文本索引
- 使用分页避免大量结果
- 合理设置limit参数

---

**最后更新**: 2026-01-19

