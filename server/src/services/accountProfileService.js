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

/** 是否已设置登录密码（OAuth / 短信快捷注册可能为空） */
export function userHasPassword(user) {
  return !!(user?.passwordHash || user?.password);
}

/** 无密码账号的登录方式提示（用于「设置密码」引导） */
export function getPasswordlessLoginHint(user) {
  if (!user) return "第三方登录";
  const methods = [];
  if (user.githubId) methods.push("GitHub");
  if (user.wechatOpenId) methods.push("微信");
  if (user.wechatMpOpenId) methods.push("微信小程序");
  if (user.phone) methods.push("手机号");
  return methods.length ? methods.join("、") : "第三方登录";
}

/**
 * Web 端 GitHub/微信扫码登录后，邮箱仍为占位地址 → 建议绑定已有邮箱账号
 * （小程序走 needsProfileCompletion，不在此列）
 */
export function needsWebAccountLink(user) {
  if (!user || needsProfileCompletion(user)) return false;
  if (!isOAuthPlaceholderEmail(user.email)) return false;
  return !!(user.githubId || user.wechatOpenId);
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || null;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

/** 各登录方式绑定状态（个人中心展示） */
export function getAccountLinks(user) {
  if (!user) {
    return {
      email: { linked: false, display: null, isPlaceholder: true },
      github: { linked: false },
      wechat: { linked: false },
      wechatMp: { linked: false },
      phone: { linked: false, masked: null },
    };
  }

  const emailIsPlaceholder = isOAuthPlaceholderEmail(user.email);

  return {
    email: {
      linked: !emailIsPlaceholder,
      display: emailIsPlaceholder ? null : user.email,
      isPlaceholder: emailIsPlaceholder,
    },
    github: { linked: !!user.githubId },
    wechat: { linked: !!user.wechatOpenId },
    wechatMp: { linked: !!user.wechatMpOpenId },
    phone: {
      linked: !!user.phone,
      masked: maskPhone(user.phone),
    },
  };
}

export function getAccountSyncStatus(user) {
  return {
    needsWebAccountLink: needsWebAccountLink(user),
    needsProfileCompletion: needsProfileCompletion(user),
    accountLinks: getAccountLinks(user),
  };
}

export async function bindGitHubToUser(userId, { githubId, name, avatarUrl }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("用户不存在");
    err.statusCode = 404;
    throw err;
  }

  const conflict = await User.findOne({
    githubId,
    _id: { $ne: userId },
  }).lean();
  if (conflict) {
    const err = new Error("该 GitHub 账号已绑定其他 GraphTutor 账号");
    err.statusCode = 409;
    throw err;
  }

  if (user.githubId && user.githubId !== githubId) {
    const err = new Error("当前账号已绑定其他 GitHub，请先解绑或联系管理员");
    err.statusCode = 409;
    throw err;
  }

  user.githubId = githubId;
  if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
  if (name && !user.name) user.name = name;
  await user.save();
  return user.toObject ? user.toObject() : user;
}

export async function bindWechatOpenIdToUser(
  userId,
  { wechatOpenId, wechatUnionId, name, avatarUrl }
) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("用户不存在");
    err.statusCode = 404;
    throw err;
  }

  const conflict = await User.findOne({
    wechatOpenId,
    _id: { $ne: userId },
  }).lean();
  if (conflict) {
    const err = new Error("该微信已绑定其他 GraphTutor 账号");
    err.statusCode = 409;
    throw err;
  }

  if (user.wechatOpenId && user.wechatOpenId !== wechatOpenId) {
    const err = new Error("当前账号已绑定其他微信，请先解绑或联系管理员");
    err.statusCode = 409;
    throw err;
  }

  user.wechatOpenId = wechatOpenId;
  if (wechatUnionId) user.wechatUnionId = wechatUnionId;
  if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
  if (name && !user.name) user.name = name;
  await user.save();
  return user.toObject ? user.toObject() : user;
}

/**
 * 将 GitHub/微信 Web OAuth 临时账号合并到已有邮箱账号（验证目标账号密码）
 */
export async function mergeOAuthUserIntoExistingAccount(oauthUser, targetUser, password) {
  const hash = targetUser.passwordHash || targetUser.password;
  if (!hash) {
    const err = new Error("目标账号未设置密码，请先在 Web 端设置密码后再绑定");
    err.statusCode = 400;
    throw err;
  }

  const ok = await bcrypt.compare(password, hash);
  if (!ok) {
    const err = new Error("邮箱或密码错误");
    err.statusCode = 400;
    throw err;
  }

  if (targetUser._id.toString() === oauthUser._id.toString()) {
    const err = new Error("不能绑定当前账号自身");
    err.statusCode = 400;
    throw err;
  }

  const updates = {};

  if (oauthUser.githubId) {
    if (
      targetUser.githubId &&
      targetUser.githubId !== oauthUser.githubId
    ) {
      const err = new Error("目标账号已绑定其他 GitHub");
      err.statusCode = 409;
      throw err;
    }
    const ghConflict = await User.findOne({
      githubId: oauthUser.githubId,
      _id: { $ne: targetUser._id },
    }).lean();
    if (ghConflict) {
      const err = new Error("该 GitHub 已绑定其他账号");
      err.statusCode = 409;
      throw err;
    }
    if (!targetUser.githubId) updates.githubId = oauthUser.githubId;
  }

  if (oauthUser.wechatOpenId) {
    if (
      targetUser.wechatOpenId &&
      targetUser.wechatOpenId !== oauthUser.wechatOpenId
    ) {
      const err = new Error("目标账号已绑定其他微信");
      err.statusCode = 409;
      throw err;
    }
    const wxConflict = await User.findOne({
      wechatOpenId: oauthUser.wechatOpenId,
      _id: { $ne: targetUser._id },
    }).lean();
    if (wxConflict) {
      const err = new Error("该微信已绑定其他账号");
      err.statusCode = 409;
      throw err;
    }
    if (!targetUser.wechatOpenId) updates.wechatOpenId = oauthUser.wechatOpenId;
  }

  const unionId = oauthUser.wechatUnionId || targetUser.wechatUnionId;
  if (unionId && !targetUser.wechatUnionId) {
    updates.wechatUnionId = unionId;
  }

  if (oauthUser.phone && !targetUser.phone) {
    const phoneConflict = await User.findOne({
      phone: oauthUser.phone,
      _id: { $ne: targetUser._id },
    }).lean();
    if (phoneConflict) {
      const err = new Error("目标账号手机号与待合并账号冲突");
      err.statusCode = 409;
      throw err;
    }
    updates.phone = oauthUser.phone;
  }

  if (!targetUser.avatarUrl && oauthUser.avatarUrl) {
    updates.avatarUrl = oauthUser.avatarUrl;
  }
  if (!targetUser.name && oauthUser.name) {
    updates.name = oauthUser.name;
  }

  if (Object.keys(updates).length > 0) {
    await User.updateOne({ _id: targetUser._id }, { $set: updates });
  }

  await User.deleteOne({ _id: oauthUser._id });
  await revokeUserRefreshTokens(oauthUser._id.toString());

  return User.findById(targetUser._id).lean();
}

export function toPublicAuthUser(user) {
  if (!user) return null;
  const sync = getAccountSyncStatus(user);
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
    hasPassword: userHasPassword(user),
    passwordlessLoginHint: userHasPassword(user)
      ? undefined
      : getPasswordlessLoginHint(user),
    needsWebAccountLink: sync.needsWebAccountLink,
    accountLinks: sync.accountLinks,
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
