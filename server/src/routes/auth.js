
// 登录 / 注册接口 + 个人资料查询 / 更新

import express from "express";
import crypto from "crypto";
// Swagger文档注释
import './auth.swagger.js';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import config from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { getLearningAvatar } from "../services/learningAvatarService.js";
import { validateEmail, sanitizeString } from "../middleware/validation.js";
import { generateTokenPair, extractDeviceInfo, revokeRefreshToken, revokeUserRefreshTokens } from "../services/tokenService.js";
import {
  normalizePhone,
  isValidChinesePhone,
  generateCode,
  setStoredCode,
  verifyAndConsumeCode,
  getSendCooldownSeconds,
  setSendTime,
  sendVerificationCode,
} from "../services/smsService.js";

const router = express.Router();
const { JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, FRONTEND_URL, WECHAT_APP_ID, WECHAT_APP_SECRET } = config;

// 注册：统一写入 passwordHash 字段
router.post("/register", async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword, name: rawName } = req.body;

    // 验证邮箱格式
    if (!rawEmail || !validateEmail(rawEmail)) {
      return res.status(400).json({
        success: false,
        message: "邮箱格式无效",
      });
    }

    // 验证密码格式
    if (!rawPassword || typeof rawPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: "密码不能为空",
      });
    }

    if (rawPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "密码至少需要 6 位",
      });
    }

    if (rawPassword.length > 50) {
      return res.status(400).json({
        success: false,
        message: "密码不能超过 50 位",
      });
    }

    // 检查是否包含空格
    if (/\s/.test(rawPassword)) {
      return res.status(400).json({
        success: false,
        message: "密码不能包含空格",
      });
    }

    // 清理输入
    const email = sanitizeString(rawEmail, { maxLength: 254, trim: true });
    const password = rawPassword; // 密码不清理，直接用于哈希
    const name = sanitizeString(rawName, { maxLength: 100, allowEmpty: true });

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "该邮箱已被注册",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      name,
      role: "student", // V3.0: 默认角色改为 student
    });

    // 使用新的token服务生成token对
    const deviceInfo = extractDeviceInfo(req);
    const { accessToken, refreshToken } = await generateTokenPair(user, deviceInfo);

    return res.json({
      success: true,
      token: accessToken, // 保持向后兼容
      accessToken, // 新的字段名
      refreshToken, // refresh token
      user: {
        id:       user._id,
        email:    user.email,
        name:     user.name,
        role:     user.role,
        avatarUrl: user.avatarUrl,
        school:   user.school,
        major:    user.major,
        grade:    user.grade,
        studentId: user.studentId,
        bio:      user.bio,
      },
    });
  } catch (e) {
    console.error("register error:", e);
    return res.status(500).json({
      success: false,
      message: "注册失败，请稍后重试",
    });
  }
});

