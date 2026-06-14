function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, '').trim();
}

function optionLabel(index) {
  return String.fromCharCode(65 + index);
}

function typeLabel(type) {
  const map = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
    fill: '填空题',
    short: '简答题',
    coding: '编程题',
  };
  return map[type] || '题目';
}

function normalizeQuestionId(q) {
  if (!q) return '';
  const id = q.id || q._id;
  return id ? String(id) : '';
}

function normalizeOptions(question) {
  if (!question) return [];
  const opts = Array.isArray(question.options) ? question.options : [];
  if (opts.length > 0) return opts;
  if (question.type === 'judge') return ['正确', '错误'];
  return [];
}

function getFillBlankCount(question) {
  if (!question || question.type !== 'fill') return 0;
  if (Array.isArray(question.blankAnswers) && question.blankAnswers.length) {
    return question.blankAnswers.length;
  }
  if (Array.isArray(question.answer) && question.answer.length) {
    return question.answer.length;
  }
  if (question.blanks != null && question.blanks > 0) return Number(question.blanks);
  return 1;
}

function getSelectedAnswer(answersMap, questionId) {
  if (!answersMap || !questionId) return undefined;
  return answersMap[questionId];
}

function isOptionSelected(selected, index, type) {
  if (selected === undefined || selected === null) return false;
  if (type === 'multiple') {
    return Array.isArray(selected) && selected.indexOf(index) >= 0;
  }
  return selected === index;
}

function toggleAnswer(prev, index, type) {
  if (type === 'multiple') {
    const current = Array.isArray(prev) ? prev.slice() : [];
    const pos = current.indexOf(index);
    if (pos >= 0) current.splice(pos, 1);
    else current.push(index);
    current.sort((a, b) => a - b);
    return current;
  }
  return index;
}

function buildAnswerPayload(question, selected, userId) {
  const questionId = normalizeQuestionId(question);
  const payload = {
    questionId,
    userId,
    timeSpentMs: question._timeSpentMs || 0,
  };
  const type = question.type || 'single';
  if (type === 'multiple' || type === 'fill') {
    payload.userAnswer = Array.isArray(selected) ? selected : (type === 'fill' ? [] : []);
  } else if (type === 'short') {
    payload.userAnswer = typeof selected === 'string' ? selected : '';
  } else if (typeof selected === 'number') {
    payload.answerIndex = selected;
    payload.userAnswer = selected;
  } else {
    payload.userAnswer = selected;
  }
  return payload;
}

function hasValidSelection(type, selected) {
  if (type === 'coding') return true;
  if (type === 'multiple') return Array.isArray(selected) && selected.length > 0;
  if (type === 'fill') {
    return Array.isArray(selected) && selected.some((v) => String(v || '').trim());
  }
  if (type === 'short') return typeof selected === 'string' && selected.trim().length > 0;
  return typeof selected === 'number';
}

function selectionHint(type) {
  if (type === 'multiple') return '请至少选择一个选项';
  if (type === 'fill') return '请填写答案';
  if (type === 'short') return '请输入您的答案';
  return '请先选择答案';
}

function getCorrectIndices(question) {
  if (!question) return [];
  if (Array.isArray(question.answer) && (question.type === 'multiple' || question.type === 'fill')) {
    return question.answer.map((n) => Number(n));
  }
  if (typeof question.answer === 'number') return [question.answer];
  if (question.correctIndex != null && question.correctIndex !== '') return [Number(question.correctIndex)];
  return [];
}

function isCorrectOption(question, index) {
  return getCorrectIndices(question).indexOf(Number(index)) >= 0;
}

function buildFillBlanks(question, selected) {
  const count = getFillBlankCount(question);
  const arr = Array.isArray(selected) ? selected : [];
  const blanks = [];
  for (let i = 0; i < count; i += 1) {
    blanks.push({ index: i, value: arr[i] != null ? String(arr[i]) : '' });
  }
  return blanks;
}

module.exports = {
  stripHtml,
  optionLabel,
  typeLabel,
  normalizeQuestionId,
  normalizeOptions,
  getFillBlankCount,
  getSelectedAnswer,
  isOptionSelected,
  toggleAnswer,
  buildAnswerPayload,
  hasValidSelection,
  selectionHint,
  getCorrectIndices,
  isCorrectOption,
  buildFillBlanks,
};
