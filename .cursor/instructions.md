# GraphTutor 项目优化指令

## 🎯 核心优化目标

1. **保持代码整洁和可维护**：遵循最佳实践，提高代码质量
2. **确保高性能和低延迟**：API响应时间 < 500ms，页面加载 < 2s
3. **实现高测试覆盖率**：单元测试覆盖率 > 80%
4. **遵循安全最佳实践**：OWASP Top 10防护，输入验证
5. **提供优秀用户体验**：响应式设计，友好错误提示

## 📋 开发原则

### 代码质量原则
1. **优先考虑代码可读性和可维护性**
   - 函数长度不超过50行
   - 圈复杂度不超过10
   - 嵌套深度不超过3层
   - 添加清晰的注释和文档

2. **遵循测试驱动开发(TDD)原则**
   - 新功能先写测试
   - 测试覆盖率 > 80%
   - 包含边界测试和错误场景

3. **保持向后兼容性**
   - 不破坏现有API
   - 新功能使用版本化路径
   - 数据迁移支持回滚

4. **优化性能和安全**
   - API响应时间 < 500ms
   - 所有输入必须验证
   - 敏感操作需要权限检查

## 🔧 代码生成规则

### 后端代码规范

```javascript
// ✅ 好的实践
/**
 * 创建题目
 * @param {Object} questionData - 题目数据
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 创建的题目
 */
export async function createQuestion(questionData, userId) {
  try {
    // 输入验证
    validateQuestionData(questionData);
    
    // 权限检查
    await checkPermission(userId, 'question:create');
    
    // 业务逻辑
    const question = await Question.create({
      ...questionData,
      managerId: userId,
    });
    
    return question;
  } catch (error) {
    // 错误处理和日志
    logger.error('创建题目失败', { error, userId });
    throw error;
  }
}
```

**要求**：
- 使用 `async/await` 处理异步
- 添加适当的错误处理（try-catch）
- 实现输入验证
- 记录关键操作日志
- 添加JSDoc注释
- 权限检查中间件

### 前端代码规范

```javascript
// ✅ 好的实践
/**
 * 题目列表组件
 * @param {Object} props - 组件属性
 */
export function QuestionList({ bankId, onSelect }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const response = await api.get(`/api/v3/questions`, {
          params: { bankId },
        });
        setQuestions(response.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, [bankId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="question-list">
      {questions.map((q) => (
        <QuestionCard key={q._id} question={q} onSelect={onSelect} />
      ))}
    </div>
  );
}
```

**要求**：
- 使用函数式组件和Hooks
- 实现响应式设计（Tailwind CSS）
- 添加加载状态和错误处理
- 优化组件性能（useMemo, useCallback）
- 使用TypeScript类型（如果使用TS）

### 测试代码规范

```javascript
// ✅ 好的实践
describe('createQuestion', () => {
  it('应该成功创建题目', async () => {
    const questionData = {
      content: '测试题目',
      options: ['A', 'B', 'C'],
      answerIndex: 0,
    };
    
    const question = await createQuestion(questionData, 'user123');
    
    expect(question).toHaveProperty('_id');
    expect(question.content).toBe(questionData.content);
  });

  it('应该拒绝无效输入', async () => {
    await expect(
      createQuestion({}, 'user123')
    ).rejects.toThrow('题干不能为空');
  });

  it('应该检查权限', async () => {
    await expect(
      createQuestion(validData, 'unauthorized_user')
    ).rejects.toThrow('权限不足');
  });
});
```

**要求**：
- 覆盖率目标：80%+
- 包括边界测试
- 模拟外部依赖
- 测试错误场景
- 测试异步操作

## 🚨 自动优化策略

### 检测到以下情况时自动优化：

#### 代码质量
1. **函数超过50行** → 分解为小函数
2. **重复代码超过3处** → 提取为公共函数
3. **缺少错误处理** → 添加try-catch
4. **缺乏注释** → 添加JSDoc注释
5. **圈复杂度 > 10** → 重构降低复杂度

