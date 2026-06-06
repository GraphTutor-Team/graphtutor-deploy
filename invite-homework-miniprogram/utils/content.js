/**
 * GraphTutor 项目内容配置
 *
 * 文案来源（与主项目文档保持一致）：
 * - README.md / 功能清单.md：产品定位、核心特性
 * - docs/PAGES_AND_FEATURES.md：首页入口、挑战与联赛、知识图谱
 * - miniprogram/pages/index：小程序品牌 slogan
 * - miniprogram/utils/shop-data.js：课程包与题单名称
 * - client/public/manifest.json：PWA 描述
 *
 * 修改活动文案时优先改此文件。
 */
module.exports = {
  brand: {
    name: 'GraphTutor',
    version: 'V3.0',
    tagline: '图结构 · 智能练习',
    description: '基于知识图谱的智能学习系统',
    heroDesc: '知识图谱、练习与计划，一站入口'
  },

  event: {
    title: 'GraphTutor 图论挑战赛',
    subTitle: '2026 校园学习挑战邀请',
    slogan: '算法与逻辑的巅峰',
    inviteDesc:
      'GraphTutor V3.0 提供题目练习、学习分析、社交学习与数据管理。诚邀你参与校园挑战活动，体验知识图谱练习、错题复习、每日挑战与好友对战。',
    organizer: '主办方：GraphTutor 学习平台',
    date: '2026年5月20日 14:00',
    place: '校园创新中心 · 3F 路演厅',
    deadline: '2026年5月15日',
    coverImage: '/assets/images/invite-cover.svg'
  },

  /** 活动亮点 — 对应 功能清单.md / PAGES_AND_FEATURES.md 核心能力 */
  highlights: [
    { icon: '📚', title: '练习与测验', desc: '选择题库与题量，错题自动进入错题本' },
    { icon: '🗺️', title: '知识图谱', desc: '可视化知识点，个性化学习路径推荐' },
    { icon: '🏆', title: '每日挑战', desc: '随机 10 题同题竞技，实时排名' },
    { icon: '👥', title: '社交学习', desc: '好友挑战、学习动态与排行榜' }
  ],

  /** 首页推荐路径 — 来自 PAGES_AND_FEATURES.md */
  learningPath: [
    { step: '1', title: '选择题库练习', desc: '按学科与题量开始练习' },
    { step: '2', title: '错题复习', desc: '薄弱知识点专项巩固' },
    { step: '3', title: '复习计划', desc: '系统化安排复习节奏' }
  ],

  sections: {
    photosTitle: '现场照片',
    photosSubtitle: '练习、图谱与挑战赛现场记录',
    historyTitle: '往期举办与回放',
    historySubtitle: 'GraphTutor 平台历年学习与挑战活动',
    mapTitle: '活动地图',
    mapSubtitle: '校园创新中心 · 3F 路演厅',
    formTitle: '参赛信息提交',
    formSubtitle: '填写信息完成报名（学生 / 志愿者）'
  },

  photoList: [
    { title: '知识图谱可视化练习', image: '/assets/images/theme-2.jpg' },
    { title: '每日挑战竞技现场', image: '/assets/images/theme-3.jpg' },
    { title: '错题巩固专项训练', image: '/assets/images/theme-4.jpg' },
    { title: '好友挑战与学习动态', image: '/assets/images/theme-7.jpg' },
    { title: '学科联赛排行榜', image: '/assets/images/theme-8.jpg' }
  ],

  historyList: [
    { title: '2024 每日挑战季', image: '/assets/images/theme-11.jpg' },
    { title: '2024 学科联赛 · 图结构专题', image: '/assets/images/theme-12.jpg' },
    { title: '2025 知识图谱练习周', image: '/assets/images/theme-14.jpg' },
    { title: '2025 好友挑战友谊赛', image: '/assets/images/theme-16.jpg' },
    { title: '2023 校园学习打卡月', image: '/assets/images/theme-22.jpg' }
  ],

  videoLabels: [
    '平台介绍：GraphTutor V3.0 速览',
    '活动回顾：挑战赛场次集锦'
  ],

  /** 报名技能方向 — 对应 shop-data 课程包 + 功能清单学习模块 */
  skillOptions: [
    { label: '图论基础训练', value: '图论基础训练' },
    { label: 'BFS/DFS 专项', value: 'BFS/DFS 专项' },
    { label: '最短路径进阶', value: '最短路径进阶' },
    { label: '错题巩固计划', value: '错题巩固计划' }
  ]
};
