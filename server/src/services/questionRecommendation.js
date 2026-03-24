/**
 * GraphTutor V3.0 - 智能题目推荐服务
 * 
 * 功能：基于用户学习数据智能推荐题目
 */

import Question from '../models/Question.js';
import Record from '../models/Record.js';
import LearningGoal from '../models/LearningGoal.js';
import { getKnowledgeMastery } from './learningAnalytics.js';

/**
 * 获取智能推荐的题目
 * @param {string} userId - 用户ID
 * @param {Object} options - 推荐选项 { limit, subjectCode, bankId, strategy }
 * @returns {Promise<Array>} 推荐的题目列表
 */
export async function getRecommendedQuestions(userId, options = {}) {
  try {
    const {
      limit = 10,
      subjectCode,
      bankId,
      strategy = 'adaptive', // adaptive, weak_points, goal_based, similar
      knowledgeNodeId,
    } = options;

    let recommendedQuestions = [];

    switch (strategy) {
      case 'weak_points':
        // 薄弱知识点推荐：推荐用户答错过的知识点相关题目
        recommendedQuestions = await recommendByWeakPoints(userId, {
          limit,
          subjectCode,
          bankId,
        });
        break;

      case 'goal_based':
        // 基于学习目标推荐
        recommendedQuestions = await recommendByGoals(userId, {
          limit,
          subjectCode,
          bankId,
        });
        break;

      case 'similar':
        // 相似题目推荐（questionId 或 knowledgeNodeId，用于题目详情/笔记详情）
        if (options.questionId) {
          recommendedQuestions = await recommendSimilarQuestions(options.questionId, {
            limit,
            subjectCode,
            bankId,
          });
        } else if (knowledgeNodeId) {
          recommendedQuestions = await recommendByKnowledgeNode(knowledgeNodeId, {
            limit,
            subjectCode,
            bankId,
          });
        }
        break;

      case 'adaptive':
      default:
        // 自适应推荐：综合多种策略
        recommendedQuestions = await recommendAdaptive(userId, {
          limit,
          subjectCode,
          bankId,
        });
        break;
    }

    // 如果推荐数量不足，补充随机题目
    if (recommendedQuestions.length < limit) {
      const additional = await getRandomQuestions({
        limit: limit - recommendedQuestions.length,
        subjectCode,
        bankId,
        excludeIds: recommendedQuestions.map(q => q._id?.toString() || q.id),
      });
      recommendedQuestions = [...recommendedQuestions, ...additional];
    }

    return recommendedQuestions.slice(0, limit);
  } catch (error) {
    console.error('getRecommendedQuestions error:', error);
    throw error;
  }
}

/**
 * 基于薄弱知识点推荐
 */
async function recommendByWeakPoints(userId, options = {}) {
  const { limit = 10, subjectCode, bankId } = options;

  // 获取用户薄弱知识点（正确率低的知识点）
  const mastery = await getKnowledgeMastery(userId, {
    days: 30,
    subjectCode,
    minQuestions: 2,
  });

  // 找出正确率低于60%的知识点
  const weakNodes = mastery.knowledgeNodes
    .filter(node => node.accuracy < 60)
    .slice(0, 5)
    .map(node => node.knowledgeNodeId)
    .filter(Boolean);

  if (weakNodes.length === 0) {
    return [];
  }

  // 获取用户已答过的题目ID（避免重复推荐）
  const answeredQuestionIds = await Record.distinct('questionId', { userId });

  // 查询薄弱知识点相关的题目
  const query = {
    knowledgeNodeId: { $in: weakNodes },
    _id: { $nin: answeredQuestionIds },
  };

  if (subjectCode) {
    query.subjectCode = subjectCode;
  }
  if (bankId) {
    query.bankId = bankId;
  }

  const questions = await Question.find(query)
    .limit(limit * 2) // 多查一些，后面会随机选择
    .lean();

  // 按知识点分组，每个知识点推荐1-2道题
  const questionsByNode = {};
  questions.forEach(q => {
    const nodeId = q.knowledgeNodeId?.toString();
    if (nodeId) {
      if (!questionsByNode[nodeId]) {
        questionsByNode[nodeId] = [];
      }
      questionsByNode[nodeId].push(q);
    }
  });

  // 从每个薄弱知识点中随机选择题目
  const recommended = [];
  for (const nodeId of weakNodes) {
    const nodeQuestions = questionsByNode[nodeId] || [];
    if (nodeQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * nodeQuestions.length);
      recommended.push(nodeQuestions[randomIndex]);
      if (recommended.length >= limit) break;
    }
  }

  return recommended;
}

