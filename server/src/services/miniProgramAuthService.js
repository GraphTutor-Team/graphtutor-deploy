/**
 * 微信小程序登录：wx.login code → jscode2session
 * @see https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
 */

/**
 * @param {string} appId
 * @param {string} appSecret
 * @param {string} code wx.login 返回的临时 code（一次性，5 分钟有效）
 * @returns {Promise<{ openid?: string, session_key?: string, unionid?: string, errcode?: number, errmsg?: string }>}
 */
export async function exchangeCodeForSession(appId, appSecret, code) {
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url.toString());
  return res.json();
}
