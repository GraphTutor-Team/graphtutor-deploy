/**
 * GraphTutor V3.0 - 学习资源推荐系统
 * 
 * 功能：基于学习数据推荐学习资源
 */

/**
 * 推荐学习资源
 */
export function recommendResources(data) {
  const {
    nodeStats = [],
    wrongQuestions = [],
    progress7d = [],
    goals = [],
    notes = [],
  } = data;

  const recommendations = [];

  // 基于薄弱知识点的推荐
  const weakNodeRecommendations = recommendByWeakNodes(nodeStats);
  recommendations.push(...weakNodeRecommendations);

  // 基于错题的推荐
  const wrongQuestionRecommendations = recommendByWrongQuestions(wrongQuestions);
  recommendations.push(...wrongQuestionRecommendations);

  // 基于学习目标的推荐
  const goalRecommendations = recommendByGoals(goals, nodeStats);
  recommendations.push(...goalRecommendations);

  // 基于学习进度的推荐
  const progressRecommendations = recommendByProgress(progress7d, nodeStats);
  recommendations.push(...progressRecommendations);

  // 去重并按优先级排序
  const unique = deduplicateRecommendations(recommendations);
  return unique.sort((a, b) => b.priority - a.priority).slice(0, 10);
}

/**
 * 基于薄弱知识点推荐
 */
function recommendByWeakNodes(nodeStats) {
  const recommendations = [];

  const weakNodes = nodeStats.filter(n => 
    (n.accuracy || 0) < 0.6 && (n.total || 0) >= 3
  );

  if (weakNodes.length > 0) {
    weakNodes.slice(0, 5).forEach(node => {
      recommendations.push({
        type: 'knowledge',
        resourceType: 'practice',
        title: `加强练习：${node.name || node.id}`,
        description: `该知识点正确率${((node.accuracy || 0) * 100).toFixed(1)}%，建议加强练习。`,
        resourceId: node.id || node._id,
        priority: 90,
        action: '开始练习',
      });
    });
  }

  return recommendations;
}

/**
 * 基于错题推荐
 */
function recommendByWrongQuestions(wrongQuestions) {
  const recommendations = [];

  if (!wrongQuestions || wrongQuestions.length === 0) {
    return recommendations;
  }

  // 找出错误次数最多的知识点
  const errorCounts = {};
  wrongQuestions.forEach(q => {
    const nodeId = q.knowledgeNodeId || q.nodeId;
    if (nodeId) {
      errorCounts[nodeId] = (errorCounts[nodeId] || 0) + 1;
    }
  });

  const topErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  topErrors.forEach(([nodeId, count]) => {
    recommendations.push({
      type: 'wrong_question',
      resourceType: 'review',
      title: `复习错题：${count}道错题`,
      description: `该知识点有${count}道错题，建议及时复习。`,
      resourceId: nodeId,
      priority: 85,
      action: '复习错题',
    });
  });

  return recommendations;
}

/**
 * 基于学习目标推荐
 */
function recommendByGoals(goals, nodeStats) {
  const recommendations = [];

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) {
    return recommendations;
  }

  activeGoals.forEach(goal => {
    const progress = goal.progress || 0;
    const target = goal.target || goal.dailyTarget || 1;
    const percentage = target > 0 ? (progress / target) * 100 : 0;

    if (percentage < 50) {
      recommendations.push({
        type: 'goal',
        resourceType: 'practice',
        title: `完成目标：${goal.title || goal.name}`,
        description: `目标进度${percentage.toFixed(1)}%，建议增加练习量。`,
        resourceId: goal._id || goal.id,
        priority: 80,
        action: '查看目标',
      });
    }

    // 如果目标是掌握特定知识点
    if (goal.knowledgeNodeIds && goal.knowledgeNodeIds.length > 0) {
      const unmastered = goal.knowledgeNodeIds.filter(nodeId => {
        const node = nodeStats.find(n => (n.id || n._id) === nodeId);
        return !node || (node.accuracy || 0) < 0.8;
      });

      if (unmastered.length > 0) {
        recommendations.push({
          type: 'goal',
          resourceType: 'knowledge',
          title: `掌握知识点：${goal.title || goal.name}`,
          description: `还有${unmastered.length}个知识点未掌握，建议加强学习。`,
          resourceId: goal._id || goal.id,
          priority: 75,
          action: '学习知识点',
        });
      }
    }
  });

  return recommendations;
}

/**
 * 基于学习进度推荐
 */
function recommendByProgress(progress7d, nodeStats) {
  const recommendations = [];

  // 如果学习频率低，推荐增加学习
  const studyDays = progress7d.filter(d => (d.total || 0) > 0).length;
  if (studyDays < 3) {
    recommendations.push({
      type: 'progress',
      resourceType: 'plan',
      title: '增加学习频率',
      description: `本周只学习了${studyDays}天，建议制定学习计划。`,
      resourceId: null,
      priority: 70,
      action: '制定计划',
    });
  }

  // 如果正确率高，推荐挑战更高难度
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  if (accuracy >= 90 && total >= 50) {
    recommendations.push({
      type: 'progress',
      resourceType: 'challenge',
      title: '挑战更高难度',
      description: `当前正确率${accuracy.toFixed(1)}%，可以尝试更有挑战性的题目。`,
      resourceId: null,
      priority: 60,
      action: '挑战难题',
    });
  }

  return recommendations;
}

/**
 * 去重推荐
 */
function deduplicateRecommendations(recommendations) {
  const seen = new Set();
  return recommendations.filter(rec => {
    const key = `${rec.type}_${rec.resourceId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 推荐相关笔记
 */
export function recommendNotes(currentNote, allNotes) {
  if (!currentNote || !allNotes || allNotes.length === 0) {
    return [];
  }

  const currentTags = currentNote.tags || [];
  const currentSubject = currentNote.subject || currentNote.subjectCode;

  const scored = allNotes
    .filter(note => note._id !== currentNote._id && note.id !== currentNote.id)
    .map(note => {
      let score = 0;

      // 标签匹配
      const noteTags = note.tags || [];
      const commonTags = currentTags.filter(tag => noteTags.includes(tag));
      score += commonTags.length * 10;

      // 科目匹配
      const noteSubject = note.subject || note.subjectCode;
      if (currentSubject && noteSubject === currentSubject) {
        score += 20;
      }

      // 类型匹配
      if (note.type === currentNote.type) {
        score += 15;
      }

      return { note, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.note);

  return scored;
}

/**
 * 推荐相似题目
 */
export function recommendSimilarQuestions(question, allQuestions) {
  if (!question || !allQuestions || allQuestions.length === 0) {
    return [];
  }

  const questionNodeIds = question.knowledgeNodeIds || [];
  const questionType = question.type;
  const questionDifficulty = question.difficulty;

  const scored = allQuestions
    .filter(q => q._id !== question._id && q.id !== question.id)
    .map(q => {
      let score = 0;

      // 知识点匹配
      const qNodeIds = q.knowledgeNodeIds || [];
      const commonNodes = questionNodeIds.filter(id => qNodeIds.includes(id));
      score += commonNodes.length * 15;

      // 类型匹配
      if (q.type === questionType) {
        score += 10;
      }

      // 难度匹配
      if (q.difficulty === questionDifficulty) {
        score += 5;
      }

      return { question: q, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.question);

  return scored;
}

