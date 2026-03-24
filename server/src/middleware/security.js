/**
 * GraphTutor V3.0 - 安全中间件
 * 
 * 功能：添加安全相关的HTTP头，防止常见攻击
 */

/**
 * 安全头中间件
 * 添加安全相关的HTTP头，防止常见攻击
 */
export function securityHeaders(req, res, next) {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS保护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // 推荐使用HTTPS（仅生产环境）
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // 移除X-Powered-By头（隐藏服务器信息）
  res.removeHeader('X-Powered-By');
  
  // 内容安全策略（CSP）- 宽松配置，允许内联脚本和样式
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
    );
  }
  
  next();
}

