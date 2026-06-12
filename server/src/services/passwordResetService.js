/**
 * 邮箱找回密码：验证码存储与发送（开发/mock 模式输出到日志）
 */

import { getRedisClient } from "../utils/redis.js";
import {
  SMS_CODE_TTL_SECONDS,
  SMS_SEND_INTERVAL_SECONDS,
} from "../config.js";
import { info as logInfo } from "../utils/logger.js";
import { generateCode } from "./smsService.js";

const CODE_PREFIX = "pwdreset:code:";
const SENDTIME_PREFIX = "pwdreset:sendtime:";

const memoryCodes = new Map();
const memorySendTimes = new Map();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function setPasswordResetCode(email, code) {
  const key = CODE_PREFIX + normalizeEmail(email);
  const ttl = SMS_CODE_TTL_SECONDS;
  const redis = getRedisClient();

  if (redis) {
    await redis.setEx(key, ttl, code);
    return;
  }
  memoryCodes.set(key, code);
  setTimeout(() => memoryCodes.delete(key), ttl * 1000);
}

export async function verifyAndConsumePasswordResetCode(email, code) {
  const key = CODE_PREFIX + normalizeEmail(email);
  const redis = getRedisClient();

  if (redis) {
    const stored = await redis.get(key);
    if (stored !== code) return false;
    await redis.del(key);
    return true;
  }
  const stored = memoryCodes.get(key);
  if (stored !== code) return false;
  memoryCodes.delete(key);
  return true;
}

export async function getPasswordResetCooldownSeconds(email) {
  const key = SENDTIME_PREFIX + normalizeEmail(email);
  const redis = getRedisClient();

  if (redis) {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }
  const last = memorySendTimes.get(key);
  if (!last) return 0;
  const elapsed = (Date.now() - last) / 1000;
  return elapsed >= SMS_SEND_INTERVAL_SECONDS
    ? 0
    : Math.ceil(SMS_SEND_INTERVAL_SECONDS - elapsed);
}

export async function setPasswordResetSendTime(email) {
  const key = SENDTIME_PREFIX + normalizeEmail(email);
  const ttl = SMS_SEND_INTERVAL_SECONDS;
  const redis = getRedisClient();

  if (redis) {
    await redis.setEx(key, ttl, String(Date.now()));
    return;
  }
  memorySendTimes.set(key, Date.now());
  setTimeout(() => memorySendTimes.delete(key), ttl * 1000);
}

/**
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function sendPasswordResetCode(email, code) {
  const normalized = normalizeEmail(email);
  logInfo(
    `[Password Reset Mock] 邮箱 ${normalized} 验证码: ${code}（${SMS_CODE_TTL_SECONDS} 秒内有效，请查看服务器日志）`
  );
  return { success: true };
}
