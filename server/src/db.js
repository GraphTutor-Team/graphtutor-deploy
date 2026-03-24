/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/src/db.js
 * 模块功能：数据库连接模块，使用 Mongoose 建立与 MongoDB 的连接并输出复用的连接实例。
 * 主要职责：
 *   - 定义本模块对外暴露的路由 / 模型 / 配置等接口。
 *   - 与 MongoDB 数据库交互，完成增删改查等业务逻辑。
 *   - 为前端 React 客户端提供统一的 RESTful API 服务。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB），配合 JWT 等中间件完成认证与权限控制（如有）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

import mongoose from 'mongoose';
import { MONGODB_URI } from './config.js';
import { info, error, warn } from './utils/logger.js';

/**
 * 连接MongoDB数据库
 * 优化：添加连接池配置和错误处理
 */
export async function connectDB() {
  // 如果已经连接，直接返回
  if (mongoose.connection.readyState >= 1) {
    info('MongoDB already connected');
    return;
  }

  try {
    // 连接选项优化
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // 连接池配置
      maxPoolSize: 10, // 最大连接数
      minPoolSize: 2,  // 最小连接数
    };

    await mongoose.connect(MONGODB_URI, options);
    info('MongoDB connected successfully');

    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      info('MongoDB reconnected');
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (err) {
    error('MongoDB connection failed', { 
      error: err.message,
      uri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@') // 隐藏密码
    });
    throw err;
  }
}
