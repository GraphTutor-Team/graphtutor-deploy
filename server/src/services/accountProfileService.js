/**
 * 小程序微信临时账号：占位邮箱识别、完善资料、合并到已有 Web 账号
 */

import bcrypt from "bcrypt";
import User from "../models/User.js";
import { revokeUserRefreshTokens } from "./tokenService.js";

const OAUTH_LOCAL_SUFFIX = "@oauth.local";

/** 是否为 OAuth / 小程序自动生成的占位邮箱 */
export function isOAuthPlaceholderEmail(email) {
  if (!email || typeof email !== "string") return true;
  return email.endsWith(OAUTH_LOCAL_SUFFIX);
}

/**
 * 微信快捷登录后是否须完善/绑定真实账号
 * 条件：有小程序 openid，且邮箱仍为占位地址
 */
export function needsProfileCompletion(user) {
  if (!user) return false;
  if (!user.wechatMpOpenId) return false;
  return isOAuthPlaceholderEmail(user.email);
}

/** 登录 / me 接口统一附加的账号状态字段 */
export function getAccountStatus(user) {
  const pending = needsProfileCompletion(user);
  return {
    needsProfileCompletion: pending,
    accountType: pending ? "mp_pending" : "full",
  };
}

export function toPublicAuthUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role || "student",
    avatarUrl: user.avatarUrl,
    school: user.school,
    major: user.major,
    grade: user.grade,
    studentId: user.studentId,
    bio: user.bio,
    ...getAccountStatus(user),
  };
}

/**
 * 将微信临时用户合并到已存在的邮箱账号（验证密码后）
 * @returns {Promise<object>} 合并后的 user lean 文档
 */
export async function mergeMpUserIntoExistingAccount(tempUser, targetUser, password) {
  const hash = targetUser.passwordHash || targetUser.password;
  if (!hash) {
    const err = new Error("该账号未设置密码，请先在 Web 端设置密码或使用其他登录方式");
    err.statusCode = 400;
    throw err;
  }

  const ok = await bcrypt.compare(password, hash);
  if (!ok) {
    const err = new Error("邮箱或密码错误");
    err.statusCode = 400;
    throw err;
  }

  const mpOpenId = tempUser.wechatMpOpenId;
  if (!mpOpenId) {
    const err = new Error("当前登录不是微信临时账号，无法绑定");
    err.statusCode = 400;
    throw err;
  }

  if (
    targetUser.wechatMpOpenId &&
    targetUser.wechatMpOpenId !== mpOpenId
  ) {
    const err = new Error("该邮箱账号已绑定其他微信，请先解绑或联系管理员");
    err.statusCode = 409;
    throw err;
  }

  const unionId = tempUser.wechatUnionId || targetUser.wechatUnionId;

  await User.updateOne(
    { _id: targetUser._id },
    {
      $set: {
        wechatMpOpenId: mpOpenId,
        ...(unionId ? { wechatUnionId: unionId } : {}),
      },
    }
  );

  await User.deleteOne({ _id: tempUser._id });
  await revokeUserRefreshTokens(tempUser._id.toString());

  return User.findById(targetUser._id).lean();
}

/**
 * 为微信临时用户设置真实邮箱与密码（新注册完善）
 */
export async function completeMpUserRegistration(tempUser, { email, password, name, school, grade }) {
  if (!tempUser.wechatMpOpenId) {
    const err = new Error("当前账号无需完善，或请使用微信快捷登录后再操作");
    err.statusCode = 400;
    throw err;
  }

  if (!needsProfileCompletion(tempUser)) {
    const err = new Error("账号已完善，无需重复操作");
    err.statusCode = 400;
    throw err;
  }

  const exists = await User.findOne({ email, _id: { $ne: tempUser._id } }).lean();
  if (exists) {
    const err = new Error("该邮箱已被注册，请切换到「绑定已有账号」");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updates = {
    email,
    passwordHash,
    ...(name ? { name: name.trim() } : {}),
    ...(school ? { school: school.trim() } : {}),
    ...(grade ? { grade: grade.trim() } : {}),
  };

  await User.updateOne({ _id: tempUser._id }, { $set: updates });
  return User.findById(tempUser._id).lean();
}
