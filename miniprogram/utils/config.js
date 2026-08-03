/**
 * ========== 后端连接配置（接后端时只需改这里） ==========
 *
 * USE_VIRTUAL_LOGIN：
 *   true  — 本地演示，不请求服务器（token 以 virtual- 开头）
 *   false — 连接 GraphTutor 后端 API
 *
 * BASE_URL：
 *   开发：可在微信开发者工具中关闭「不校验合法域名」后使用 http://IP:5000
 *   上线：须为 HTTPS 域名，并在微信公众平台配置 request 合法域名
 *
 * 生产示例（替换为你的 API 域名）：
 *   const BASE_URL = 'https://api.yourdomain.com';
 */
const USE_VIRTUAL_LOGIN = false;
const BASE_URL = 'http://106.55.99.208:5000';
/** Web 端地址（群组等能力引导） */
const WEB_URL = 'http://106.55.99.208:5000';

module.exports = {
  USE_VIRTUAL_LOGIN,
  BASE_URL,
  WEB_URL,
};
