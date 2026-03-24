/**
 * GraphTutor V3.0 - 复习计划生成工具
 * 
 * 功能：基于错题数据自动生成复习计划
 */

/**
 * 生成复习计划
 * @param {Array} wrongQuestions - 错题列表
 * @param {Object} options - 选项 { days, questionsPerDay }
 * @returns {Object} 复习计划
 */
export function generateReviewPlan(wrongQuestions = [], options = {}) {
  const { days = 7, questionsPerDay = 10 } = options;

  if (!Array.isArray(wrongQuestions) || wrongQuestions.length === 0) {
    return {
      plan: [],
      summary: {
        totalDays: 0,
        totalQuestions: 0,
        questionsPerDay: 0,
      },
    };
  }

  // 按掌握度和错误次数排序（优先复习掌握度低、错误次数多的）
  const sorted = [...wrongQuestions].sort((a, b) => {
    const masteryA = a.mastery || 0;
    const masteryB = b.mastery || 0;
    const errorA = a.errorCount || 0;
    const errorB = b.errorCount || 0;
    
    // 先按掌握度排序（低的在前）
    if (masteryA !== masteryB) {
      return masteryA - masteryB;
    }
    // 再按错误次数排序（多的在前）
    return errorB - errorA;
  });

  // 按日期分配题目
  const plan = [];
  const totalQuestions = sorted.length;
  const actualDays = Math.ceil(totalQuestions / questionsPerDay);
  const finalDays = Math.min(days, actualDays);

  for (let day = 0; day < finalDays; day++) {
    const startIdx = day * questionsPerDay;
    const endIdx = Math.min(startIdx + questionsPerDay, totalQuestions);
    const dayQuestions = sorted.slice(startIdx, endIdx);

    const date = new Date();
    date.setDate(date.getDate() + day);

    plan.push({
      day: day + 1,
      date: date.toISOString().split('T')[0],
      questions: dayQuestions.map((wq) => ({
        questionId: wq.questionId || wq._id,
        knowledgeNodeId: wq.knowledgeNodeId,
        mastery: wq.mastery || 0,
        errorCount: wq.errorCount || 0,
      })),
      count: dayQuestions.length,
    });
  }

  return {
    plan,
    summary: {
      totalDays: finalDays,
      totalQuestions,
      questionsPerDay: Math.ceil(totalQuestions / finalDays),
      startDate: plan[0]?.date,
      endDate: plan[plan.length - 1]?.date,
    },
  };
}

/**
 * 导出复习计划为文本
 */
export function exportReviewPlanAsText(reviewPlan) {
  const { plan, summary } = reviewPlan;
  
  let text = `📚 错题复习计划\n`;
  text += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  text += `\n`;
  text += `📊 计划概览\n`;
  text += `- 总天数: ${summary.totalDays} 天\n`;
  text += `- 总题数: ${summary.totalQuestions} 道\n`;
  text += `- 每日题数: ${summary.questionsPerDay} 道\n`;
  text += `- 开始日期: ${summary.startDate}\n`;
  text += `- 结束日期: ${summary.endDate}\n`;
  text += `\n`;
  text += `📅 每日计划\n`;
  text += `\n`;

  plan.forEach((day) => {
    text += `第 ${day.day} 天 (${day.date})\n`;
    text += `需要复习 ${day.count} 道题\n`;
    day.questions.forEach((q, idx) => {
      text += `  ${idx + 1}. 题目ID: ${q.questionId}`;
      if (q.knowledgeNodeId) {
        text += ` | 知识点: ${q.knowledgeNodeId}`;
      }
      text += `\n`;
    });
    text += `\n`;
  });

  text += `\n`;
  text += `💡 复习建议\n`;
  text += `1. 按照计划每天完成指定数量的错题复习\n`;
  text += `2. 复习时重点关注掌握度较低的题目\n`;
  text += `3. 复习后及时标记掌握状态\n`;
  text += `4. 可以根据实际情况调整每日题量\n`;

  return text;
}

