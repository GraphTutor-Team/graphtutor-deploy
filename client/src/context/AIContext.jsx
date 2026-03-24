/**
 * AI 学习伴侣上下文（Phase 1.1）
 * 各页面可设置当前学习上下文，供悬浮助手注入到 /api/v3/ai/chat
 */

import { createContext, useContext, useState, useCallback } from 'react';

const AIContext = createContext({
  pageType: 'other',
  questionId: null,
  knowledgeNodeId: null,
  setAIContext: () => {},
});

export function AIContextProvider({ children }) {
  const [ctx, setCtx] = useState({
    pageType: 'other',
    questionId: null,
    knowledgeNodeId: null,
  });

  const setAIContext = useCallback((next) => {
    setCtx((prev) => (typeof next === 'function' ? next(prev) : { ...prev, ...next }));
  }, []);

  return (
    <AIContext.Provider value={{ ...ctx, setAIContext }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  return useContext(AIContext);
}
