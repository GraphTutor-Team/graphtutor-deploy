/**
 * GraphTutor V3.0 - 短信验证码服务
 *
 * 功能：验证码存储（Redis/内存）、发送节流、mock 模式下控制台输出
 */

import { getRedisClient } from "../utils/redis.js";
import {
  SMS_CODE_TTL_SECONDS,
  SMS_SEND_INTERVAL_SECONDS,
  SMS_PROVIDER,
} from "../config.js";
import { info as logInfo } from "../utils/logger.js";

const CODE_PREFIX = "sms:code:";
const SENDTIME_PREFIX = "sms:sendtime:";

/** 无 Redis 时使用的内存存储 */
const memoryCodes = new Map();
const memorySendTimes = new Map();

/**
 * 规范化手机号：仅保留数字
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/\D/g, "");
}

/**
 * 校验中国大陆手机号（11 位 1 开头）
 * @param {string} phone - 已规范化的手机号
 * @returns {boolean}
 */
export function isValidChinesePhone(phone) {
  return /^1\d{10}$/.test(phone);
}

/**
 * 生成 6 位数字验证码
 * @returns {string}
 */
export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 存储验证码（Redis 或内存）
 * @param {string} phone - 规范化后的手机号
 * @param {string} code
 * @returns {Promise<void>}
 */
export async function setStoredCode(phone, code) {
  const key = CODE_PREFIX + phone;
  const ttl = SMS_CODE_TTL_SECONDS;

  const redis = getRedisClient();
  if (redis) {
    await redis.setEx(key, ttl, code);
    return;
  }
  memoryCodes.set(key, code);
  setTimeout(() => memoryCodes.delete(key), ttl * 1000);
}

/**
 * 校验并消费验证码（取走后删除）
 * @param {string} phone - 规范化后的手机号
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function verifyAndConsumeCode(phone, code) {
  const key = CODE_PREFIX + phone;

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

/**
 * 检查是否在发送冷却期内
 * @param {string} phone - 规范化后的手机号
 * @returns {Promise<number>} 剩余冷却秒数，0 表示可发送
 */
export async function getSendCooldownSeconds(phone) {
  const key = SENDTIME_PREFIX + phone;

  const redis = getRedisClient();
  if (redis) {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }
  const last = memorySendTimes.get(key);
  if (!last) return 0;
  const elapsed = (Date.now() - last) / 1000;
  return elapsed >= SMS_SEND_INTERVAL_SECONDS ? 0 : Math.ceil(SMS_SEND_INTERVAL_SECONDS - elapsed);
}

/**
 * 记录本次发送时间（用于节流）
 * @param {string} phone
 * @returns {Promise<void>}
 */
export async function setSendTime(phone) {
  const key = SENDTIME_PREFIX + phone;
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
 * 发送验证码（mock 仅打日志，生产可接阿里云/腾讯云等）
 * @param {string} phone - 规范化后的手机号
 * @param {string} code
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function sendVerificationCode(phone, code) {
  if (SMS_PROVIDER === "mock") {
    logInfo(`[SMS Mock] 手机号 ${phone} 验证码: ${code}（${SMS_CODE_TTL_SECONDS} 秒内有效）`);
    return { success: true };
  }
  // 生产环境可在此接入阿里云、腾讯云等
  return { success: false, message: "短信服务未配置" };
}
