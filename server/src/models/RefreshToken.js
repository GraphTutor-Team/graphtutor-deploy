/**
 * GraphTutor V3.0 - RefreshToken模型
 * 
 * 功能：存储用户的refresh token，用于刷新access token
 */

import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB自动删除过期文档
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: Date,
  },
  {
    timestamps: true,
  }
);

// 索引：按userId和revoked查询
RefreshTokenSchema.index({ userId: 1, revoked: 1 });

// 索引：按token查询（已存在unique索引）
// RefreshTokenSchema.index({ token: 1 });

// 静态方法：创建refresh token
RefreshTokenSchema.statics.createToken = async function (userId, deviceInfo = {}) {
  const crypto = await import('crypto');
  const tokenString = crypto.randomBytes(64).toString('hex');
  
  // Refresh token有效期：30天
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const refreshToken = await this.create({
    userId,
    token: tokenString,
    expiresAt,
    deviceInfo,
  });

  return refreshToken.token;
};

// 静态方法：验证refresh token
RefreshTokenSchema.statics.verifyToken = async function (tokenString) {
  const token = await this.findOne({
    token: tokenString,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).populate('userId');

  if (!token) {
    return null;
  }

  return token;
};

// 静态方法：撤销token
RefreshTokenSchema.statics.revokeToken = async function (tokenString) {
  return await this.findOneAndUpdate(
    { token: tokenString },
    {
      revoked: true,
      revokedAt: new Date(),
    },
    { new: true }
  );
};

// 静态方法：撤销用户的所有token
RefreshTokenSchema.statics.revokeUserTokens = async function (userId) {
  return await this.updateMany(
    { userId, revoked: false },
    {
      revoked: true,
      revokedAt: new Date(),
    }
  );
};

// 静态方法：清理过期token（可选，MongoDB会自动清理）
RefreshTokenSchema.statics.cleanExpiredTokens = async function () {
  return await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);

export default RefreshToken;