// 登录：兼容 passwordHash / password 两种字段
router.post("/login", async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword } = req.body;

    // 验证邮箱格式
    if (!rawEmail || !validateEmail(rawEmail)) {
      return res.status(400).json({
        success: false,
        message: "邮箱格式无效",
      });
    }

    if (!rawPassword || typeof rawPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: "密码必填",
      });
    }

    const email = sanitizeString(rawEmail, { maxLength: 254, trim: true });
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "邮箱格式无效",
      });
    }

    const password = rawPassword;

    // 数据库查询
    let user;
    try {
      user = await User.findOne({ email }).lean();
    } catch (dbErr) {
      console.error("数据库查询失败:", dbErr.message);
      return res.status(500).json({
        success: false,
        message: "数据库连接失败，请稍后重试",
      });
    }

    if (!user) {
      return res.json({
        success: false,
        message: "邮箱或密码错误",
      });
    }

    const hash = user.passwordHash || user.password;
    if (!hash) {
      console.warn("User has no password field:", user._id, user.email);
      return res.json({
        success: false,
        message: "邮箱或密码错误",
      });
    }

    // 密码验证
    let ok;
    try {
      ok = await bcrypt.compare(password, hash);
    } catch (bcryptErr) {
      console.error("密码验证失败:", bcryptErr.message);
      return res.status(500).json({
        success: false,
        message: "登录失败，请稍后重试",
      });
    }

    if (!ok) {
      return res.json({
        success: false,
        message: "邮箱或密码错误",
      });
    }

    // 使用新的token服务生成token对
    let accessToken, refreshToken;
    try {
      const deviceInfo = extractDeviceInfo(req);
      const tokenPair = await generateTokenPair(user, deviceInfo);
      accessToken = tokenPair.accessToken;
      refreshToken = tokenPair.refreshToken;
    } catch (tokenErr) {
      console.error("生成token失败:", tokenErr.message);
      return res.status(500).json({
        success: false,
        message: "登录失败，请稍后重试",
      });
    }

    return res.json({
      success: true,
      token: accessToken, // 保持向后兼容
      accessToken, // 新的字段名
      refreshToken, // refresh token
      user: {
        id:       user._id,
        email:    user.email,
        name:     user.name,
        role:     user.role || "user",
        avatarUrl: user.avatarUrl,
        school:   user.school,
        major:    user.major,
        grade:    user.grade,
        studentId: user.studentId,
        bio:      user.bio,
      },
    });
  } catch (e) {
    console.error("login error:", e);
    console.error("错误类型:", e.name);
    console.error("错误消息:", e.message);
    console.error("错误堆栈:", e.stack);
    
    // 检查是否是数据库连接错误
    if (e.name === 'MongoServerError' || e.message?.includes('MongoDB') || e.message?.includes('connection')) {
      return res.status(500).json({
        success: false,
        message: "数据库连接失败，请稍后重试",
        ...(process.env.NODE_ENV === 'development' && { error: e.message }),
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "登录失败，请稍后重试",
      ...(process.env.NODE_ENV === 'development' && { 
        error: e.message,
        name: e.name,
        stack: e.stack 
      }),
    });
  }
});

// ✅ 获取当前登录用户完整信息（含扩展字段）
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    const learningAvatar = await getLearningAvatar(user._id);
    return res.json({
      success: true,
      user: {
        id:       user._id,
        email:    user.email,
        name:     user.name,
        role:     user.role || "user",
        avatarUrl: user.avatarUrl,
        school:   user.school,
        major:    user.major,
        grade:    user.grade,
        studentId: user.studentId,
        bio:      user.bio,
        friendSettings: user.friendSettings || {
          allowFriendRequests: true,
          showLearningData: true,
          showAchievements: true,
          showProfile: true,
        },
        points: user.points ?? 100,
        school: user.school,
        grade: user.grade,
        advancementTarget: user.advancementTarget ?? '',
        createdAt: user.createdAt,
        learningRole: user.learningRole ?? '学者',
        learningLevel: user.learningLevel ?? 1,
        learningExp: user.learningExp ?? 0,
        learningAvatar: learningAvatar || undefined,
      },
    });
  } catch (e) {
    console.error("auth/me error:", e);
    return res.status(500).json({
      success: false,
      message: "获取用户信息失败",
    });
  }
});

