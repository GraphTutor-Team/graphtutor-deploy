/** 只保留页面类型，具体动作统一放在浮窗里，不再按页堆提问。 */

const GUIDES = [
  { test: (p) => p === '/home' || p === '/', type: 'home' },
  { test: (p) => p === '/graph', type: 'graph' },
  { test: (p) => p === '/nodes' || p.startsWith('/nodes'), type: 'nodes' },
  { test: (p) => p === '/notes' || p.startsWith('/notes'), type: 'notes' },
  { test: (p) => p === '/statistics' || p === '/analytics', type: 'analytics' },
  { test: (p) => p === '/learning-path', type: 'learning_path' },
  { test: (p) => p === '/goals' || p === '/learning-goals', type: 'goals' },
  { test: (p) => p === '/study-plans', type: 'plans' },
  { test: (p) => p === '/check-in' || p === '/checkin', type: 'checkin' },
  { test: (p) => p === '/recommendations', type: 'recommendations' },
  { test: (p) => p === '/quiz' || p.startsWith('/quiz'), type: 'quiz' },
  { test: (p) => p === '/exam', type: 'exam' },
  { test: (p) => p === '/review' || p.startsWith('/review'), type: 'review' },
  { test: (p) => p === '/result', type: 'result' },
  { test: (p) => p.includes('/questions/') && p.includes('/detail'), type: 'question_detail' },
  { test: (p) => p === '/community' || p.startsWith('/community'), type: 'community' },
  { test: (p) => p.startsWith('/messages'), type: 'messages' },
  { test: (p) => p.startsWith('/groups'), type: 'groups' },
];

const ASK = {
  quiz: '根据当前题目给一个提示，先不要公布答案。',
  exam: '根据当前题目给一个提示，先不要公布答案。',
  review: '根据当前错题，用三句话说明薄弱点和怎么避免再错。',
  result: '根据这次作答摘要，用三句话说明主要错因。',
  notes: '根据当前笔记，整理成要点和易混点，不要编造笔记里没有的内容。',
  home: '根据首页信息，用三句话说今天先做什么。',
  graph: '根据掌握度较低的知识点，说先补哪一个。',
  analytics: '根据统计里的正确率和薄弱点，用三句话说明本周该练什么。',
  learning_path: '用三句话解释当前学习路径的第一步。',
  goals: '根据当前学习目标，拆成接下来三天的小任务。',
  plans: '根据现有学习计划，说这周怎么安排。',
};

export function getPageGuide(pathname = '') {
  return GUIDES.find((guide) => guide.test(pathname)) || { type: 'other' };
}

export function askForPage(pathname = '') {
  const { type } = getPageGuide(pathname);
  return ASK[type] || '根据当前页面上的信息，用三句话给我下一步建议。';
}
