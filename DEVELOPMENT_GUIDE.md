# GraphTutor V3.0 开发指南

> **版本**: 3.0.0  
> **目标读者**: 项目开发者

---

## 📋 目录

1. [开发环境设置](#开发环境设置)
2. [项目结构理解](#项目结构理解)
3. [开发工作流](#开发工作流)
4. [代码规范](#代码规范)
5. [测试指南](#测试指南)
6. [调试技巧](#调试技巧)
7. [常见开发任务](#常见开发任务)
8. [最佳实践](#最佳实践)

---

## 开发环境设置

### 1. 前置要求

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **MongoDB**: >= 4.4
- **Git**: 版本控制
- **IDE**: VS Code (推荐) 或 WebStorm

### 2. 克隆和安装

```bash
# 克隆项目
git clone <repository-url>
cd GraphTutor

# 安装依赖
npm run setup

# 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env 文件
```

### 3. IDE配置

#### VS Code推荐插件

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MongoDB for VS Code
- GitLens

#### VS Code设置

创建 `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "javascript.preferences.quoteStyle": "single",
  "typescript.preferences.quoteStyle": "single"
}
```

---

## 项目结构理解

### 关键目录

```
GraphTutor/
├── client/              # 前端React应用
│   ├── src/
│   │   ├── api/        # API客户端
│   │   ├── components/ # React组件
│   │   ├── pages/      # 页面组件
│   │   ├── hooks/      # 自定义Hooks
│   │   └── utils/      # 工具函数
│   └── public/         # 静态资源
│
├── server/             # 后端Express应用
│   ├── src/
│   │   ├── models/     # 数据模型
│   │   ├── routes/     # 路由定义
│   │   ├── services/   # 业务逻辑
│   │   ├── middleware/ # 中间件
│   │   └── utils/      # 工具函数
│   └── scripts/        # 数据库脚本
│
└── docs/               # 文档（如果有）
```

### 数据流理解

```
用户操作
  ↓
React组件 (client/src/pages/)
  ↓
API调用 (client/src/api/)
  ↓
HTTP请求
  ↓
Express路由 (server/src/routes/)
  ↓
中间件 (server/src/middleware/)
  ↓
服务层 (server/src/services/)
  ↓
数据模型 (server/src/models/)
  ↓
MongoDB数据库
```

---

## 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发流程

#### 添加新功能

1. **设计数据模型** (`server/src/models/`)
   ```javascript
   // 创建模型文件
   const schema = new mongoose.Schema({ ... });
   export default mongoose.model('ModelName', schema);
   ```

2. **创建服务层** (`server/src/services/`)
   ```javascript
   // 业务逻辑
   export async function createItem(data) {
     // 验证、处理、保存
   }
   ```

3. **创建路由** (`server/src/routes/v3/`)
   ```javascript
   router.post('/', requireAuth, async (req, res) => {
     // 调用服务层
   });
   ```

4. **创建API客户端** (`client/src/api/v3/`)
   ```javascript
   export async function createItem(data) {
     return api.post('/v3/items', data);
   }
   ```

5. **创建页面组件** (`client/src/pages/`)
   ```javascript
   export default function ItemPage() {
     // React组件
   }
   ```

6. **添加路由** (`client/src/config/routes.jsx`)
   ```javascript
   <Route path="/items" element={<ItemPage />} />
   ```

### 3. 提交代码

```bash
# 检查代码
npm run lint
npm run format

# 提交
git add .
git commit -m "feat: 添加新功能描述"
git push origin feature/your-feature-name
```

### 4. 代码审查

- 创建Pull Request
- 等待代码审查
- 根据反馈修改
- 合并到主分支

---

## 代码规范

### JavaScript/JSX规范

参考 `技术文档.md` 中的代码规范部分。

#### 关键要点

1. **命名规范**
   - 组件: PascalCase
   - 函数/变量: camelCase
   - 常量: UPPER_SNAKE_CASE

2. **组件结构**
   ```javascript
   /**
    * 组件描述
    */
   import { useState, useEffect } from 'react';
   
   export default function Component({ prop1, prop2 }) {
     // Hooks
     const [state, setState] = useState();
     
     // 副作用
     useEffect(() => {
       // ...
     }, []);
     
     // 事件处理
     const handleClick = () => {
       // ...
     };
     
     // 渲染
     return (
       <div>
         {/* JSX */}
       </div>
     );
   }
   ```

3. **错误处理**
   ```javascript
   try {
     // 操作
   } catch (error) {
     console.error('操作失败:', error);
     toast.error(error.message || '操作失败');
   }
   ```

### 后端规范

1. **路由组织**
   - 按功能模块划分
   - 使用RESTful风格
   - 统一错误处理

2. **服务层职责**
   - 业务逻辑
   - 数据验证
   - 数据库操作

3. **错误处理**
   ```javascript
   try {
     const result = await serviceFunction();
     res.json({ success: true, data: result });
   } catch (error) {
     console.error('操作失败:', error);
     res.status(500).json({
       success: false,
       message: error.message || '操作失败'
     });
   }
   ```

---

## 测试指南

### 1. 单元测试

#### 前端测试

```bash
cd client
npm run test
```

#### 后端测试

```bash
cd server
npm test
```

### 2. 集成测试

测试API端点：

```bash
# 使用Postman集合
# tools/postman/GraphTutor.postman_collection.json
```

### 3. 手动测试清单

- [ ] 功能正常工作
- [ ] 错误处理正确
- [ ] UI响应式设计
- [ ] 浏览器兼容性
- [ ] 性能可接受

---

## 调试技巧

### 1. 前端调试

#### React DevTools

安装React DevTools浏览器扩展。

#### 控制台调试

```javascript
// 使用console.log
console.log('数据:', data);

// 使用debugger
debugger; // 浏览器会在此暂停
```

#### 网络请求调试

使用浏览器开发者工具的Network标签。

### 2. 后端调试

#### Node.js调试

```bash
# 使用--inspect
node --inspect server.js

# VS Code中附加调试器
# 按F5启动调试
```

#### 日志调试

```javascript
console.log('调试信息:', data);
console.error('错误信息:', error);
```

#### MongoDB查询调试

```javascript
// 使用explain分析查询
const result = await Model.find(query).explain('executionStats');
console.log(result);
```

---

## 常见开发任务

### 1. 添加新的API端点

参考 `技术文档.md` 中的"常见问题"部分。

### 2. 添加新的页面

1. 创建页面组件
2. 添加到懒加载
3. 配置路由
4. 添加导航链接

### 3. 修改数据模型

1. 修改Schema
2. 创建迁移脚本（如需要）
3. 更新相关服务层
4. 更新API文档

### 4. 添加新的中间件

1. 创建中间件文件
2. 在 `app.js` 中注册
3. 应用到相应路由

---

## 最佳实践

### 1. 代码组织

- **单一职责**: 每个函数/组件只做一件事
- **DRY原则**: 不要重复代码
- **模块化**: 将功能拆分为独立模块

### 2. 性能优化

- **懒加载**: 路由和组件使用懒加载
- **代码分割**: 合理拆分代码包
- **缓存**: 合理使用缓存策略

### 3. 安全性

- **输入验证**: 始终验证用户输入
- **权限检查**: 检查用户权限
- **敏感数据**: 不要在前端暴露敏感信息

### 4. 用户体验

- **加载状态**: 显示加载指示器
- **错误提示**: 友好的错误消息
- **响应式设计**: 支持移动端

### 5. 代码质量

- **代码审查**: 提交前自我审查
- **测试**: 编写测试用例
- **文档**: 更新相关文档

---

## 工具和资源

### 开发工具

- **Postman**: API测试
- **MongoDB Compass**: 数据库管理
- **React DevTools**: React调试
- **Redux DevTools**: 状态调试（如使用）

### 参考文档

- [React文档](https://react.dev)
- [Express文档](https://expressjs.com)
- [MongoDB文档](https://docs.mongodb.com)
- [Tailwind CSS文档](https://tailwindcss.com)

### 项目文档

- `README.md` - 项目概述
- `功能清单.md` - 功能清单
- `技术文档.md` - 技术文档
- `数据库设计.md` - 数据库设计

---

## 获取帮助

### 遇到问题？

1. **查看文档**: 先查看相关文档
2. **搜索问题**: 在代码库中搜索类似问题
3. **询问团队**: 在团队群组中提问
4. **创建Issue**: 如果是bug，创建Issue

### 贡献代码

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

---

**祝开发愉快！** 🚀

