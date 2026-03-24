# GraphTutor V3.0 - API文档使用指南

**实现日期**: 2026-01-30  
**功能**: Swagger/OpenAPI API文档

## ✅ 已完成的功能

### 1. Swagger配置 ✅
- **文件**: `server/src/config/swagger.js`
- **功能**: Swagger/OpenAPI配置
- **特性**:
  - OpenAPI 3.0规范
  - JWT认证配置
  - CSRF Token配置
  - 多服务器配置
  - API标签分类

### 2. 应用集成 ✅
- **文件**: `server/src/app.js`
- **集成**: Swagger UI自动挂载
- **访问路径**: `/api-docs`

### 3. API文档注释 ✅
- **文件**: 
  - `server/src/routes/auth.swagger.js` - 认证API文档
  - `server/src/routes/v3/questions.swagger.js` - 题目API文档

## 🚀 使用方法

### 1. 安装依赖

```bash
cd server
npm install swagger-jsdoc swagger-ui-express
```

### 2. 启动服务

```bash
npm run dev
# 或
npm start
```

### 3. 访问API文档

打开浏览器访问：
```
http://localhost:5000/api-docs
```

### 4. 使用API文档

1. **查看所有API**: 左侧显示所有API端点
2. **测试API**: 点击"Try it out"按钮
3. **查看请求/响应示例**: 展开请求和响应部分
4. **认证**: 点击右上角"Authorize"按钮，输入Bearer Token

## 📝 添加API文档注释

### 基本格式

```javascript
/**
 * @swagger
 * /api/path:
 *   get:
 *     tags: [标签名]
 *     summary: 简短描述
 *     description: 详细描述
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 */
```

### 示例：认证接口

```javascript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [认证]
 *     summary: 用户登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 登录成功
 */
```

## 🔧 配置说明

### 环境变量

```env
# 启用/禁用Swagger（默认启用）
ENABLE_SWAGGER=true

# API基础URL
API_URL=http://localhost:5000
```

### 自定义配置

编辑 `server/src/config/swagger.js` 修改：
- API信息（标题、版本、描述）
- 服务器地址
- 安全方案
- API标签

## 📚 文档结构

### 已文档化的API

- ✅ 认证相关（登录、注册、刷新token、登出）
- ✅ 题目管理（查询、创建）

### 待文档化的API

- [ ] 用户管理
- [ ] 题库管理
- [ ] 学科管理
- [ ] 笔记管理
- [ ] 搜索功能
- [ ] AI功能
- [ ] 学习分析
- [ ] 其他V3 API

## 🎯 下一步

1. **完善所有API文档**: 为所有路由添加Swagger注释
2. **添加请求/响应示例**: 提供更多实际示例
3. **错误码文档**: 完善错误响应文档
4. **导出OpenAPI规范**: 生成openapi.json文件

## 📖 相关资源

- [Swagger/OpenAPI规范](https://swagger.io/specification/)
- [Swagger JSDoc文档](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Express文档](https://github.com/scottie1984/swagger-ui-express)

---

**实现完成时间**: 2026-01-30  
**访问地址**: http://localhost:5000/api-docs

