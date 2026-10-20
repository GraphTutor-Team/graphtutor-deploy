/**
 * 把当前题目压成短文本，供 AI 学习伴侣理解现场。
 * 练习中不附带正确答案。
 */

function clip(text, max = 180) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function buildQuestionBrief(question, userAnswer, { revealAnswer = false } = {}) {
  if (!question) return '';
  const options = Array.isArray(question.options) ? question.options : [];
  const lines = [`题型：${question.type || 'single'}`, `题干：${clip(question.content, 240)}`];
  if (options.length > 0) {
    lines.push(
      `选项：${options.map((opt, i) => `${String.fromCharCode(65 + i)}.${clip(opt, 40)}`).join('；')}`
    );
  }
  const answered = userAnswer != null && userAnswer !== '' && !(Array.isArray(userAnswer) && userAnswer.length === 0);
  lines.push(`用户作答：${answered ? clip(JSON.stringify(userAnswer), 120) : '未作答'}`);
  if (revealAnswer) {
    const answer = question.answer ?? question.answerIndex ?? question.blankAnswers ?? question.referenceAnswer;
    if (answer != null) lines.push(`正确答案：${clip(JSON.stringify(answer), 160)}`);
    if (question.explain) lines.push(`已有解析：${clip(question.explain, 160)}`);
  }
  return lines.join('\n');
}
