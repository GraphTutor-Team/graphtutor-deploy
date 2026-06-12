/**
 * OAuth state 暂存（绑定已有账号 vs 直接登录）
 */

import { getRedisClient } from "../utils/redis.js";

const STATE_PREFIX = "oauth:state:";
const STATE_TTL_SECONDS = 600;

const memoryStates = new Map();

export async function saveOAuthState(state, payload) {
  const key = STATE_PREFIX + state;
  const value = JSON.stringify(payload);
  const redis = getRedisClient();

  if (redis) {
    await redis.setEx(key, STATE_TTL_SECONDS, value);
    return;
  }
  memoryStates.set(key, value);
  setTimeout(() => memoryStates.delete(key), STATE_TTL_SECONDS * 1000);
}

export async function consumeOAuthState(state) {
  if (!state || typeof state !== "string") return null;
  const key = STATE_PREFIX + state;
  const redis = getRedisClient();

  let raw;
  if (redis) {
    raw = await redis.get(key);
    if (raw) await redis.del(key);
  } else {
    raw = memoryStates.get(key);
    if (raw) memoryStates.delete(key);
  }

  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
