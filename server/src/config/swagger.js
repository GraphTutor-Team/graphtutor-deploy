/**
 * GraphTutor V3.0 - Swagger/OpenAPI配置
 */

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GraphTutor V3.0 API',
      version: '3.0.0',
      description: 'GraphTutor V3.0 - 多角色与学科分类系统 API文档',
      contact: {
        name: 'GraphTutor Team',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: '开发服务器',
      },
      {
        url: 'https://api.graphtutor.com',
        description: '生产服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT认证，格式: Bearer {token}',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-XSRF-TOKEN',
          description: 'CSRF Token，从cookie XSRF-TOKEN获取',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        csrfToken: [],
      },
    ],
    tags: [
      {
        name: '认证',
        description: '用户认证相关接口',
      },
      {
        name: '用户',
        description: '用户信息管理',
      },
      {
        name: '题目',
        description: '题目管理接口',
      },
      {
        name: '题库',
        description: '题库管理接口',
      },
      {
        name: '学科',
        description: '学科分类管理',
      },
      {
        name: '笔记',
        description: '学习笔记管理',
      },
      {
        name: '搜索',
        description: '内容搜索接口',
      },
      {
        name: 'AI',
        description: 'AI功能接口',
      },
      {
        name: '学习分析',
        description: '学习数据分析',
      },
    ],
  },
  apis: [
    './src/routes/**/*.js',
    './src/routes/v3/**/*.js',
    './server.js',
  ],
};