// ✅ 更新当前登录用户的个人资料（不允许改 email / role / 密码）
router.put("/me", requireAuth, async (req, res) => {
  try {
    const allowed = [
      "name",
      "avatarUrl",
      "school",
      "major",
      "grade",
      "studentId",
      "bio",
      "advancementTarget",
      "friendSettings",
      "learningRole",
    ];

    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === 'friendSettings' && typeof req.body[key] === 'object') {
          // 验证friendSettings结构
          const friendSettings = req.body[key];
          const validSettings = {};
          if (typeof friendSettings.allowFriendRequests === 'boolean') {
            validSettings.allowFriendRequests = friendSettings.allowFriendRequests;
          }
          if (typeof friendSettings.showLearningData === 'boolean') {
            validSettings.showLearningData = friendSettings.showLearningData;
          }
          if (typeof friendSettings.showAchievements === 'boolean') {
            validSettings.showAchievements = friendSettings.showAchievements;
          }
          if (typeof friendSettings.showProfile === 'boolean') {
            validSettings.showProfile = friendSettings.showProfile;
          }
          updates['friendSettings'] = validSettings;
        } else if (key === 'learningRole') {
          const role = req.body[key];
          if (['学者', '探险家', '书虫', '奋斗者'].includes(role)) {
            updates[key] = role;
          }
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, lean: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    const learningAvatar = await getLearningAvatar(user._id);
    return res.json({
      success: true,
      user: {
        id:       user._id,
        email:    user.email,
        name:     user.name,
        role:     user.role || "user",
        avatarUrl: user.avatarUrl,
        school:   user.school,
        major:    user.major,
        grade:    user.grade,
        studentId: user.studentId,
        bio:      user.bio,
        advancementTarget: user.advancementTarget ?? '',
        createdAt: user.createdAt,
        learningRole: user.learningRole ?? '学者',
        learningLevel: user.learningLevel ?? 1,
        learningExp: user.learningExp ?? 0,
        learningAvatar: learningAvatar || undefined,
      },
    });
  } catch (e) {
    console.error("auth/me update error:", e);
    return res.status(500).json({
      success: false,
      message: "更新用户信息失败",
    });
  }
});

// ✅ 修改密码接口
router.put("/me/password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 验证必填字段
    if (!oldPassword || typeof oldPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: "请输入当前密码",
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: "请输入新密码",
      });
    }

    // 验证新密码格式
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "新密码至少需要 6 位",
      });
    }

    if (newPassword.length > 50) {
      return res.status(400).json({
        success: false,
        message: "新密码不能超过 50 位",
      });
    }

    // 检查是否包含空格
    if (/\s/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "新密码不能包含空格",
      });
    }

    // 验证新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "新密码不能与当前密码相同",
      });
    }

    // 获取用户信息（包含密码哈希）
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 验证旧密码
    const hash = user.passwordHash || user.password;
    if (!hash) {
      return res.status(500).json({
        success: false,
        message: "账户密码数据异常，请联系管理员",
      });
    }

    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, hash);
    if (!isOldPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "当前密码错误",
      });
    }

    // 生成新密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    user.passwordHash = newPasswordHash;
    await user.save();

    // 修改密码后，撤销所有refresh token，强制重新登录
    await revokeUserRefreshTokens(user._id.toString());

    return res.json({
      success: true,
      message: "密码修改成功，请重新登录",
    });
  } catch (e) {
    console.error("auth/me/password update error:", e);
    return res.status(500).json({
      success: false,
      message: "修改密码失败，请稍后重试",
    });
  }
});

// ✅ 刷新token接口
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: "refreshToken必填",
      });
    }

    const { refreshTokens } = await import("../services/tokenService.js");
    const result = await refreshTokens(refreshToken);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "refreshToken无效或已过期",
      });
    }

    return res.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (e) {
    console.error("auth/refresh error:", e);
    return res.status(500).json({
      success: false,
      message: "刷新token失败，请稍后重试",
    });
  }
});

// ✅ 登出接口（撤销refresh token）
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    return res.json({
      success: true,
      message: "登出成功",
    });
  } catch (e) {
    console.error("auth/logout error:", e);
    return res.status(500).json({
      success: false,
      message: "登出失败，请稍后重试",
    });
  }
});

// ——— 手机号短信验证码登录 ———
// 发送验证码
router.post("/sms/send", async (req, res) => {
  try {
    const rawPhone = req.body.phone;
    const phone = normalizePhone(rawPhone);
    if (!isValidChinesePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "请输入正确的中国大陆手机号（11 位）",
      });
    }

    const cooldown = await getSendCooldownSeconds(phone);
    if (cooldown > 0) {
      return res.status(429).json({
        success: false,
        message: `请 ${cooldown} 秒后再获取验证码`,
        cooldown,
      });
    }

    const code = generateCode();
    await setStoredCode(phone, code);
    await setSendTime(phone);

    const sendResult = await sendVerificationCode(phone, code);
    if (!sendResult.success) {
      return res.status(503).json({
        success: false,
        message: sendResult.message || "发送失败",
      });
    }

    return res.json({
      success: true,
      message: "验证码已发送",
    });
  } catch (e) {
    console.error("auth/sms/send error:", e);
    return res.status(500).json({
      success: false,
      message: "发送失败，请稍后重试",
    });
  }
});

