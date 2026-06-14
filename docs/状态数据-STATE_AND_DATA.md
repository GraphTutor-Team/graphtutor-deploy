# 状态管理与数据一致性

## 当前方案概览

- **全局状态**：仅使用 **React Context**（`AuthContext` + `LearningDataContext`），未使用 Redux/Zustand。
- **学习数据**：以后端为唯一数据源，不做客户端持久化；通过「提交后失效 + 各页重新拉取」保证跨页面一致。

---

## 跨页面学习数据同步

### 机制

1. **LearningDataContext**  
   - 提供 `learningDataVersion`（数字）和 `invalidateLearningData()`。  
   - 在「练习提交」「考试提交」等会改变学习记录/错题的操作后，调用 `invalidateLearningData()`，版本号 +1，并写入 `sessionStorage` 标志 `learningDataInvalidated`。

2. **首页 /home**  
   - 监听 `learningDataVersion`：若版本增加，则清空首页短期缓存并重新拉取（通知、推荐、好友数）。  
   - `loadData` 时若发现 `learningDataInvalidated` 标志，先清缓存再拉取，保证从其他页（如结果页）返回首页也能看到最新数据。

3. **学习概览（LearningOverview）**  
   - `useApiData` 的 `dependencies` 包含 `learningDataVersion`，版本变化会重新请求「今日复习」「学习效率」「学习建议」。

4. **学习统计 /statistics（Analytics）**  
   - `loadData` 的依赖包含 `learningDataVersion`，版本变化会重新拉取统计与图表。  
   - 监听 `document.visibilitychange`：页签从后台切回前台时再次 `loadData()`，避免在别的页签做完题后统计仍为旧数据。

5. **练习 /quiz、考试 /exam**  
   - 批量（或逐条）提交记录成功后，立即调用 `invalidateLearningData()`。

### 数据流简述

- 在 /quiz 或 /exam 提交 → 后端写入记录与错题 → 前端调用 `invalidateLearningData()`。  
- 回到 /home：首页清缓存或受版本影响重新拉取；LearningOverview 因版本变化自动重拉。  
- 进入 /statistics：Analytics 挂载时用当前 `user/filters/learningDataVersion` 拉取，得到包含刚完成记录的数据；若统计页已打开，切回该页签时会因 visibility 再次拉取。

---

## 关键数据是否持久化

- **学习记录、错题状态**：只存服务端。提交成功后由后端落库，前端不另做持久化。  
- **登录态**：Token 存 localStorage（或项目配置的 storage），通过 AuthContext 与刷新逻辑维护。  
- **首页短期缓存**：仅内存 + 20s TTL，用于减少重复请求；在失效或带 `learningDataInvalidated` 时会被清掉并重新拉取。

未使用 Redux/Zustand，因此没有额外的「学习数据持久化策略」需要配置；若未来引入全局 store，建议仍以服务端为权威数据源，前端仅做缓存与失效同步。

---

## 可选扩展

- 在错题本「掌握/取消掌握」、复习计划执行等也会改变学习状态的地方，按需调用 `invalidateLearningData()`。  
- 若增加「练习/考试草稿」功能，可单独对草稿做 localStorage 持久化，与「学习记录/错题」的服务器权威分开处理。
