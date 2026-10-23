import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'gt_lang';

const EN = {
  学习: 'Learn',
  首页: 'Home',
  练习: 'Practice',
  错题复习: 'Review',
  学习数据: 'Analytics',
  学习笔记: 'Notes',
  学习计划: 'Plans',
  社交: 'Social',
  消息: 'Messages',
  好友: 'Friends',
  群组: 'Groups',
  社区: 'Community',
  更多: 'More',
  考试: 'Exam',
  知识图谱: 'Graph',
  我的收藏: 'Favorites',
  每日打卡: 'Check-in',
  智能推荐: 'Recommend',
  发现好友: 'Find friends',
  好友挑战: 'Challenges',
  学习动态: 'Posts',
  复习计划: 'Review plans',
  排行榜: 'Leaderboard',
  师徒: 'Mentors',
  学习路径: 'Path',
  技能树: 'Skill tree',
  学习目标: 'Goals',
  学习成就: 'Achievements',
  机构: 'Organizations',
  系统设置: 'Settings',
};

const LanguageContext = createContext({
  lang: 'zh',
  setLang: () => {},
  t: (text) => text,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'zh');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang: (next) => setLangState(next === 'en' ? 'en' : 'zh'),
    t: (text) => (lang === 'en' ? EN[text] || text : text),
  }), [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
