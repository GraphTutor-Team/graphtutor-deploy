/**
 * GraphTutor V3.0 - 增强学习分析API
 * 
 * 路径：/api/v3/enhanced-analytics
 * 功能：提供深度学习数据分析，包括学习效率、学习习惯、AI建议等
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  analyzeStudyEfficiency,
  analyzeStudyHabits,
  generateAILearningSuggestions,
  getForgettingCurveAlerts,
  getStudyEfficiencyByTimeAndType,
  getGraphNodeHeatmap,
  getPathRecommendations,
  getExamPrediction,
  getSubjectSkillTree,
  getCompareReport,
  getAdvancementReport,
} from '../../services/enhancedLearningAnalytics.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/enhanced-analytics/efficiency
 * 分析学习效率
 * 
 * 查询参数：
 * - days: 分析天数（默认30）
 */
router.get('/efficiency', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = '30' } = req.query;

    const daysNum = validateInt(days, { min: 7, max: 365, defaultValue: 30 });

    const efficiency = await analyzeStudyEfficiency(userId, { days: daysNum });

    res.json({
      success: true,
      data: efficiency,
    });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/efficiency error:', err);
    res.status(500).json({
      success: false,
      message: '分析学习效率失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/habits
 * 分析学习习惯
 * 
 * 查询参数：
 * - days: 分析天数（默认30）
 */
router.get('/habits', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = '30' } = req.query;

    const daysNum = validateInt(days, { min: 7, max: 365, defaultValue: 30 });

    const habits = await analyzeStudyHabits(userId, { days: daysNum });

    res.json({
      success: true,
      data: habits,
    });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/habits error:', err);
    res.status(500).json({
      success: false,
      message: '分析学习习惯失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/suggestions
 * 生成AI驱动的学习建议
 * 
 * 查询参数：
 * - days: 分析天数（默认30）
 */
router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = '30' } = req.query;

    const daysNum = validateInt(days, { min: 7, max: 365, defaultValue: 30 });

    const suggestions = await generateAILearningSuggestions(userId, { days: daysNum });

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/suggestions error:', err);
    res.status(500).json({
      success: false,
      message: '生成学习建议失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/comprehensive
 * 获取综合分析（效率+习惯+建议）
 * 
 * 查询参数：
 * - days: 分析天数（默认30）
 */
router.get('/comprehensive', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = '30' } = req.query;

    const daysNum = validateInt(days, { min: 7, max: 365, defaultValue: 30 });

    const [efficiency, habits, suggestions] = await Promise.all([
      analyzeStudyEfficiency(userId, { days: daysNum }),
      analyzeStudyHabits(userId, { days: daysNum }),
      generateAILearningSuggestions(userId, { days: daysNum }),
    ]);

    res.json({
      success: true,
      data: {
        efficiency,
        habits,
        suggestions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/comprehensive error:', err);
    res.status(500).json({
      success: false,
      message: '获取综合分析失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/forgetting-curve
 * 遗忘曲线预警：建议今日复习的知识点及 7 天后遗忘概率
 * 查询参数：limit（默认 20）
 */
router.get('/forgetting-curve', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20) || 20;
    const data = await getForgettingCurveAlerts(userId, { limit });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/forgetting-curve error:', err);
    res.status(500).json({
      success: false,
      message: '获取遗忘曲线预警失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/efficiency-by-time-type
 * 学习效率分析：按时间段、题型统计正确率与耗时，最佳学习时段/题型（Phase 2.2）
 * 查询参数：days（默认 30）
 */
router.get('/efficiency-by-time-type', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const daysNum = validateInt(req.query.days, { min: 7, max: 365, defaultValue: 30 });
    const data = await getStudyEfficiencyByTimeAndType(userId, { days: daysNum });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/efficiency-by-time-type error:', err);
    res.status(500).json({
      success: false,
      message: '获取效率分析失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/graph-heatmap
 * 知识图谱节点热力数据：掌握度、错题数、练习数（Phase 2.4）
 * 查询参数：days（默认 90）
 */
router.get('/graph-heatmap', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const daysNum = validateInt(req.query.days, { min: 7, max: 365, defaultValue: 90 });
    const data = await getGraphNodeHeatmap(userId, { days: daysNum });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/graph-heatmap error:', err);
    res.status(500).json({
      success: false,
      message: '获取图谱热力数据失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/path-recommendations
 * 路径推荐：根据当前掌握度与节点顺序推荐下一步学习的知识点（Phase 2.5）
 * 查询参数：days（默认 90）、limit（默认 5）
 */
router.get('/path-recommendations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const daysNum = validateInt(req.query.days, { min: 7, max: 365, defaultValue: 90 });
    const limit = validateInt(req.query.limit, { min: 1, max: 20, defaultValue: 5 });
    const data = await getPathRecommendations(userId, { days: daysNum, maxRecommendations: limit });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/path-recommendations error:', err);
    res.status(500).json({
      success: false,
      message: '获取路径推荐失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/exam-prediction
 * 考前预测：基于错题与掌握度，选出高风险知识点并给出预测卷题量分配（Phase 2.6）
 * 查询参数：days（默认 30）、totalQuestions（默认 20）
 */
router.get('/exam-prediction', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const daysNum = validateInt(req.query.days, { min: 7, max: 365, defaultValue: 30 });
    const totalQuestions = validateInt(req.query.totalQuestions, { min: 5, max: 50, defaultValue: 20 });
    const data = await getExamPrediction(userId, { days: daysNum, totalQuestions });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/exam-prediction error:', err);
    res.status(500).json({
      success: false,
      message: '获取考前预测失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/skill-tree
 * 学科技能树：按学科返回知识点列表及点亮状态（正确率≥70% 且 答题≥3 即点亮）
 * 查询参数：subjectCode（必填）、days（默认 90）
 */
router.get('/skill-tree', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const subjectCode = req.query.subjectCode ? String(req.query.subjectCode).trim() : '';
    const daysNum = validateInt(req.query.days, { min: 7, max: 365, defaultValue: 90 });
    if (!subjectCode) {
      return res.status(400).json({
        success: false,
        message: '请提供学科代码 subjectCode',
      });
    }
    const data = await getSubjectSkillTree(userId, { subjectCode, days: daysNum });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/skill-tree error:', err);
    res.status(500).json({
      success: false,
      message: '获取学科技能树失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/compare-report
 * 对比报告：与同校/同年级用户的学习数据对比
 * 查询参数：groupBy（school|grade）、days（默认 90）
 */
router.get('/compare-report', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupBy = req.query.groupBy === 'school' ? 'school' : 'grade';
    const daysNum = validateInt(req.query.days, { min: 7, max: 365, defaultValue: 90 });
    const data = await getCompareReport(userId, { groupBy, days: daysNum });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/compare-report error:', err);
    res.status(500).json({
      success: false,
      message: '获取对比报告失败',
    });
  }
});

/**
 * GET /api/v3/enhanced-analytics/advancement-report
 * 升学报告：考研/考公/留学竞争力与差距诊断
 * 查询参数：target（考研|考公|留学）、days（默认 90）
 */
router.get('/advancement-report', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const target = ['考研', '考公', '留学'].includes(req.query.target) ? req.query.target : '考研';
    const daysNum = validateInt(req.query.days, { min: 7, max: 365, defaultValue: 90 });
    const data = await getAdvancementReport(userId, { target, days: daysNum });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/enhanced-analytics/advancement-report error:', err);
    res.status(500).json({
      success: false,
      message: '获取升学报告失败',
    });
  }
});

export default router;

