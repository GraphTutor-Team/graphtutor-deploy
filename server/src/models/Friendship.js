/**
 * GraphTutor V3.0 - 好友关系模型
 * 
 * 作用：管理用户之间的好友关系
 * 关联文件：
 *   - routes/v3/friends.js (好友API路由)
 *   - services/friendService.js (好友业务逻辑)
 * 技术栈：
 *   - Mongoose ODM
 *   - MongoDB
 */

import mongoose from 'mongoose';

const FriendshipSchema = new mongoose.Schema(
  {
    // 用户1 ID（较小的ID，用于确保唯一性）
    user1Id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    // 用户2 ID（较大的ID）
    user2Id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    // 关系状态：active（活跃）、blocked（已屏蔽）
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
      index: true,
    },
    // 最后互动时间
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
    // 屏蔽者ID（如果被屏蔽）
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

// 复合唯一索引：确保同一对用户只有一条好友记录
FriendshipSchema.index(
  { user1Id: 1, user2Id: 1 },
  { unique: true }
);

// 预保存钩子：确保 user1Id < user2Id（用于唯一性约束）
FriendshipSchema.pre('save', function(next) {
  if (this.user1Id.toString() === this.user2Id.toString()) {
    return next(new Error('不能添加自己为好友'));
  }
  
  // 确保 user1Id < user2Id
  if (this.user1Id.toString() > this.user2Id.toString()) {
    [this.user1Id, this.user2Id] = [this.user2Id, this.user1Id];
  }
  
  next();
});

// 静态方法：查找两个用户之间的好友关系
FriendshipSchema.statics.findFriendship = async function(userId1, userId2) {
  // 确保顺序一致
  const id1 = userId1.toString() < userId2.toString() ? userId1 : userId2;
  const id2 = userId1.toString() < userId2.toString() ? userId2 : userId1;
  
  return this.findOne({
    user1Id: id1,
    user2Id: id2,
    status: 'active',
  });
};

// 静态方法：创建好友关系
FriendshipSchema.statics.createFriendship = async function(userId1, userId2) {
  // 确保顺序一致
  const id1 = userId1.toString() < userId2.toString() ? userId1 : userId2;
  const id2 = userId1.toString() < userId2.toString() ? userId2 : userId1;
  
  return this.create({
    user1Id: id1,
    user2Id: id2,
    status: 'active',
    lastInteractionAt: new Date(),
  });
};

// 实例方法：屏蔽好友
FriendshipSchema.methods.block = async function(blockedByUserId) {
  this.status = 'blocked';
  this.blockedBy = blockedByUserId;
  this.lastInteractionAt = new Date();
  return this.save();
};

// 实例方法：解除屏蔽
FriendshipSchema.methods.unblock = async function() {
  this.status = 'active';
  this.blockedBy = undefined;
  this.lastInteractionAt = new Date();
  return this.save();
};

// 实例方法：更新互动时间
FriendshipSchema.methods.updateInteraction = async function() {
  this.lastInteractionAt = new Date();
  return this.save();
};

const Friendship = mongoose.model('Friendship', FriendshipSchema);

export default Friendship;

