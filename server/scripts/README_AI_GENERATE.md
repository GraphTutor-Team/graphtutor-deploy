# AI批量生成题目脚本使用说明

## 功能说明

`batch-generate-questions.js` 脚本可以自动使用AI为系统中的所有学科批量生成题目。

## 配置要求

### 1. 配置AI API密钥

在项目根目录创建 `.env` 文件（如果不存在），添加以下配置之一：

```env
# 方式1：使用OpenAI API
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini  # 可选，默认使用 gpt-4o-mini

# 方式2：使用兼容OpenAI的API（如千问、通义千问等）
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.example.com/v1  # API基础URL
LLM_MODEL=gpt-4o-mini  # 模型名称
```

### 2. 配置数据库连接（可选）

如果数据库不在默认位置，也需要在 `.env` 中配置：

```env
MONGODB_URI=mongodb://127.0.0.1:27017/graphtutor
```

## 使用方法

### 基本使用

```bash
node server/scripts/batch-generate-questions.js
```

### 自定义配置

编辑 `batch-generate-questions.js` 文件中的 `GENERATION_CONFIG` 对象：

```javascript
const GENERATION_CONFIG = {
  // 每个二级学科生成多少题
  perSubject: {
    count: 10,  // 改为你想要的数量
    difficulties: [1, 2, 3, 4, 5],  // 难度分布
  },
  
  // 每个三级学科生成多少题
  perSubSubject: {
    count: 5,
    difficulties: [2, 3, 4],
  },
  
  // 是否只生成二级学科（跳过三级学科）
  onlyLevel2: false,
  
  // 是否创建新题库
  createNewBank: true,
  
  // 题库名称前缀
  bankNamePrefix: 'AI生成题库',
};
```

## 生成策略

脚本会：

1. **连接数据库**：自动连接到MongoDB
2. **获取学科列表**：获取所有启用的学科（二级和三级）
3. **生成题目**：
   - 为每个二级学科生成指定数量的题目
   - 为每个三级学科生成指定数量的题目（如果启用）
   - 按照配置的难度分布生成
4. **保存题目**：
   - 自动创建或使用题库
   - 为每道题生成唯一的qid
   - 关联到对应的学科
5. **统计信息**：显示详细的生成统计

## 注意事项

1. **API成本**：生成大量题目会消耗AI API的token，请注意成本
2. **生成速度**：脚本会在每次API调用后延迟1秒，避免限流
3. **题目质量**：AI生成的题目建议人工审核后再使用
4. **错误处理**：如果某个学科生成失败，脚本会继续处理其他学科

## 示例输出

```
🚀 开始批量AI生成题目...

正在连接数据库...
✅ 数据库连接成功

✅ 使用管理员账户: admin

📚 找到 113 个学科

📊 学科统计:
   一级学科: 10 个
   二级学科: 74 个
   三级学科: 29 个

🔄 开始处理二级学科...

📝 📊 CS-DS - 数据结构
      ✅ [难度1] 什么是数组的基本特点？...
      ✅ [难度2] 链表和数组的主要区别是...
      📊 完成: 成功 10 道，失败 0 道

...

📊 ========== 生成统计 ==========
   处理学科数: 103
   成功生成: 1030 道题
   失败: 0 道题

   难度分布:
     难度 1: 206 道题
     难度 2: 206 道题
     ...

✨ 批量生成完成！
```

## 故障排除

### 错误：未配置 AI API密钥

确保在 `.env` 文件中配置了 `LLM_API_KEY` 或 `OPENAI_API_KEY`。

### 错误：未找到管理员用户

确保数据库中至少有一个角色为 `admin` 的用户。

### API调用失败

- 检查API密钥是否正确
- 检查网络连接
- 检查API服务是否可用
- 查看控制台输出的详细错误信息

## 相关文件

- `server/src/services/ai/openAIService.js` - AI服务实现
- `server/src/routes/v3/ai.js` - AI API路由
- `server/scripts/init-computer-subjects.js` - 学科初始化脚本

