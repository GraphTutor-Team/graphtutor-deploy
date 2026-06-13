/**
 * GraphTutor V3.0 - 题目判分工具
 * 
 * 功能：统一处理不同题型的答案判分逻辑
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

/**
 * 判断答案是否正确
 * @param {Object} question - 题目对象
 * @param {*} userAnswer - 用户答案（可能是数字、数组、字符串等）
 * @returns {Object} { isCorrect: boolean, score: number, details: Object }
 */
export function checkAnswer(question, userAnswer) {
  const questionType = question.type || 'single';

  if (questionType === 'single' || questionType === 'judge') {
    // 单选题、判断题：答案应该是单个数字（答案索引）
    const correctAnswer = question.answerIndex ?? question.answer;
    const isCorrect = typeof correctAnswer === 'number' && 
                     typeof userAnswer === 'number' && 
                     correctAnswer === userAnswer;
    
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      details: {
        correctAnswer,
        userAnswer,
        type: questionType,
      },
    };
  }

  if (questionType === 'multiple') {
    // 多选题：答案应该是数组，需要完全匹配
    const correctAnswers = Array.isArray(question.answer) 
      ? question.answer.sort((a, b) => a - b)
      : (Array.isArray(question.answerIndices) ? question.answerIndices.sort((a, b) => a - b) : []);
    
    const userAnswers = Array.isArray(userAnswer) 
      ? userAnswer.sort((a, b) => a - b)
      : [];
    
    // 多选题：必须完全匹配才算正确
    const isCorrect = correctAnswers.length === userAnswers.length &&
      correctAnswers.every((ans, idx) => ans === userAnswers[idx]);
    
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      details: {
        correctAnswers,
        userAnswers,
        type: questionType,
      },
    };
  }

  if (questionType === 'fill') {
    // 填空题：答案应该是字符串数组，每个空白对应一个答案
    const correctAnswers = question.blankAnswers || question.answer || [];
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
    
    if (correctAnswers.length === 0 || userAnswers.length === 0) {
      return {
        isCorrect: false,
        score: 0,
        details: {
          correctAnswers,
          userAnswers,
          type: questionType,
        },
      };
    }

    // 填空题：每个空白都要匹配（不区分大小写，去除首尾空格）
    const normalizedCorrect = correctAnswers.map(ans => String(ans).trim().toLowerCase());
    const normalizedUser = userAnswers.map(ans => String(ans).trim().toLowerCase());
    
    let correctCount = 0;
    const maxLength = Math.max(normalizedCorrect.length, normalizedUser.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < normalizedCorrect.length && i < normalizedUser.length) {
        if (normalizedCorrect[i] === normalizedUser[i]) {
          correctCount++;
        }
      }
    }

    // 填空题：所有空白都正确才算满分，否则按比例给分
    const isCorrect = correctCount === normalizedCorrect.length && 
                     normalizedCorrect.length === normalizedUser.length;
    const score = normalizedCorrect.length > 0 
      ? correctCount / normalizedCorrect.length 
      : 0;

    return {
      isCorrect,
      score,
      details: {
        correctAnswers,
        userAnswers,
        correctCount,
        totalBlanks: normalizedCorrect.length,
        type: questionType,
      },
    };
  }

  if (questionType === 'short') {
    // 简答题：使用简单的文本相似度判断（可以后续改进为更智能的算法）
    const correctAnswer = String(question.answer || '').trim().toLowerCase();
    const userAnswerStr = String(userAnswer || '').trim().toLowerCase();
    
    if (!correctAnswer || !userAnswerStr) {
      return {
        isCorrect: false,
        score: 0,
        details: {
          correctAnswer,
          userAnswer: userAnswerStr,
          type: questionType,
        },
      };
    }

    // 简单的相似度计算（基于关键词匹配）
    const correctWords = correctAnswer.split(/\s+/).filter(w => w.length > 1);
    const userWords = userAnswerStr.split(/\s+/).filter(w => w.length > 1);
    
    if (correctWords.length === 0) {
      return {
        isCorrect: false,
        score: 0,
        details: {
          correctAnswer,
          userAnswer: userAnswerStr,
          type: questionType,
        },
      };
    }

    // 计算关键词匹配率
    const matchedWords = userWords.filter(word => 
      correctWords.some(correctWord => 
        correctWord.includes(word) || word.includes(correctWord)
      )
    ).length;

    const similarity = correctWords.length > 0 
      ? matchedWords / correctWords.length 
      : 0;

    // 简答题：相似度超过 70% 算正确（可以调整阈值）
    const isCorrect = similarity >= 0.7;
    const score = similarity; // 返回相似度作为分数

    return {
      isCorrect,
      score,
      details: {
        correctAnswer,
        userAnswer: userAnswerStr,
        similarity,
        matchedWords,
        totalWords: correctWords.length,
        type: questionType,
      },
    };
  }

  if (questionType === 'coding') {
    const referenceCode = question.codingMeta?.referenceCode || String(question.answer || '');
    const userCode = String(userAnswer || '');
    const normalizedReference = normalizeCodeForCompare(referenceCode);
    const normalizedUser = normalizeCodeForCompare(userCode);

    if (!normalizedUser) {
      return {
        isCorrect: false,
        score: 0,
        details: {
          type: questionType,
          userAnswer: userCode,
        },
      };
    }

    const similarity = codeSimilarity(normalizedReference, normalizedUser);
    const isCorrect = similarity >= 0.92;

    return {
      isCorrect,
      score: similarity,
      details: {
        type: questionType,
        similarity,
        referenceCode,
        userAnswer: userCode,
      },
    };
  }

  // 未知题型，返回默认值
  return {
    isCorrect: false,
    score: 0,
    details: {
      type: questionType,
      error: '未知题型',
    },
  };
}