// 验证码登录/注册
router.post("/sms/login", async (req, res) => {
  try {
    const rawPhone = req.body.phone;
    const code = req.body.code;
    const phone = normalizePhone(rawPhone);

    if (!isValidChinesePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "请输入正确的中国大陆手机号",
      });
    }
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: "请输入 6 位数字验证码",
      });
    }

    const ok = await verifyAndConsumeCode(phone, code);
    if (!ok) {
      return res.json({
        success: false,
        message: "验证码错误或已过期",
      });
    }

    const emailPlaceholder = `phone_${phone}@oauth.local`;
    let user = await User.findOne({ phone }).lean();
    if (!user) {
      const existingByEmail = await User.findOne({ email: emailPlaceholder }).lean();
      if (existingByEmail) {
        await User.updateOne({ _id: existingByEmail._id }, { $set: { phone } });
        user = await User.findById(existingByEmail._id).lean();
      } else {
        const newUser = await User.create({
          email: emailPlaceholder,
          passwordHash: null,
          phone,
          name: `用户${phone.slice(-4)}`,
          role: "student",
        });
        user = newUser.toObject ? newUser.toObject() : newUser;
      }
    }

    const deviceInfo = extractDeviceInfo(req);
    const { accessToken, refreshToken } = await generateTokenPair(user, deviceInfo);

    return res.json({
      success: true,
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
        avatarUrl: user.avatarUrl,
        school: user.school,
        major: user.major,
        grade: user.grade,
        studentId: user.studentId,
        bio: user.bio,
      },
    });
  } catch (e) {
    console.error("auth/sms/login error:", e);
    return res.status(500).json({
      success: false,
      message: "登录失败，请稍后重试",
    });
  }
});

// ——— GitHub OAuth ———
// 获取 GitHub 授权 URL，前端跳转用
router.get("/oauth/github/url", (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(503).json({
      success: false,
      message: "GitHub 登录未配置",
    });
  }
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/oauth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
  return res.json({ success: true, url, state });
});

// GitHub 回调：用 code 换 token + 用户信息，查/建用户后重定向到前端并带 token（方式1）
router.get("/oauth/github/callback", async (req, res) => {
  const { code, state } = req.query;
  const frontendBase = FRONTEND_URL.replace(/\/$/, "");
  const callbackPath = "/oauth/callback";

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.redirect(`${frontendBase}${callbackPath}?error=github_not_configured`);
  }
  if (!code || typeof code !== "string") {
    return res.redirect(`${frontendBase}${callbackPath}?error=missing_code`);
  }

  try {
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/oauth/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.warn("GitHub token exchange failed:", tokenData.error || tokenData);
      return res.redirect(`${frontendBase}${callbackPath}?error=token_exchange_failed`);
    }

    const ghToken = tokenData.access_token;
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${ghToken}` },
    });
    if (!userRes.ok) {
      return res.redirect(`${frontendBase}${callbackPath}?error=user_fetch_failed`);
    }
    const ghUser = await userRes.json();
    const githubId = String(ghUser.id);
    const name = ghUser.name || ghUser.login || `GitHub-${githubId}`;
    let email = ghUser.email || null;
    if (!email && ghUser.email !== undefined) email = ghUser.email;
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${ghToken}` },
      });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = emails.find((e) => e.primary);
        if (primary) email = primary.email;
        else if (emails[0]) email = emails[0].email;
      }
    }
    const avatarUrl = ghUser.avatar_url || undefined;
    const safeEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : `github_${githubId}@oauth.local`;

    let user = await User.findOne({ githubId }).lean();
    if (!user) {
      const existingByEmail = await User.findOne({ email: safeEmail }).lean();
      if (existingByEmail) {
        await User.updateOne(
          { _id: existingByEmail._id },
          { $set: { githubId } }
        );
        user = await User.findById(existingByEmail._id).lean();
      } else {
        const newUser = await User.create({
          email: safeEmail,
          passwordHash: null,
          githubId,
          name,
          avatarUrl: avatarUrl || undefined,
          role: "student",
        });
        user = newUser.toObject ? newUser.toObject() : newUser;
      }
    }

    const deviceInfo = extractDeviceInfo(req);
    const { accessToken, refreshToken } = await generateTokenPair(user, deviceInfo);
    const params = new URLSearchParams({
      accessToken,
      refreshToken,
    });
    return res.redirect(`${frontendBase}${callbackPath}?${params.toString()}`);
  } catch (e) {
    console.error("GitHub OAuth callback error:", e);
    return res.redirect(`${frontendBase}${callbackPath}?error=server_error`);
  }
});

