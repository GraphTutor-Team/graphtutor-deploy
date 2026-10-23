/**
 * GraphTutor V3.0 - 错题本服务
 * 
 * 功能：处理错题本的业务逻辑
 */

import WrongQuestion from '../models/WrongQuestion.js';
import Record from '../models/Record.js';
import Question from '../models/Question.js';

/**
 * 添加或更新错题
 */
export async function addOrUpdateWrongQuestion(userId, recordId, questionId, isCorrect) {
  // 查找或创建错题记录
  let wrongQuestion = await WrongQuestion.findOne({
    userId,
    questionId,
  });

  if (!wrongQuestion) {
    if (isCorrect) return null;
    const question = await Question.findOne({ _id: questionId }).lean();
    if (!question) {
      throw new Error('题目不存在');
    }

    wrongQuestion = await WrongQuestion.create({
      userId,
      questionId,
      subjectCode: question.subjectCode,
      knowledgeNodeId: question.knowledgeNodeId,
      category: '未分类',
      tags: [],
      mastery: 0,
      masteryStatus: 'unmastered',
      errorCount: 1,
      reviewCount: 0,
      firstErrorAt: new Date(),
      lastRecordId: recordId,
    });
    await wrongQuestion.updateMastery(false, { skipErrorIncrement: true });
    return wrongQuestion;
  }

  wrongQuestion.lastRecordId = recordId;
  await wrongQuestion.updateMastery(isCorrect);

  return wrongQuestion;
}

/**
 * 获取用户的错题列表
 */
export async function getWrongQuestions(userId, options = {}) {
  const {
    category,
    tags,
    masteryStatus,
    subjectCode,
    searchKeyword,
    page = 1,
    limit = 20,
    sortBy = 'lastErrorAt',
    sortOrder = 'desc',
  } = options;

  const query = { userId };

  // 筛选条件
  if (category) {
    query.category = category;
  }
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }
  if (masteryStatus) {
    query.masteryStatus = masteryStatus;
  }
  if (subjectCode) {
    query.subjectCode = subjectCode;
  }

  // 分页
  const skip = (page - 1) * limit;

  // 排序
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // 查询
  const [questions, total] = await Promise.all([
    WrongQuestion.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    WrongQuestion.countDocuments(query),
  ]);

  // 获取题目详情
  const questionIds = questions.map(q => q.questionId);
  const questionDetails = await Question.find({
    _id: { $in: questionIds },
  }).lean();

  const questionMap = new Map(questionDetails.map(q => [String(q._id), q]));

  // 合并数据
  const result = questions.map(wq => {
    const question = questionMap.get(String(wq.questionId));
    return {
      ...wq,
      question: question || null,
    };
  });

  // 如果有关键词搜索，在内存中过滤
  let filteredResult = result;
  if (searchKeyword) {
    const keyword = searchKeyword.toLowerCase();
    filteredResult = result.filter(item => {
      const question = item.question;
      if (!question) return false;
      const content = (question.content || '').toLowerCase();
      const explain = (question.explain || '').toLowerCase();
      return content.includes(keyword) || explain.includes(keyword);
    });
  }

  return {
    items: filteredResult,
    total: searchKeyword ? filteredResult.length : total,
    page,
    limit,
    totalPages: Math.ceil((searchKeyword ? filteredResult.length : total) / limit),
  };
}

/**
 * 更新错题分类
 */
export async function updateCategory(userId, questionId, category) {
  const wrongQuestion = await WrongQuestion.findOneAndUpdate(
    { userId, questionId },
    { category },
    { new: true }
  );

  if (!wrongQuestion) {
    throw new Error('错题不存在');
  }

  return wrongQuestion;
}

/**
 * 更新错题标签
 */
export async function updateTags(userId, questionId, tags) {
  const wrongQuestion = await WrongQuestion.findOneAndUpdate(
    { userId, questionId },
    { tags: Array.isArray(tags) ? tags : [] },
    { new: true }
  );

  if (!wrongQuestion) {
    throw new Error('错题不存在');
  }

  return wrongQuestion;
}

/**
 * 标记为已掌握
 */
export async function markAsMastered(userId, questionId) {
  const wrongQuestion = await WrongQuestion.findOneAndUpdate(
    { userId, questionId },
    {
      isMastered: true,
      masteryStatus: 'mastered',
      mastery: 100,
      masteredAt: new Date(),
    },
    { new: true }
  );

  if (!wrongQuestion) {
    throw new Error('错题不存在');
  }

  return wrongQuestion;
}

/**
 * 取消掌握标记
 */
export async function unmarkAsMastered(userId, questionId) {
  const wrongQuestion = await WrongQuestion.findOneAndUpdate(
    { userId, questionId },
    {
      isMastered: false,
      masteryStatus: 'unmastered',
      masteredAt: null,
    },
    { new: true }
  );

  if (!wrongQuestion) {
    throw new Error('错题不存在');
  }

  return wrongQuestion;
}

/**
 * 删除错题
 */
export async function deleteWrongQuestion(userId, questionId) {
  const result = await WrongQuestion.deleteOne({ userId, questionId });
  return result.deletedCount > 0;
}

/**
 * 获取错题统计
 */
export async function getWrongQuestionStats(userId) {
  return await WrongQuestion.getUserStats(userId);
}

/**
 * 获取分类列表
 */
export async function getCategories(userId) {
  const categories = await WrongQuestion.distinct('category', { userId });
  return categories;
}

/**
 * 获取标签列表
 */
export async function getTags(userId) {
  const tags = await WrongQuestion.distinct('tags', { userId });
  return tags.filter(tag => tag); // 过滤空标签
}

/**
 * 批量更新分类
 */
export async function batchUpdateCategory(userId, questionIds, category) {
  const result = await WrongQuestion.updateMany(
    { userId, questionId: { $in: questionIds } },
    { category }
  );
  return result.modifiedCount;
}

/**
 * 批量更新标签
 */
export async function batchUpdateTags(userId, questionIds, tags) {
  const result = await WrongQuestion.updateMany(
    { userId, questionId: { $in: questionIds } },
    { tags: Array.isArray(tags) ? tags : [] }
  );
  return result.modifiedCount;
}

/**
 * 批量标记为已掌握
 */
export async function batchMarkAsMastered(userId, questionIds) {
  const result = await WrongQuestion.updateMany(
    { userId, questionId: { $in: questionIds } },
    {
      isMastered: true,
      masteryStatus: 'mastered',
      mastery: 100,
      masteredAt: new Date(),
    }
  );
  return result.modifiedCount;
}

/**
 * 批量删除错题
 */
export async function batchDeleteWrongQuestions(userId, questionIds) {
  const result = await WrongQuestion.deleteMany({
    userId,
    questionId: { $in: questionIds },
  });
  return result.deletedCount;
}

/**
 * 导出错题
 */
export async function exportWrongQuestions(userId, options = {}) {
  const questions = await getWrongQuestions(userId, {
    ...options,
    limit: 10000, // 导出时获取更多数据
  });

  return questions.items.map(item => ({
    questionId: item.questionId,
    content: item.question?.content || '',
    options: item.question?.options || [],
    correctIndex: item.question?.answerIndex || item.question?.correctIndex,
    explain: item.question?.explain || '',
    category: item.category,
    tags: item.tags,
    mastery: item.mastery,
    masteryStatus: item.masteryStatus,
    errorCount: item.errorCount,
    reviewCount: item.reviewCount,
    firstErrorAt: item.firstErrorAt,
    lastErrorAt: item.lastErrorAt,
    notes: item.notes,
  }));
}

