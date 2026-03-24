/**
 * GraphTutor V3.0 - 好友请求模型
 * 
 * 作用：管理用户之间的好友请求
 * 关联文件：
 *   - routes/v3/friends.js (好友API路由)
 *   - services/friendService.js (好友业务逻辑)
 * 技术栈：
 *   - Mongoose ODM
 *   - MongoDB
 */

import mongoose from 'mongoose';

const FriendRequestSchema = new mongoose.Schema(
  {
    // 发送者ID
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    // 接收者ID
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    // 请求状态：pending（待处理）、accepted（已接受）、rejected（已拒绝）、cancelled（已取消）
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    // 请求消息（可选）
    message: {
      type: String,
      maxlength: 200,
    },
    // 响应时间
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

// 复合索引：确保同一对用户只能有一个待处理的请求
FriendRequestSchema.index(
  { fromUserId: 1, toUserId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

// 防止自己添加自己为好友
FriendRequestSchema.pre('save', function(next) {
  if (this.fromUserId.toString() === this.toUserId.toString()) {
    return next(new Error('不能添加自己为好友'));
  }
  next();
});

// 实例方法：接受请求
FriendRequestSchema.methods.accept = async function() {
  this.status = 'accepted';
  this.respondedAt = new Date();
  return this.save();
};

// 实例方法：拒绝请求
FriendRequestSchema.methods.reject = async function() {
  this.status = 'rejected';
  this.respondedAt = new Date();
  return this.save();
};

// 实例方法：取消请求
FriendRequestSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  this.respondedAt = new Date();
  return this.save();
};

const FriendRequest = mongoose.model('FriendRequest', FriendRequestSchema);

export default FriendRequest;

