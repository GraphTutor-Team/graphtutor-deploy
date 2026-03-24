// client/src/constants/index.js
// 前端常量定义：避免魔法数字和字符串

// API 配置
export const API_CONFIG = {
  BASE_URL: '/api',
  TIMEOUT: 15000, // 15秒
  TOKEN_KEYS: ['gt_token', 'token', 'authToken'],
};

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SKIP: 0,
};

// 题目配置
export const QUESTION_CONFIG = {
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 10,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 5,
  DEFAULT_DIFFICULTY: 1,
};

// 用户输入限制
export const INPUT_LIMITS = {
  EMAIL_MAX_LENGTH: 254,
  NAME_MAX_LENGTH: 100,
  CONTENT_MAX_LENGTH: 2000,
  OPTION_MAX_LENGTH: 500,
  SEARCH_QUERY_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 6,
};

// 本地存储键名
export const STORAGE_KEYS = {
  QUIZ_SESSION_ID: 'quiz_sid',
  THEME: 'theme',
};

// Toast 配置
export const TOAST_CONFIG = {
  DEFAULT_DURATION: 1800, // 毫秒
};

