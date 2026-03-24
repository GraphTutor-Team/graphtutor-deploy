/** 
 * GraphTutor 后端代码说明
 * 文件路径：graph-tutor-bb4113f41d0c29976f3e24913ddeb224633c4502/server/server.js
 * 模块功能：服务器启动入口，负责加载配置、连接 MongoDB，并启动 Express HTTP 服务。
 * 主要职责：
 *   - 作为后端应用的关键入口 / 配置模块，协调其他子模块运行。
 *   - 封装通用基础设施（如服务器启动、数据库连接等）。
 *   - 为业务路由和模型提供运行环境和依赖。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB）。
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */



import 'dotenv/config';
import { createServer } from './src/app.js';
import { connectDB } from './src/db.js';
import { PORT as CFG_PORT } from './src/config.js';
import { initRedis, closeRedisConnection } from './src/utils/redis.js';
import webSocketService from './src/services/websocketService.js';
import { startReviewPlanPushScheduler } from './src/scheduler/reviewPlanPushScheduler.js';

const PORT = CFG_PORT || process.env.PORT || 5000;
let server;

const start = async () => {
  await connectDB();                       // 确保数据库先连上
  await initRedis();                       // 初始化Redis连接
  const app = await createServer();
  
  // 检查端口是否被占用
  server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    
    // 初始化WebSocket服务（如果socket.io已安装）
    webSocketService.initialize(server).then(() => {
      console.log('✅ WebSocket service initialized');
    }).catch((err) => {
      console.warn('⚠️  WebSocket service not available (socket.io may not be installed)');
      console.warn('    To enable WebSocket, run: npm install socket.io');
      console.warn(`    Error: ${err.message}`);
    });

    // 复习计划自动推送：每周一 8:00 / 每月 1 日 8:00 向活跃用户推送通知
    try {
      startReviewPlanPushScheduler();
    } catch (e) {
      console.warn('⚠️  Review plan push scheduler failed to start:', e?.message);
    }
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ 端口 ${PORT} 已被占用，请先关闭占用该端口的进程`);
      console.error(`   或者设置环境变量 PORT 使用其他端口（例如: PORT=5001）`);
      console.error(`   在 Windows 上可以使用: netstat -ano | findstr :${PORT} 查找占用进程`);
      process.exit(1);
    } else {
      throw err;
    }
  });
};

start().catch(err => {
  console.error('Boot error:', err);
  process.exit(1);
});

// —— 以下是可选的"优雅关机"，防止端口/连接泄漏 —— //
const shutdown = async (signal) => {
  try {
    console.log(`\n${signal} received, shutting down...`);
    await new Promise((resolve) => server?.close(resolve));  // 停止接收新请求
    await closeRedisConnection();                             // 关闭Redis连接
    // 如果你在 db.js 导出了 disconnectDB，这里可以尝试断开数据库：
    // import { disconnectDB } from './src/db.js';
    // await disconnectDB?.();
  } catch (e) {
    console.error('Shutdown error:', e);
  } finally {
    process.exit(0);
  }
};

['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
process.on('unhandledRejection', (err) => console.error('UnhandledRejection:', err));
process.on('uncaughtException', (err) => { console.error('UncaughtException:', err); process.exit(1); });

console.log('[LLM] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('[LLM] OFFLINE_MODE:', process.env.OFFLINE_MODE);

console.log('[LLM]', process.env.LLM_PROVIDER);