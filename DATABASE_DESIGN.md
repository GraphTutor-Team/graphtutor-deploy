# GraphTutor V3.0 数据库设计文档

> **版本**: 3.0.0  
> **数据库**: MongoDB  
> **ODM**: Mongoose

---

## 📋 目录

1. [数据库概述](#数据库概述)
2. [数据模型列表](#数据模型列表)
3. [核心模型详解](#核心模型详解)
4. [关系设计](#关系设计)
5. [索引设计](#索引设计)
6. [数据迁移](#数据迁移)

---

## 数据库概述

### 数据库信息
- **数据库名**: `graphtutor`
- **类型**: MongoDB (NoSQL)
- **连接**: Mongoose ODM
- **版本**: MongoDB 4.4+

### 设计原则
- **文档存储**: 灵活的文档结构
- **关系设计**: 使用引用和嵌入
- **索引优化**: 关键字段建立索引
- **数据一致性**: 应用层保证

---

## 数据模型列表

### 用户相关
- `User` - 用户信息
- `RoleApplication` - 角色申请
- `RefreshToken` - 刷新Token

### 题目相关
- `Question` - 题目
- `QuestionBank` - 题库
- `QuestionVersion` - 题目版本
- `Record` - 答题记录

### 知识图谱相关
- `KnowledgeNode` - 知识点
- `GraphNode` - 图谱节点
- `GraphLink` - 图谱关系
- `Subject` - 学科分类

### 学习相关
- `LearningGoal` - 学习目标
- `Achievement` - 学习成就
- `WrongQuestion` - 错题
- `ReviewPlan` - 复习计划
- `Favorite` - 收藏
- `FavoriteFolder` - 收藏文件夹
- `Note` - 学习笔记
- `NoteLike` - 笔记点赞
- `NoteFavorite` - 笔记收藏
- `StudyPlan` - 学习计划
- `StudyTask` - 学习任务
- `StudyCheckIn` - 打卡记录

### 社交相关
- `Friendship` - 好友关系
- `FriendRequest` - 好友请求
- `FriendChallenge` - 好友挑战
- `LearningPost` - 学习动态
- `LearningPostComment` - 动态评论
- `Discussion` - 讨论
- `DiscussionReply` - 讨论回复
- `Message` - 消息
- `Notification` - 通知
- `Group` - 学习群组

### 管理相关
- `UserOperationLog` - 操作日志
- `AIRunLog` - AI运行日志
- `Template` - 模板

### 其他
- `Quiz` - 测验
- `QuizSession` - 测验会话

---

## 核心模型详解

### User (用户)

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  name: String,
  avatar: String,
  role: String (enum: ['student', 'question_manager', 'admin']),
  status: String (enum: ['active', 'inactive', 'banned']),
  friendSettings: {
    allowFriendRequests: Boolean,
    allowChallenges: Boolean,
    showLearningData: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
- `email`: unique
- `role`: index
- `status`: index

### Question (题目)

```javascript
{
  _id: ObjectId,
  questionId: String (unique, required),
  bankId: String (ref: QuestionBank),
  type: String (enum: ['single', 'multiple', 'judge', 'fill', 'essay']),
  subjectId: String (ref: Subject),
  difficulty: String (enum: ['easy', 'medium', 'hard']),
  title: String (required),
  content: String (required),
  options: [String],
  correctAnswer: String/Array,
  explanation: String,
  tags: [String],
  version: Number,
  status: String (enum: ['draft', 'published', 'archived']),
  createdBy: String (ref: User),
  updatedBy: String (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
- `questionId`: unique
- `bankId`: index
- `subjectId`: index
- `type`: index
- `difficulty`: index
- `tags`: text index

### QuestionBank (题库)

```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  subjectId: String (ref: Subject),
  visibility: String (enum: ['public', 'private']),
  createdBy: String (ref: User),
  questionCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
- `createdBy`: index
- `subjectId`: index

### Friendship (好友关系)

```javascript
{
  _id: ObjectId,
  user1Id: String (ref: User, required),
  user2Id: String (ref: User, required),
  status: String (enum: ['pending', 'active', 'blocked']),
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
- `user1Id + user2Id`: compound unique
- `user1Id + status`: compound index
- `user2Id + status`: compound index

### LearningPost (学习动态)

```javascript
{
  _id: ObjectId,
  authorId: ObjectId (ref: User, required),
  type: String (enum: ['text', 'achievement', 'checkin', 'challenge', 'milestone']),
  title: String,
  content: String (required),
  images: [{
    url: String,
    thumbnail: String,
    alt: String
  }],
  relatedData: {
    achievementId: ObjectId (ref: Achievement),
    challengeId: ObjectId (ref: FriendChallenge),
    checkInId: ObjectId (ref: StudyCheckIn)
  },
  likes: [{
    userId: ObjectId (ref: User),
    createdAt: Date
  }],
  likeCount: Number,
  commentCount: Number,
  shareCount: Number,
  visibility: String (enum: ['public', 'friends', 'private']),
  tags: [String],
  pinned: Boolean,
  deleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
- `authorId + createdAt`: compound index
- `type + createdAt`: compound index
- `visibility + createdAt`: compound index
- `tags`: index
- `likeCount + createdAt`: compound index (热门动态)

### Message (消息)

```javascript
{
  _id: ObjectId,
  senderId: String (ref: User, required),
  receiverId: String (ref: User, required),
  content: String (required),
  type: String (enum: ['text', 'image', 'file']),
  read: Boolean,
  readAt: Date,
  deletedBySender: Boolean,
  deletedByReceiver: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
- `senderId + receiverId + createdAt`: compound index
- `receiverId + read + createdAt`: compound index

---

## 关系设计

### 一对多关系

#### User -> Question
- 一个用户可创建多个题目
- 使用 `createdBy` 字段引用

#### QuestionBank -> Question
- 一个题库包含多个题目
- 使用 `bankId` 字段引用

#### User -> LearningPost
- 一个用户可发布多个动态
- 使用 `authorId` 字段引用

#### LearningPost -> LearningPostComment
- 一个动态有多个评论
- 使用 `postId` 字段引用

### 多对多关系

#### User <-> User (Friendship)
- 用户之间的好友关系
- 使用中间集合 `Friendship`
- 双向关系，使用 `user1Id` 和 `user2Id`

#### User <-> Question (Favorite)
- 用户收藏题目
- 使用中间集合 `Favorite`

#### User <-> LearningPost (Like)
- 用户点赞动态
- 使用嵌入数组 `likes`

### 嵌入 vs 引用

#### 使用嵌入的场景
- 数据量小且不经常变化
- 需要一起查询的数据
- 示例: `LearningPost.likes` (点赞列表)

#### 使用引用的场景
- 数据量大
- 需要独立查询
- 需要关联多个文档
- 示例: `Question.createdBy` (创建者)

---

## 索引设计

### 单字段索引

```javascript
// User集合
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ status: 1 })

// Question集合
db.questions.createIndex({ questionId: 1 }, { unique: true })
db.questions.createIndex({ bankId: 1 })
db.questions.createIndex({ subjectId: 1 })
db.questions.createIndex({ type: 1 })
db.questions.createIndex({ difficulty: 1 })
```

### 复合索引

```javascript
// Friendship集合
db.friendships.createIndex({ user1Id: 1, user2Id: 1 }, { unique: true })
db.friendships.createIndex({ user1Id: 1, status: 1 })
db.friendships.createIndex({ user2Id: 1, status: 1 })

// LearningPost集合
db.learningposts.createIndex({ authorId: 1, createdAt: -1 })
db.learningposts.createIndex({ type: 1, createdAt: -1 })
db.learningposts.createIndex({ visibility: 1, createdAt: -1 })
db.learningposts.createIndex({ likeCount: -1, createdAt: -1 })

// Message集合
db.messages.createIndex({ senderId: 1, receiverId: 1, createdAt: -1 })
db.messages.createIndex({ receiverId: 1, read: 1, createdAt: -1 })
```

### 文本索引

```javascript
// Question集合 - 全文搜索
db.questions.createIndex({ 
  title: 'text', 
  content: 'text', 
  tags: 'text' 
})

// LearningPost集合 - 全文搜索
db.learningposts.createIndex({ 
  title: 'text', 
  content: 'text', 
  tags: 'text' 
})
```

### 索引优化建议

1. **查询优化**: 为常用查询字段建立索引
2. **复合索引**: 考虑查询顺序建立复合索引
3. **索引监控**: 使用 `explain()` 分析查询性能
4. **定期维护**: 删除未使用的索引

---

## 数据迁移

### 版本迁移

项目使用 Mongoose Schema 版本控制，模型变更会自动处理。

### 手动迁移脚本

位置: `server/scripts/migrate-to-v3.js`

```bash
# 执行迁移
npm run migrate

# 预览迁移（不执行）
npm run migrate:dry
```

### 数据备份

```bash
# 备份数据库
npm run db:backup

# 查看数据库统计
npm run db:stats

# 清理数据库
npm run db:cleanup
```

---

## 数据一致性

### 应用层保证

- **事务处理**: 关键操作使用事务
- **数据验证**: Mongoose Schema验证
- **引用完整性**: 应用层检查引用存在性

### 常见问题

#### 1. 级联删除
当前设计：应用层手动处理
```javascript
// 删除用户时，需要手动删除相关数据
await Question.deleteMany({ createdBy: userId })
await LearningPost.deleteMany({ authorId: userId })
```

#### 2. 数据冗余
- `likeCount`, `commentCount`: 冗余字段，提高查询性能
- 定期同步：使用聚合管道更新

---

## 性能优化

### 查询优化

1. **使用索引**: 确保查询字段有索引
2. **限制返回字段**: 使用 `select()` 限制字段
3. **分页查询**: 使用 `skip()` 和 `limit()`
4. **聚合管道**: 复杂查询使用聚合

### 写入优化

1. **批量操作**: 使用 `insertMany()`
2. **索引影响**: 索引会降低写入速度
3. **写关注**: 根据需求设置写关注级别

---

## 备份和恢复

### 备份策略

1. **定期备份**: 每日自动备份
2. **增量备份**: 使用 MongoDB Oplog
3. **备份验证**: 定期验证备份完整性

### 恢复流程

1. 停止应用
2. 恢复备份文件
3. 验证数据完整性
4. 重启应用

---

**文档维护**: 数据模型变更时同步更新此文档