// ——— 微信开放平台 网站应用扫码登录 ———
router.get("/oauth/wechat/url", (req, res) => {
  if (!WECHAT_APP_ID) {
    return res.status(503).json({
      success: false,
      message: "微信登录未配置",
    });
  }
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/oauth/wechat/callback`;
  const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${encodeURIComponent(WECHAT_APP_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
  return res.json({ success: true, url, state });
});

router.get("/oauth/wechat/callback", async (req, res) => {
  const { code, state } = req.query;
  const frontendBase = FRONTEND_URL.replace(/\/$/, "");
  const callbackPath = "/oauth/callback";

  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
    return res.redirect(`${frontendBase}${callbackPath}?error=wechat_not_configured`);
  }
  if (!code || typeof code !== "string") {
    return res.redirect(`${frontendBase}${callbackPath}?error=missing_code`);
  }

  try {
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.errcode || !tokenData.openid) {
      console.warn("WeChat token exchange failed:", tokenData.errmsg || tokenData);
      return res.redirect(`${frontendBase}${callbackPath}?error=token_exchange_failed`);
    }

    const { access_token: wxToken, openid, unionid } = tokenData;
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${encodeURIComponent(wxToken)}&openid=${encodeURIComponent(openid)}`;
    const userRes = await fetch(userInfoUrl);
    const wxUser = await userRes.json();

    if (wxUser.errcode) {
      console.warn("WeChat userinfo failed:", wxUser.errmsg);
      return res.redirect(`${frontendBase}${callbackPath}?error=user_fetch_failed`);
    }

    const wechatOpenId = openid;
    const wechatUnionId = unionid || undefined;
    const name = (wxUser.nickname || `微信用户${wechatOpenId.slice(-6)}`).trim();
    const avatarUrl = wxUser.headimgurl || undefined;
    const emailPlaceholder = `wechat_${wechatOpenId}@oauth.local`;

    let user = await User.findOne({ wechatOpenId }).lean();
    if (!user) {
      const existingByUnion = wechatUnionId ? await User.findOne({ wechatUnionId }).lean() : null;
      if (existingByUnion) {
        await User.updateOne(
          { _id: existingByUnion._id },
          { $set: { wechatOpenId, wechatUnionId: wechatUnionId || existingByUnion.wechatUnionId } }
        );
        user = await User.findById(existingByUnion._id).lean();
      } else {
        const newUser = await User.create({
          email: emailPlaceholder,
          passwordHash: null,
          wechatOpenId,
          wechatUnionId: wechatUnionId || undefined,
          name,
          avatarUrl,
          role: "student",
        });
        user = newUser.toObject ? newUser.toObject() : newUser;
      }
    }

    const deviceInfo = extractDeviceInfo(req);
    const { accessToken, refreshToken } = await generateTokenPair(user, deviceInfo);
    const params = new URLSearchParams({ accessToken, refreshToken });
    return res.redirect(`${frontendBase}${callbackPath}?${params.toString()}`);
  } catch (e) {
    console.error("WeChat OAuth callback error:", e);
    return res.redirect(`${frontendBase}${callbackPath}?error=server_error`);
  }
});

export default router;
