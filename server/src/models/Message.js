/**
 * GraphTutor V3.0 - 消息模型
 * 
 * 作用：存储用户之间的私信消息
 * 关联文件：
 *   - services/messageService.js (消息服务)
 *   - routes/v3/messages.js (消息API路由)
 * 技术栈：
 *   - Mongoose ODM
 *   - MongoDB
 */

import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    // 发送者ID
    senderId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },

    // 接收者ID
    receiverId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },

    // 消息内容
    content: {
      type: String,
      required: true,
      maxlength: 5000, // 最大5000字符
    },

    // 消息类型
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },

    // 关联文件（图片、文件等）
    attachments: {
      type: [
        {
          url: String,
          name: String,
          type: String, // image, file
          size: Number,
        },
      ],
      default: [],
    },

    // 是否已读
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 已读时间
    readAt: {
      type: Date,
      default: null,
    },

    // 是否已删除（发送者删除）
    isDeletedBySender: {
      type: Boolean,
      default: false,
    },

    // 是否已删除（接收者删除）
    isDeletedByReceiver: {
      type: Boolean,
      default: false,
    },

    // 是否已撤回
    isRecalled: {
      type: Boolean,
      default: false,
    },

    // 撤回时间
    recalledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引：用于查询两个用户之间的消息
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, receiverId: 1, isDeletedBySender: 1, isDeletedByReceiver: 1 });

// 静态方法：获取两个用户之间的消息
MessageSchema.statics.getConversation = async function (userId1, userId2, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
  const before = options.before || null;
  
  const query = {
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 },
    ],
    isRecalled: false, // 不显示已撤回的消息
    // 不显示被删除的消息
    $and: [
      {
        $or: [
          { senderId: userId1, isDeletedBySender: false },
          { senderId: userId2, isDeletedBySender: false },
        ],
      },
      {
        $or: [
          { receiverId: userId1, isDeletedByReceiver: false },
          { receiverId: userId2, isDeletedByReceiver: false },
        ],
      },
    ],
  };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// 静态方法：获取用户的会话列表
MessageSchema.statics.getConversations = async function (userId) {
  // 获取用户参与的所有会话（作为发送者或接收者）
  const conversations = await this.aggregate([
    {
      $match: {
        $or: [{ senderId: userId }, { receiverId: userId }],
        $and: [
          {
            $or: [
              { senderId: userId, isDeletedBySender: false },
              { receiverId: userId, isDeletedBySender: false },
            ],
          },
          {
            $or: [
              { receiverId: userId, isDeletedByReceiver: false },
              { senderId: userId, isDeletedByReceiver: false },
            ],
          },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$senderId', userId] },
            '$receiverId',
            '$senderId',
          ],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', userId] },
                  { $eq: ['$isRead', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 },
    },
  ]);

  return conversations;
};

const Message = mongoose.model('Message', MessageSchema);

export default Message;

