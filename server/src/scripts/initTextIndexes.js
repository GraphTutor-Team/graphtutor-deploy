/**
 * GraphTutor V3.0 - 初始化文本索引脚本
 * 
 * 功能：为Question、Note、Discussion模型创建文本索引
 * 
 * 使用方法：
 * node server/src/scripts/initTextIndexes.js
 */

import mongoose from 'mongoose';
import { connectDB } from '../db.js';
import { ensureTextIndex, checkTextIndexExists } from '../services/fullTextSearch.js';
import { info, error, warn } from '../utils/logger.js';

async function initTextIndexes() {
  try {
    // 连接数据库
    await connectDB();
    info('数据库连接成功');

    // 检查并创建文本索引
    const models = ['Question', 'Note', 'Discussion'];
    
    for (const modelName of models) {
      info(`检查 ${modelName} 文本索引...`);
      
      const exists = await checkTextIndexExists(modelName);
      if (exists) {
        info(`✓ ${modelName} 文本索引已存在`);
      } else {
        info(`创建 ${modelName} 文本索引...`);
        const success = await ensureTextIndex(modelName);
        if (success) {
          info(`✓ ${modelName} 文本索引创建成功`);
        } else {
          warn(`✗ ${modelName} 文本索引创建失败`);
        }
      }
    }

    info('文本索引初始化完成');
    process.exit(0);
  } catch (err) {
    error('初始化文本索引失败', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// 运行脚本
initTextIndexes();

