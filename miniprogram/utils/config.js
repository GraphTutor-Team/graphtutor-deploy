/**
 * ========== 后端连接配置（接后端时只需改这里） ==========
 *
 * 【当前】USE_VIRTUAL_LOGIN = true：虚拟登录，不请求服务器。
 * 【接后端】改为 false，并设置 BASE_URL 为你的 GraphTutor 后端地址，
 *           例如：https://your-api.com 或 http://192.168.x.x:5000
 */
const USE_VIRTUAL_LOGIN = true;
const BASE_URL = 'http://localhost:5000';

module.exports = {
  USE_VIRTUAL_LOGIN,
  BASE_URL,
};
