/**
 * 服务端题目判分（与 client/src/utils/questionScoring.js 逻辑一致）
 */

function normalizeCodeForCompare(code) {
  return String(code || '')
    .replace(/\r\n/g, '\n')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function codeSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.includes(shorter) && shorter.length / longer.length > 0.85) {
    return shorter.length / longer.length;
  }
  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let matched = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) matched += 1;
  });
  return matched / Math.max(tokensA.size, tokensB.size);
}

export function checkAnswer(question, userAnswer) {
  const questionType = question.type || 'single';

  if (questionType === 'single' || questionType === 'judge') {
    const correctAnswer = question.answerIndex ?? question.answer;
    const isCorrect =
      typeof correctAnswer === 'number' &&
      typeof userAnswer === 'number' &&
      correctAnswer === userAnswer;
    return { isCorrect, score: isCorrect ? 1 : 0 };
  }

  if (questionType === 'multiple') {
    const correctAnswers = Array.isArray(question.answer)
      ? [...question.answer].sort((a, b) => a - b)
      : [];
    const userAnswers = Array.isArray(userAnswer) ? [...userAnswer].sort((a, b) => a - b) : [];
    const isCorrect =
      correctAnswers.length === userAnswers.length &&
      correctAnswers.every((ans, i) => ans === userAnswers[i]);
    return { isCorrect, score: isCorrect ? 1 : 0 };
  }

  if (questionType === 'fill') {
    const correctAnswers = question.blankAnswers || question.answer || [];
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
    const normalizedCorrect = correctAnswers.map((ans) => String(ans).trim().toLowerCase());
    const normalizedUser = userAnswers.map((ans) => String(ans).trim().toLowerCase());
    let correctCount = 0;
    for (let i = 0; i < normalizedCorrect.length; i += 1) {
      if (normalizedCorrect[i] === normalizedUser[i]) correctCount += 1;
    }
    const isCorrect =
      correctCount === normalizedCorrect.length &&
      normalizedCorrect.length === normalizedUser.length;
    return {
      isCorrect,
      score: normalizedCorrect.length ? correctCount / normalizedCorrect.length : 0,
    };
  }

  if (questionType === 'short') {
    const correctAnswer = String(question.answer || '').trim().toLowerCase();
    const userAnswerStr = String(userAnswer || '').trim().toLowerCase();
    if (!correctAnswer || !userAnswerStr) return { isCorrect: false, score: 0 };
    const correctWords = correctAnswer.split(/\s+/).filter((w) => w.length > 1);
    const userWords = userAnswerStr.split(/\s+/).filter((w) => w.length > 1);
    if (!correctWords.length) return { isCorrect: false, score: 0 };
    const matchedWords = userWords.filter((word) =>
      correctWords.some(
        (correctWord) => correctWord.includes(word) || word.includes(correctWord)
      )
    ).length;
    const similarity = matchedWords / correctWords.length;
    return { isCorrect: similarity >= 0.7, score: similarity };
  }

  if (questionType === 'coding') {
    const referenceCode =
      question.codingMeta?.referenceCode || String(question.answer || '');
    const userCode = String(userAnswer || '');
    const normalizedUser = normalizeCodeForCompare(userCode);
    if (!normalizedUser) return { isCorrect: false, score: 0 };
    const similarity = codeSimilarity(
      normalizeCodeForCompare(referenceCode),
      normalizedUser
    );
    return { isCorrect: similarity >= 0.92, score: similarity };
  }

  return { isCorrect: false, score: 0 };
}

export function resolveUserAnswer(body = {}) {
  if (body.userAnswer !== undefined) return body.userAnswer;
  if (body.answer !== undefined) return body.answer;
  if (body.answerIndex !== undefined) return body.answerIndex;
  return undefined;
}
