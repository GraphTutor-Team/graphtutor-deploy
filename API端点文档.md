# GraphTutor V3.0 API端点文档

> **最后更新**: 2025年  
> **版本**: 3.0  
> **API版本**: v3

---

## 📋 目录

1. [API概述](#api概述)
2. [认证相关](#认证相关)
3. [用户相关](#用户相关)
4. [题库相关](#题库相关)
5. [题目相关](#题目相关)
6. [学习相关](#学习相关)
7. [社交相关](#社交相关)
8. [管理相关](#管理相关)

---

## API概述

### 基础信息
- **Base URL**: `/api/v3`
- **认证方式**: JWT Token
- **响应格式**: JSON
- **字符编码**: UTF-8

### 统一响应格式

#### 成功响应
```json
{
  "success": true,
  "data": { ... }
}
```

#### 错误响应
```json
{
  "success": false,
  "message": "错误信息"
}
```

---

## 认证相关

### `POST /api/auth/register` - 用户注册
- **描述**: 注册新用户
- **请求体**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "用户名"
  }
  ```
- **响应**: 用户信息和Token

### `POST /api/auth/login` - 用户登录
- **描述**: 用户登录
- **请求体**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **响应**: Token和用户信息

### `POST /api/auth/logout` - 用户登出
- **描述**: 用户登出
- **认证**: 需要Token
- **响应**: 成功消息

### `POST /api/auth/refresh` - 刷新Token
- **描述**: 刷新访问Token
- **认证**: 需要Refresh Token
- **响应**: 新的Token

---

## 用户相关

### `GET /api/users/profile` - 获取用户信息
- **描述**: 获取当前用户信息
- **认证**: 需要Token
- **响应**: 用户详细信息

### `PUT /api/users/profile` - 更新用户信息
- **描述**: 更新用户信息
- **认证**: 需要Token
- **请求体**: 用户信息对象
- **响应**: 更新后的用户信息

### `GET /api/users/stats` - 获取用户统计
- **描述**: 获取用户学习统计
- **认证**: 需要Token
- **响应**: 学习统计数据

---

## 题库相关 (`/api/v3/question-banks`)

### `GET /api/v3/question-banks` - 获取题库列表
- **描述**: 获取题库列表
- **认证**: 需要Token
- **查询参数**: 
  - `page`: 页码
  - `limit`: 每页数量
  - `search`: 搜索关键词
- **响应**: 题库列表

### `POST /api/v3/question-banks` - 创建题库
- **描述**: 创建新题库
- **认证**: 需要Token（出题负责人或管理员）
- **请求体**: 题库信息
- **响应**: 创建的题库信息

### `GET /api/v3/question-banks/:id` - 获取题库详情
- **描述**: 获取指定题库的详细信息
- **认证**: 需要Token
- **响应**: 题库详细信息

### `PUT /api/v3/question-banks/:id` - 更新题库
- **描述**: 更新题库信息
- **认证**: 需要Token（所有者或管理员）
- **请求体**: 更新的题库信息
- **响应**: 更新后的题库信息

### `DELETE /api/v3/question-banks/:id` - 删除题库
- **描述**: 删除题库
- **认证**: 需要Token（所有者或管理员）
- **响应**: 成功消息

### `GET /api/v3/question-banks/:id/stats` - 获取题库统计
- **描述**: 获取题库统计数据
- **认证**: 需要Token
- **响应**: 题库统计数据

---

## 题目相关 (`/api/v3/questions`)

### `GET /api/v3/questions` - 获取题目列表
- **描述**: 获取题目列表
- **认证**: 需要Token
- **查询参数**: 
  - `page`: 页码
  - `limit`: 每页数量
  - `bankId`: 题库ID
  - `difficulty`: 难度
  - `type`: 题型
- **响应**: 题目列表

### `POST /api/v3/questions` - 创建题目
- **描述**: 创建新题目
- **认证**: 需要Token（出题负责人或管理员）
- **请求体**: 题目信息
- **响应**: 创建的题目信息

### `GET /api/v3/questions/:id` - 获取题目详情
- **描述**: 获取指定题目的详细信息
- **认证**: 需要Token
- **响应**: 题目详细信息

### `PUT /api/v3/questions/:id` - 更新题目
- **描述**: 更新题目信息
- **认证**: 需要Token（所有者或管理员）
- **请求体**: 更新的题目信息
- **响应**: 更新后的题目信息

### `DELETE /api/v3/questions/:id` - 删除题目
- **描述**: 删除题目
- **认证**: 需要Token（所有者或管理员）
- **响应**: 成功消息

---

## 学习相关 (`/api/v3`)

### 学习目标 (`/learning-goals`)
- `GET /api/v3/learning-goals` - 获取学习目标列表
- `POST /api/v3/learning-goals` - 创建学习目标
- `PUT /api/v3/learning-goals/:id` - 更新学习目标
- `DELETE /api/v3/learning-goals/:id` - 删除学习目标

### 学习成就 (`/achievements`)
- `GET /api/v3/achievements` - 获取成就列表
- `GET /api/v3/achievements/:id` - 获取成就详情

### 智能推荐 (`/recommendations`)
- `GET /api/v3/recommendations` - 获取推荐内容
- `GET /api/v3/recommendations/questions` - 获取题目推荐

### 复习计划 (`/review-plans`)
- `GET /api/v3/review-plans` - 获取复习计划列表
- `POST /api/v3/review-plans` - 创建复习计划
- `PUT /api/v3/review-plans/:id` - 更新复习计划
- `DELETE /api/v3/review-plans/:id` - 删除复习计划

### 错题本 (`/wrong-questions`)
- `GET /api/v3/wrong-questions` - 获取错题列表
- `POST /api/v3/wrong-questions` - 添加错题
- `DELETE /api/v3/wrong-questions/:id` - 删除错题

### 收藏夹 (`/favorites`)
- `GET /api/v3/favorites` - 获取收藏列表
- `POST /api/v3/favorites` - 添加收藏
- `DELETE /api/v3/favorites/:id` - 删除收藏

### 学习笔记 (`/notes`)
- `GET /api/v3/notes` - 获取笔记列表
- `POST /api/v3/notes` - 创建笔记
- `GET /api/v3/notes/:id` - 获取笔记详情
- `PUT /api/v3/notes/:id` - 更新笔记
- `DELETE /api/v3/notes/:id` - 删除笔记

### 学习计划 (`/study-plans`)
- `GET /api/v3/study-plans` - 获取学习计划列表
- `POST /api/v3/study-plans` - 创建学习计划
- `PUT /api/v3/study-plans/:id` - 更新学习计划
- `DELETE /api/v3/study-plans/:id` - 删除学习计划

### 每日打卡 (`/check-in`)
- `GET /api/v3/check-in` - 获取打卡记录
- `POST /api/v3/check-in` - 创建打卡记录

### 学习分析 (`/analytics`)
- `GET /api/v3/analytics` - 获取学习分析数据
- `GET /api/v3/analytics/export` - 导出分析报告

### 增强分析 (`/enhanced-analytics`)
- `GET /api/v3/enhanced-analytics` - 获取增强分析数据
- `GET /api/v3/enhanced-analytics/insights` - 获取AI学习洞察

---

## 社交相关 (`/api/v3`)

### 好友管理 (`/friends`)
- `GET /api/v3/friends` - 获取好友列表
- `GET /api/v3/friends/requests` - 获取好友请求列表
- `POST /api/v3/friends/requests` - 发送好友请求
- `PUT /api/v3/friends/requests/:id` - 处理好友请求
- `DELETE /api/v3/friends/:id` - 删除好友

### 好友挑战 (`/friend-challenges`)
- `GET /api/v3/friend-challenges` - 获取挑战列表
- `POST /api/v3/friend-challenges` - 创建挑战
- `PUT /api/v3/friend-challenges/:id` - 更新挑战（接受/拒绝）
- `GET /api/v3/friend-challenges/:id` - 获取挑战详情

### 学习动态 (`/learning-posts`)
- `GET /api/v3/learning-posts` - 获取动态列表
- `POST /api/v3/learning-posts` - 发布动态
- `PUT /api/v3/learning-posts/:id/like` - 点赞动态
- `POST /api/v3/learning-posts/:id/comments` - 评论动态

### 讨论区 (`/discussions`)
- `GET /api/v3/discussions` - 获取讨论列表
- `POST /api/v3/discussions` - 创建讨论
- `GET /api/v3/discussions/:id` - 获取讨论详情
- `POST /api/v3/discussions/:id/replies` - 回复讨论

### 排行榜 (`/leaderboard`)
- `GET /api/v3/leaderboard` - 获取排行榜
- **查询参数**: 
  - `type`: 排行类型（综合、答题量、正确率、连续学习）
  - `period`: 时间范围（全部、本周、本月）

### 学习群组 (`/groups`)
- `GET /api/v3/groups` - 获取群组列表
- `POST /api/v3/groups` - 创建群组
- `GET /api/v3/groups/:id` - 获取群组详情
- `POST /api/v3/groups/:id/join` - 加入群组
- `DELETE /api/v3/groups/:id/leave` - 退出群组

### 消息系统 (`/messages`)
- `GET /api/v3/messages` - 获取消息列表
- `POST /api/v3/messages` - 发送消息
- `PUT /api/v3/messages/:id/read` - 标记已读
- `PUT /api/v3/messages/:id/recall` - 撤回消息
- `DELETE /api/v3/messages/:id` - 删除消息

### 通知系统 (`/notifications`)
- `GET /api/v3/notifications` - 获取通知列表
- `PUT /api/v3/notifications/:id/read` - 标记已读
- `DELETE /api/v3/notifications/:id` - 删除通知

---

## 管理相关 (`/api/v3`)

### 角色申请 (`/role-applications`)
- `GET /api/v3/role-applications` - 获取申请列表
- `POST /api/v3/role-applications` - 提交角色申请
- `PUT /api/v3/role-applications/:id` - 审核申请（管理员）

### 学科管理 (`/subjects`)
- `GET /api/v3/subjects` - 获取学科列表
- `POST /api/v3/subjects` - 创建学科（管理员）
- `PUT /api/v3/subjects/:id` - 更新学科（管理员）
- `DELETE /api/v3/subjects/:id` - 删除学科（管理员）

### AI控制台 (`/ai`)
- `GET /api/v3/ai/logs` - 获取AI运行日志（管理员）
- `POST /api/v3/ai/generate` - AI生成题目（需要权限）

---

## WebSocket事件

### 连接事件
- `connect` - 连接成功
- `disconnect` - 断开连接

### 消息事件
- `message:new` - 新消息
- `message:read` - 消息已读
- `message:recall` - 消息撤回

### 通知事件
- `notification:new` - 新通知

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

**相关文档**:
- [功能清单](功能清单.md) - 页面功能列表
- [功能模块详解](功能模块详解.md) - 功能模块说明
- [Swagger API文档](http://localhost:5000/api-docs) - 在线API文档（开发环境）