#### 性能
1. **API响应时间 > 500ms** → 添加缓存或优化查询
2. **页面加载时间 > 3s** → 代码分割或懒加载
3. **内存使用持续增长** → 内存泄漏检测
4. **数据库查询慢** → 添加索引或优化查询

#### 测试
1. **新代码无测试** → 自动生成测试用例
2. **覆盖率 < 80%** → 添加缺失测试
3. **测试运行慢** → 优化测试策略
4. **测试不稳定** → 修复flaky测试

#### 安全
1. **缺少输入验证** → 添加验证中间件
2. **敏感信息暴露** → 移除或加密
3. **SQL注入风险** → 使用参数化查询
4. **XSS漏洞** → 输出转义

## 📊 优化优先级

### P0: 功能正确性和安全性
- 功能Bug修复
- 安全漏洞修复
- 数据丢失风险
- 系统崩溃问题

### P1: 性能和用户体验
- API响应时间优化
- 页面加载优化
- 用户体验改进
- 错误提示优化

### P2: 代码质量和可维护性
- 代码重构
- 测试覆盖率提升
- 文档完善
- 技术债务清理

### P3: 技术债务和文档
- 代码注释补充
- 文档更新
- 依赖升级
- 工具优化

## 💡 与Cursor交互的最佳实践

### 1. 明确需求
提供完整的上下文信息：
- 项目类型和当前阶段
- 相关文件和功能
- 具体需求和约束
- 期望的输出格式

### 2. 分步实施
一次只解决一个问题：
- 先实现核心功能
- 再添加优化和测试
- 最后完善文档

### 3. 验证结果
总是要求添加测试：
- 单元测试
- 集成测试
- 边界测试
- 错误场景测试

### 4. 持续改进
基于反馈优化：
- 性能监控
- 用户反馈
- 代码审查
- 测试结果

## 🔍 代码审查检查清单

### 功能检查
- [ ] 功能按需求实现
- [ ] 边界情况处理
- [ ] 错误处理完善
- [ ] 权限验证正确

### 代码质量
- [ ] 代码可读性好
- [ ] 函数长度合理
- [ ] 复杂度适中
- [ ] 注释清晰

### 测试覆盖
- [ ] 单元测试通过
- [ ] 覆盖率达标
- [ ] 集成测试通过
- [ ] 性能测试通过

### 安全合规
- [ ] 输入验证
- [ ] 权限检查
- [ ] 敏感数据保护
- [ ] 日志记录

## 📝 常见优化场景

### 场景1：API响应慢
```javascript
// ❌ 问题代码
router.get('/questions', async (req, res) => {
  const questions = await Question.find({});
  // 没有索引，全表扫描
  res.json(questions);
});

// ✅ 优化后
router.get('/questions', async (req, res) => {
  const questions = await Question.find({})
    .select('content difficulty') // 只选择需要的字段
    .limit(20) // 限制数量
    .lean(); // 返回纯对象，更快
  res.json(questions);
});
```

### 场景2：复杂函数
```javascript
// ❌ 问题代码（函数过长，逻辑复杂）
async function processQuestion(data) {
  // 50+ 行代码
  // 多个嵌套if
  // 重复逻辑
}

// ✅ 优化后（拆分为小函数）
async function processQuestion(data) {
  const validated = validateQuestionData(data);
  const enriched = await enrichQuestionData(validated);
  const saved = await saveQuestion(enriched);
  return saved;
}
```

### 场景3：缺少错误处理
```javascript
// ❌ 问题代码
router.post('/questions', async (req, res) => {
  const question = await Question.create(req.body);
  res.json(question);
});

// ✅ 优化后
router.post('/questions', async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.json({ success: true, data: question });
  } catch (error) {
    logger.error('创建题目失败', { error, body: req.body });
    res.status(500).json({ 
      success: false, 
      message: '创建题目失败' 
    });
  }
});
```

---

**文档版本**：v1.0  
**最后更新**：2025年  
**维护者**：GraphTutor开发团队

