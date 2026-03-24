/**
 * GraphTutor V3.0 - 自适应学习引擎（MVP）
 *
 * 个性化路径生成：根据用户目标与当前掌握度/错题，生成每日学习计划并与学习计划模块打通
 */

import StudyPlan from '../models/StudyPlan.js';
import StudyTask from '../models/StudyTask.js';
import KnowledgeNode from '../models/KnowledgeNode.js';
import { getPathRecommendations, getExamPrediction } from './enhancedLearningAnalytics.js';

const DEFAULT_TARGET_DAYS = 7;
const DEFAULT_QUESTIONS_PER_DAY = 15;
const MAX_NODES_TO_DISTRIBUTE = 25;

const PRESET_NAMES = {
  考研: '考研冲刺学习计划',
  考公: '考公备考学习计划',
  留学: '留学备考学习计划',
  四六级: '四六级备考学习计划',
};

/**
 * 根据用户目标与数据生成个性化路径（每日知识点 + 题量），并创建学习计划与每日任务
 * @param {string} userId
 * @param {Object} options - { goalText?, targetDays?, preset? }
 * @returns {Promise<{ plan, tasks, summary }>}
 */
export async function generatePersonalizedPath(userId, options = {}) {
  const targetDays = Math.max(1, Math.min(30, Number(options.targetDays) || DEFAULT_TARGET_DAYS));
  const preset = options.preset && PRESET_NAMES[options.preset] ? options.preset : null;
  const goalText =
    (options.goalText && String(options.goalText).trim()) ||
    (preset ? `目标：${preset}` : '') ||
    '个性化学习计划';

  const [pathRecs, examPred, allNodes] = await Promise.all([
    getPathRecommendations(userId, { days: 90, maxRecommendations: 15 }),
    getExamPrediction(userId, { days: 30, totalQuestions: 30 }),
    KnowledgeNode.find().sort({ order: 1 }).select('key name').lean(),
  ]);

  const nodeKeyToName = new Map((allNodes || []).map((n) => [String(n.key), n.name || n.key]));

  const nodeKeys = new Set();
  (pathRecs || []).forEach((r) => {
    if (r.key) nodeKeys.add(String(r.key));
  });
  (examPred?.nodes || []).forEach((n) => {
    if (n.knowledgeNodeId) nodeKeys.add(String(n.knowledgeNodeId));
  });

  const orderedNodes = Array.from(nodeKeys).slice(0, MAX_NODES_TO_DISTRIBUTE);
  if (orderedNodes.length === 0) {
    const fallbackNodes = (allNodes || []).slice(0, 5).map((n) => String(n.key));
    orderedNodes.push(...fallbackNodes);
  }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + targetDays - 1);
  endDate.setHours(23, 59, 59, 999);

  const planName = preset ? PRESET_NAMES[preset] : goalText.slice(0, 100);
  const plan = await StudyPlan.create({
    userId,
    name: planName,
    description: `由自适应学习引擎根据你的目标与当前掌握度生成。${goalText}`,
    type: 'custom',
    startDate,
    endDate,
    dailyTarget: DEFAULT_QUESTIONS_PER_DAY,
    subjectCodes: [],
    knowledgeNodeIds: [],
    status: 'active',
    source: 'adaptive',
    goalText: goalText.slice(0, 300),
  });

  const tasks = [];
  const summary = [];
  const nodesPerDay = Math.max(1, Math.ceil(orderedNodes.length / targetDays));
  let nodeIndex = 0;

  for (let d = 0; d < targetDays; d++) {
    const taskDate = new Date(startDate);
    taskDate.setDate(taskDate.getDate() + d);
    taskDate.setHours(0, 0, 0, 0);

    const dayNodeKeys = orderedNodes.slice(nodeIndex, nodeIndex + nodesPerDay);
    nodeIndex += dayNodeKeys.length;
    const targetCount = Math.max(5, Math.min(30, DEFAULT_QUESTIONS_PER_DAY + (dayNodeKeys.length > 3 ? 5 : 0)));

    const task = await StudyTask.create({
      userId,
      planId: plan._id,
      date: taskDate,
      type: 'practice',
      targetCount,
      completedCount: 0,
      subjectCodes: [],
      knowledgeNodeIds: dayNodeKeys,
      status: 'pending',
    });
    tasks.push(task);

    summary.push({
      day: d + 1,
      date: taskDate.toISOString().slice(0, 10),
      targetCount,
      knowledgeNodeIds: dayNodeKeys,
      nodeNames: dayNodeKeys.map((k) => nodeKeyToName.get(k) || k),
    });
  }

  await plan.updateStats();

  return {
    plan: plan.toObject ? plan.toObject() : plan,
    tasks: tasks.map((t) => (t.toObject ? t.toObject() : t)),
    summary,
  };
}
