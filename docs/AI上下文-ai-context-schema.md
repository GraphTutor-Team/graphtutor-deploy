# AI 学习伴侣 - 上下文注入规范

> Phase 0.2：供 `/api/v3/ai/chat` 及前端助手使用的上下文结构说明。

## 用途

前端在调用 AI 对话时，可传入当前学习上下文，使回答更贴合「当前题目」「当前知识点」「近期错题」等，实现「这道题的解题思路是什么」「根据我的错题推荐 5 道题」等能力。

## JSON Schema（约定）

```json
{
  "pageType": "string | 可选。当前页面类型，如：question_detail | quiz | exam | review | home | analytics",
  "questionId": "string | 可选。当前题目 ID（题目详情页、练习/考试当前题）",
  "knowledgeNodeId": "string | 可选。当前知识点 ID",
  "wrongQuestionIds": "string[] | 可选。用户近期错题 ID 列表，最多建议 20 条，用于推荐练习"
}
```

## 各页面建议传入字段

| 页面 | pageType | questionId | knowledgeNodeId | wrongQuestionIds |
|------|----------|------------|-----------------|------------------|
| 题目详情 | question_detail | 当前题目 id | 题目的 knowledgeNodeId | 可选，从错题接口拉取 |
| 练习/考试 | quiz / exam | 当前作答题目 id | 可选 | 可选 |
| 错题复习 | review | 可选 | 可选 | 当前列表题目 id |
| 首页/学习分析 | home / analytics | - | - | 可选 |

## 后端使用方式

- `POST /api/v3/ai/chat` 的 `body.context` 即上述对象。
- 后端将 `context` 拼进 system prompt，不落库，仅当次请求有效。

## 前端注入方式

- 全局悬浮助手：通过 React Context 或 URL/路由获取当前页面类型；题目/知识点/错题 ID 由各页通过 Context 提供（见 Phase 1）。
- 题目详情页「AI 讲解」：仅传当前题目内容，不依赖本 schema，使用 `/api/v3/ai/generate-explanation`。