/**
 * 基于学习目标推荐
 */
async function recommendByGoals(userId, options = {}) {
  const { limit = 10, subjectCode, bankId } = options;

  // 获取用户活跃的学习目标
  const activeGoals = await LearningGoal.find({
    userId,
    status: 'active',
    endDate: { $gte: new Date() },
  }).lean();

  if (activeGoals.length === 0) {
    return [];
  }

  // 获取用户已答过的题目ID
  const answeredQuestionIds = await Record.distinct('questionId', { userId });

  const recommended = [];

  for (const goal of activeGoals) {
    if (recommended.length >= limit) break;

    // 构建查询条件
    const query = {
      _id: { $nin: answeredQuestionIds },
    };

    if (goal.subjectCode) {
      query.subjectCode = goal.subjectCode;
    } else if (subjectCode) {
      query.subjectCode = subjectCode;
    }

    if (goal.bankId) {
      query.bankId = goal.bankId;
    } else if (bankId) {
      query.bankId = bankId;
    }

    // 根据目标类型调整难度
    if (goal.targetType === 'accuracy') {
      // 正确率目标：推荐中等难度的题目
      query.difficulty = { $gte: 2, $lte: 4 };
    }

    const questions = await Question.find(query)
      .limit(limit - recommended.length)
      .lean();

    recommended.push(...questions);
  }

  return recommended.slice(0, limit);
}

/**
 * 推荐相似题目
 */
async function recommendSimilarQuestions(questionId, options = {}) {
  const { limit = 5, subjectCode, bankId } = options;

  // 获取原题目
  const question = await Question.findById(questionId).lean();
  if (!question) {
    question = await Question.findOne({ id: questionId }).lean();
  }

  if (!question) {
    return [];
  }

  // 构建查询条件
  const query = {
    _id: { $ne: questionId },
  };

  // 相同学科
  if (question.subjectCode) {
    query.subjectCode = question.subjectCode;
  } else if (subjectCode) {
    query.subjectCode = subjectCode;
  }

  // 相同知识点
  if (question.knowledgeNodeId) {
    query.knowledgeNodeId = question.knowledgeNodeId;
  }

  // 相似难度（±1）
  if (question.difficulty) {
    query.difficulty = {
      $gte: Math.max(1, question.difficulty - 1),
      $lte: Math.min(5, question.difficulty + 1),
    };
  }

  // 相同题型
  if (question.type) {
    query.type = question.type;
  }

  if (bankId) {
    query.bankId = bankId;
  }

  const similar = await Question.find(query)
    .limit(limit)
    .lean();

  return similar;
}

/**
 * 按知识点推荐题目（用于笔记详情等「相关题目」）
 */
async function recommendByKnowledgeNode(knowledgeNodeId, options = {}) {
  const { limit = 5, subjectCode, bankId } = options;
  const query = { knowledgeNodeId };
  if (subjectCode) query.subjectCode = subjectCode;
  if (bankId) query.bankId = bankId;
  const questions = await Question.find(query).limit(limit).lean();
  return questions;
}

/**
 * 自适应推荐（综合策略）
 */
