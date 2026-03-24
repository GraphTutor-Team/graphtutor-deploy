/**
 * GraphTutor V3.0 - 学习目标进度更新服务
 * 
 * 功能：当用户答题时，自动更新相关学习目标的进度
 */

import LearningGoal from '../models/LearningGoal.js';
import Record from '../models/Record.js';
import Question from '../models/Question.js';

/**
 * 更新用户的学习目标进度
 * @param {string} userId - 用户ID
 * @param {Object} answerData - 答题数据 { questionId, isCorrect, timeSpentMs, subjectCode, bankId, knowledgeNodeId }
 */
export async function updateLearningGoalsProgress(userId, answerData = {}) {
  try {
    const { questionId, isCorrect, timeSpentMs, subjectCode, bankId, knowledgeNodeId } = answerData;

    // 获取用户的所有活跃目标
    const activeGoals = await LearningGoal.find({
      userId,
      status: 'active',
      endDate: { $gte: new Date() }, // 未过期
    }).lean();

    if (activeGoals.length === 0) {
      return;
    }

    // 获取题目信息（如果需要）
    let question = null;
    if (questionId) {
      try {
        question = await Question.findById(questionId).lean();
        if (!question) {
          question = await Question.findOne({ id: questionId }).lean();
        }
      } catch (err) {
        console.warn('获取题目信息失败:', err);
      }
    }

    // 获取用户最近的答题统计（用于计算正确率）
    let recentAccuracy = null;
    let totalQuestions = 0;
    let correctQuestions = 0;

    // 更新每个匹配的目标
    for (const goal of activeGoals) {
      let shouldUpdate = false;
      let increment = 0;

      // 检查目标是否匹配（学科、题库筛选）
      if (goal.subjectCode && question?.subjectCode !== goal.subjectCode) {
        continue;
      }
      if (goal.bankId && question?.bankId?.toString() !== goal.bankId.toString()) {
        continue;
      }

      // 根据目标类型更新进度
      switch (goal.targetType) {
        case 'questions':
          // 答题数：每答一题 +1
          if (questionId) {
            shouldUpdate = true;
            increment = 1;
          }
          break;

        case 'accuracy':
          // 正确率：需要计算最近答题的正确率
          // 这里我们使用一个简化的方法：记录正确答题数
          // 实际正确率需要从统计中获取
          if (questionId && isCorrect === true) {
            shouldUpdate = true;
            // 正确率目标需要特殊处理，这里先不更新，等统计时再计算
            // 暂时跳过，因为正确率需要批量计算
            continue;
          }
          break;

        case 'knowledge_nodes':
          // 掌握知识点数：答对一道题的知识点 +1（如果该知识点还没掌握）
          if (questionId && isCorrect === true && knowledgeNodeId) {
            // 检查该知识点是否已经掌握（需要查询历史记录）
            const hasMastered = await Record.findOne({
              userId,
              knowledgeNodeId,
              isCorrect: true,
            }).lean();

            if (!hasMastered) {
              // 这是第一次答对这个知识点
              shouldUpdate = true;
              increment = 1;
            }
          }
          break;

        case 'time':
          // 学习时间：累加答题时间（分钟）
          if (timeSpentMs && timeSpentMs > 0) {
            shouldUpdate = true;
            increment = Math.round(timeSpentMs / 60000); // 转换为分钟
          }
          break;
      }

      // 更新目标进度
      if (shouldUpdate && increment > 0) {
        const newCurrentValue = Math.min(
          goal.currentValue + increment,
          goal.targetValue // 不超过目标值
        );

        const updateData = {
          currentValue: newCurrentValue,
        };

        // 如果达到目标，标记为已完成
        if (newCurrentValue >= goal.targetValue && goal.status === 'active') {
          updateData.status = 'completed';
        }

        await LearningGoal.findByIdAndUpdate(goal._id, { $set: updateData });
      }
    }
  } catch (error) {
    console.error('updateLearningGoalsProgress error:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 重新计算用户所有学习目标的进度（用于修复数据）
 * @param {string} userId - 用户ID
 */
export async function recalculateLearningGoalsProgress(userId) {
  try {
    const activeGoals = await LearningGoal.find({
      userId,
      status: { $in: ['active', 'completed'] },
    }).lean();

    for (const goal of activeGoals) {
      let currentValue = 0;

      // 构建查询条件
      const recordQuery = { userId };
      if (goal.subjectCode) {
        // 需要通过题目关联查询学科
        const questions = await Question.find({ subjectCode: goal.subjectCode })
          .select('_id')
          .lean();
        const questionIds = questions.map(q => q._id.toString());
        recordQuery.questionId = { $in: questionIds };
      }
      if (goal.bankId) {
        const questions = await Question.find({ bankId: goal.bankId })
          .select('_id')
          .lean();
        const questionIds = questions.map(q => q._id.toString());
        if (recordQuery.questionId) {
          recordQuery.questionId = {
            $in: questionIds.filter(id => recordQuery.questionId.$in.includes(id)),
          };
        } else {
          recordQuery.questionId = { $in: questionIds };
        }
      }

      // 根据目标类型计算进度
      switch (goal.targetType) {
        case 'questions':
          // 答题数
          currentValue = await Record.countDocuments(recordQuery);
          break;

        case 'accuracy':
          // 正确率：需要计算正确率百分比
          const totalRecords = await Record.countDocuments(recordQuery);
          const correctRecords = await Record.countDocuments({
            ...recordQuery,
            isCorrect: true,
          });
          if (totalRecords > 0) {
            const accuracy = (correctRecords / totalRecords) * 100;
            // 正确率目标：当前值 = 正确率百分比
            currentValue = Math.round(accuracy * 100) / 100; // 保留2位小数
          }
          break;

        case 'knowledge_nodes':
          // 掌握知识点数：统计答对过的不同知识点数量
          const masteredNodes = await Record.distinct('knowledgeNodeId', {
            ...recordQuery,
            isCorrect: true,
            knowledgeNodeId: { $ne: null },
          });
          currentValue = masteredNodes.length;
          break;

        case 'time':
          // 学习时间：累加所有答题时间（分钟）
          const timeRecords = await Record.aggregate([
            { $match: recordQuery },
            {
              $group: {
                _id: null,
                totalTime: { $sum: { $ifNull: ['$timeSpentMs', 0] } },
              },
            },
          ]);
          if (timeRecords.length > 0) {
            currentValue = Math.round(timeRecords[0].totalTime / 60000); // 转换为分钟
          }
          break;
      }

      // 更新目标
      const updateData = {
        currentValue: Math.min(currentValue, goal.targetValue),
      };

      // 检查是否完成
      if (currentValue >= goal.targetValue && goal.status === 'active') {
        updateData.status = 'completed';
      } else if (currentValue < goal.targetValue && goal.status === 'completed') {
        // 如果进度下降，恢复为活跃状态
        updateData.status = 'active';
      }

      await LearningGoal.findByIdAndUpdate(goal._id, { $set: updateData });
    }
  } catch (error) {
    console.error('recalculateLearningGoalsProgress error:', error);
    throw error;
  }
}

