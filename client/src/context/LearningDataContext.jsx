/**
 * GraphTutor V3.0 - 学习数据失效上下文
 *
 * 作用：跨页面学习数据一致性。当用户完成练习/考试、更新错题等操作后，
 * 调用 invalidateLearningData()，首页学习概览、统计页等会重新拉取数据，避免看到过期数据。
 * 不依赖 Redux/Zustand，学习记录与错题状态以后端为准，此处仅做“失效 + 重拉”的同步。
 */

import { createContext, useContext, useCallback, useState } from 'react';

const LearningDataContext = createContext(null);

export function LearningDataProvider({ children }) {
  const [learningDataVersion, setLearningDataVersion] = useState(0);

  const invalidateLearningData = useCallback(() => {
    setLearningDataVersion((v) => v + 1);
    try {
      sessionStorage.setItem('learningDataInvalidated', '1');
    } catch (_) {}
  }, []);

  const value = {
    learningDataVersion,
    invalidateLearningData,
  };

  return (
    <LearningDataContext.Provider value={value}>
      {children}
    </LearningDataContext.Provider>
  );
}

export function useLearningData() {
  const ctx = useContext(LearningDataContext);
  if (!ctx) {
    return {
      learningDataVersion: 0,
      invalidateLearningData: () => {},
    };
  }
  return ctx;
}