/**
 * 批量判分
 * @param {Array} questions - 题目数组
 * @param {Object} answers - 答案对象 { questionId: userAnswer }
 * @returns {Object} { total: number, correct: number, wrong: number, empty: number, accuracy: number, details: Array }
 */
export function batchCheckAnswers(questions, answers) {
  let correct = 0;
  let wrong = 0;
  let empty = 0;
  let totalScore = 0;
  const details = [];

  questions.forEach((question, index) => {
    const questionId = question._id || question.id || index;
    const userAnswer = answers[questionId];

    if (userAnswer === null || userAnswer === undefined || 
        (Array.isArray(userAnswer) && userAnswer.length === 0) ||
        (typeof userAnswer === 'string' && !userAnswer.trim())) {
      empty++;
      details.push({
        index,
        questionId,
        isCorrect: false,
        isEmpty: true,
        score: 0,
      });
      return;
    }

    const result = checkAnswer(question, userAnswer);
    totalScore += result.score;

    if (result.isCorrect) {
      correct++;
    } else {
      wrong++;
    }

    details.push({
      index,
      questionId,
      isCorrect: result.isCorrect,
      isEmpty: false,
      score: result.score,
      details: result.details,
    });
  });

  const total = questions.length;
  const accuracy = total > 0 ? correct / total : 0;

  return {
    total,
    correct,
    wrong,
    empty,
    accuracy,
    averageScore: total > 0 ? totalScore / total : 0,
    totalScore,
    details,
  };
}

/**
 * 格式化答案显示（用于结果页面）
 * @param {Object} question - 题目对象
 * @param {*} userAnswer - 用户答案
 * @returns {string} 格式化的答案字符串
 */
export function formatAnswerDisplay(question, userAnswer) {
  const questionType = question.type || 'single';

  if (questionType === 'single' || questionType === 'judge') {
    if (typeof userAnswer === 'number' && question.options && question.options[userAnswer]) {
      return `${String.fromCharCode(65 + userAnswer)}. ${question.options[userAnswer]}`;
    }
    return userAnswer != null ? String(userAnswer) : '未作答';
  }

  if (questionType === 'multiple') {
    if (Array.isArray(userAnswer) && userAnswer.length > 0) {
      return userAnswer
        .sort((a, b) => a - b)
        .map(idx => {
          if (question.options && question.options[idx]) {
            return `${String.fromCharCode(65 + idx)}. ${question.options[idx]}`;
          }
          return String.fromCharCode(65 + idx);
        })
        .join(', ');
    }
    return '未作答';
  }

  if (questionType === 'fill') {
    if (Array.isArray(userAnswer) && userAnswer.length > 0) {
      return userAnswer.map((ans, idx) => `空白${idx + 1}: ${ans || '(空)'}`).join('; ');
    }
    return '未作答';
  }

  if (questionType === 'short') {
    return userAnswer || '未作答';
  }

  if (questionType === 'coding') {
    return userAnswer ? '[已提交代码]' : '未作答';
  }

  return String(userAnswer || '未作答');
}

/**
 * 格式化正确答案显示
 * @param {Object} question - 题目对象
 * @returns {string} 格式化的正确答案字符串
 */
export function formatCorrectAnswerDisplay(question) {
  const questionType = question.type || 'single';

  if (questionType === 'single' || questionType === 'judge') {
    const correctIndex = question.answerIndex ?? question.answer;
    if (typeof correctIndex === 'number' && question.options && question.options[correctIndex]) {
      return `${String.fromCharCode(65 + correctIndex)}. ${question.options[correctIndex]}`;
    }
    return String(correctIndex ?? '未知');
  }

  if (questionType === 'multiple') {
    const correctAnswers = Array.isArray(question.answer) 
      ? question.answer 
      : (Array.isArray(question.answerIndices) ? question.answerIndices : []);
    
    if (correctAnswers.length > 0 && question.options) {
      return correctAnswers
        .sort((a, b) => a - b)
        .map(idx => `${String.fromCharCode(65 + idx)}. ${question.options[idx]}`)
        .join(', ');
    }
    return '未知';
  }

  if (questionType === 'fill') {
    const blankAnswers = question.blankAnswers || question.answer || [];
    if (blankAnswers.length > 0) {
      return blankAnswers.map((ans, idx) => `空白${idx + 1}: ${ans}`).join('; ');
    }
    return '未知';
  }

  if (questionType === 'short') {
    return question.answer || '未知';
  }

  if (questionType === 'coding') {
    return '[参考代码]';
  }

  return '未知';
}

