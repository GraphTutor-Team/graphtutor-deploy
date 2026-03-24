/**
 * GraphTutor V3.0 - AI任务队列系统
 * 
 * 功能：管理AI任务的异步执行、状态跟踪、重试机制
 */

// 简单的内存任务队列（生产环境建议使用Redis + Bull）
class AITaskQueue {
  constructor() {
    this.tasks = new Map(); // taskId -> task
    this.running = new Set(); // 正在运行的任务ID
    this.maxConcurrent = 3; // 最大并发数
  }

  /**
   * 创建AI任务
   * @param {string} userId - 用户ID
   * @param {string} type - 任务类型（generate, analyze, classify等）
   * @param {Object} config - 任务配置
   * @returns {Promise<string>} 任务ID
   */
  async createTask(userId, type, config) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const task = {
      id: taskId,
      userId,
      type,
      config,
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, task);

    // 异步执行任务
    this.processTask(taskId).catch((error) => {
      console.error(`任务 ${taskId} 执行失败:`, error);
      this.updateTask(taskId, {
        status: 'error',
        error: error.message,
      });
    });

    return taskId;
  }

  /**
   * 处理任务
   */
  async processTask(taskId) {
    // 检查并发限制
    if (this.running.size >= this.maxConcurrent) {
      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.processTask(taskId);
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }

    this.running.add(taskId);

    try {
      this.updateTask(taskId, {
        status: 'running',
        progress: 10,
      });

      // 根据任务类型执行不同的处理
      let result;
      switch (task.type) {
        case 'generate':
          result = await this.handleGenerateTask(task);
          break;
        case 'analyze':
          result = await this.handleAnalyzeTask(task);
          break;
        case 'classify':
          result = await this.handleClassifyTask(task);
          break;
        default:
          throw new Error(`未知的任务类型: ${task.type}`);
      }

      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        result,
      });
    } catch (error) {
      this.updateTask(taskId, {
        status: 'error',
        error: error.message,
      });
    } finally {
      this.running.delete(taskId);
    }
  }

  /**
   * 处理生成任务
   */
  async handleGenerateTask(task) {
    const { generateQuestions } = await import('./openAIService.js');
    this.updateTask(task.id, { progress: 30 });

    const questions = await generateQuestions(task.config, task.userId);

    this.updateTask(task.id, { progress: 80 });

    return {
      questions,
      count: questions.length,
    };
  }

  /**
   * 处理分析任务
   */
  async handleAnalyzeTask(task) {
    const { analyzeQuestion } = await import('./openAIService.js');
    this.updateTask(task.id, { progress: 30 });

    const analysis = await analyzeQuestion(task.config.question, task.userId);

    this.updateTask(task.id, { progress: 80 });

    return analysis;
  }

  /**
   * 处理分类任务
   */
  async handleClassifyTask(task) {
    const { classifySubject } = await import('./openAIService.js');
    this.updateTask(task.id, { progress: 30 });

    const recommendation = await classifySubject(
      task.config.questionContent,
      task.userId
    );

    this.updateTask(task.id, { progress: 80 });

    return recommendation;
  }

  /**
   * 更新任务状态
   */
  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    Object.assign(task, updates, {
      updatedAt: new Date(),
    });

    this.tasks.set(taskId, task);
  }

  /**
   * 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Object|null} 任务信息
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    // 返回任务信息（不包含敏感数据）
    return {
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * 取消任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} 是否成功取消
   */
  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      // 无法取消正在运行的任务
      return false;
    }

    if (task.status === 'pending') {
      this.updateTask(taskId, {
        status: 'cancelled',
      });
      return true;
    }

    return false;
  }

  /**
   * 重试任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<string>} 新任务ID
   */
  async retryTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }

    // 创建新任务（使用相同配置）
    return this.createTask(task.userId, task.type, task.config);
  }

  /**
   * 获取用户的任务列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 选项
   * @returns {Array} 任务列表
   */
  getUserTasks(userId, options = {}) {
    const { limit = 50, status } = options;

    let tasks = Array.from(this.tasks.values())
      .filter((task) => task.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (status) {
      tasks = tasks.filter((task) => task.status === status);
    }

    return tasks.slice(0, limit).map((task) => ({
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }

  /**
   * 清理旧任务（保留最近N个）
   */
  cleanup(maxKeep = 1000) {
    const tasks = Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(maxKeep);

    const toDelete = tasks.map((t) => t.id);
    toDelete.forEach((id) => this.tasks.delete(id));

    return toDelete.length;
  }
}

// 单例模式
const taskQueue = new AITaskQueue();

// 定期清理旧任务（每小时）
setInterval(() => {
  const deleted = taskQueue.cleanup(1000);
  if (deleted > 0) {
    console.log(`[AI任务队列] 清理了 ${deleted} 个旧任务`);
  }
}, 60 * 60 * 1000);

export default taskQueue;

// 导出便捷方法
export const createAITask = (userId, type, config) =>
  taskQueue.createTask(userId, type, config);
export const getTaskStatus = (taskId) => taskQueue.getTaskStatus(taskId);
export const cancelTask = (taskId) => taskQueue.cancelTask(taskId);
export const retryTask = (taskId) => taskQueue.retryTask(taskId);
export const getUserTasks = (userId, options) =>
  taskQueue.getUserTasks(userId, options);