async function recommendAdaptive(userId, options = {}) {
  const { limit = 10, subjectCode, bankId } = options;

  // 获取用户学习数据
  const mastery = await getKnowledgeMastery(userId, {
    days: 30,
    subjectCode,
    minQuestions: 1,
  });

  // 获取用户已答过的题目ID
  const answeredQuestionIds = await Record.distinct('questionId', { userId });

  // 策略1：薄弱知识点（权重40%）
  const weakPoints = await recommendByWeakPoints(userId, {
    limit: Math.ceil(limit * 0.4),
    subjectCode,
    bankId,
  });

  // 策略2：学习目标（权重30%）
  const goalBased = await recommendByGoals(userId, {
    limit: Math.ceil(limit * 0.3),
    subjectCode,
    bankId,
  });

  // 策略3：未掌握的知识点（权重30%）
  const unmasteredNodes = await getUnmasteredNodes(userId, mastery);
  const unmasteredQuestions = await getQuestionsByNodes(unmasteredNodes, {
    limit: Math.ceil(limit * 0.3),
    subjectCode,
    bankId,
    excludeIds: [...answeredQuestionIds, ...weakPoints.map(q => q._id?.toString()), ...goalBased.map(q => q._id?.toString())],
  });

  // 合并并去重
  const allQuestions = [...weakPoints, ...goalBased, ...unmasteredQuestions];
  const uniqueQuestions = [];
  const seenIds = new Set();

  for (const q of allQuestions) {
    const qid = q._id?.toString() || q.id;
    if (qid && !seenIds.has(qid)) {
      seenIds.add(qid);
      uniqueQuestions.push(q);
    }
  }

  return uniqueQuestions.slice(0, limit);
}

/**
 * 获取未掌握的知识点
 */
async function getUnmasteredNodes(userId, mastery) {
  // 获取所有知识点
  const allNodes = await Record.distinct('knowledgeNodeId', {
    userId,
    knowledgeNodeId: { $ne: null },
  });

  // 获取已掌握的知识点（正确率>=80%）
  const masteredNodes = mastery.knowledgeNodes
    .filter(node => node.accuracy >= 80)
    .map(node => node.knowledgeNodeId)
    .filter(Boolean);

  // 未掌握的知识点
  const unmastered = allNodes.filter(nodeId => !masteredNodes.includes(nodeId));

  return unmastered;
}

/**
 * 根据知识点获取题目
 */
async function getQuestionsByNodes(nodeIds, options = {}) {
  const { limit = 5, subjectCode, bankId, excludeIds = [] } = options;

  if (nodeIds.length === 0) {
    return [];
  }

  const query = {
    knowledgeNodeId: { $in: nodeIds },
    _id: { $nin: excludeIds },
  };

  if (subjectCode) {
    query.subjectCode = subjectCode;
  }
  if (bankId) {
    query.bankId = bankId;
  }

  const questions = await Question.find(query)
    .limit(limit)
    .lean();

  return questions;
}

/**
 * 获取随机题目
 */
async function getRandomQuestions(options = {}) {
  const { limit = 10, subjectCode, bankId, excludeIds = [] } = options;

  const query = {};
  if (subjectCode) {
    query.subjectCode = subjectCode;
  }
  if (bankId) {
    query.bankId = bankId;
  }
  if (excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
  }

  // 使用聚合管道随机选择
  const questions = await Question.aggregate([
    { $match: query },
    { $sample: { size: limit } },
  ]);

  return questions;
}

/**
 * 获取推荐理由
 * @param {string} userId - 用户ID
 * @param {string} questionId - 题目ID
 * @returns {Promise<string>} 推荐理由
 */
export async function getRecommendationReason(userId, questionId) {
  try {
    const question = await Question.findById(questionId).lean();
    if (!question) {
      return '推荐题目';
    }

    // 检查是否是薄弱知识点
    const mastery = await getKnowledgeMastery(userId, {
      days: 30,
      minQuestions: 1,
    });

    const nodeMastery = mastery.knowledgeNodes.find(
      node => node.knowledgeNodeId === question.knowledgeNodeId
    );

    if (nodeMastery && nodeMastery.accuracy < 60) {
      return `该知识点正确率较低（${nodeMastery.accuracy.toFixed(1)}%），建议加强练习`;
    }

    // 检查是否匹配学习目标
    const goals = await LearningGoal.find({
      userId,
      status: 'active',
      $or: [
        { subjectCode: question.subjectCode },
        { bankId: question.bankId },
      ],
    }).lean();

    if (goals.length > 0) {
      return `符合你的学习目标：${goals[0].title}`;
    }

    // 检查是否未掌握
    if (nodeMastery && nodeMastery.accuracy < 80) {
      return `该知识点需要加强练习（当前正确率：${nodeMastery.accuracy.toFixed(1)}%）`;
    }

    return '为你推荐的练习题目';
  } catch (error) {
    console.error('getRecommendationReason error:', error);
    return '推荐题目';
  }
}

