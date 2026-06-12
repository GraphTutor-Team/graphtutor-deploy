/**
 * 密码格式校验（注册 / 重置 / 修改密码共用）
 */

export function validateNewPassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "密码不能为空" };
  }
  if (password.length < 6) {
    return { valid: false, message: "密码至少需要 6 位" };
  }
  if (password.length > 50) {
    return { valid: false, message: "密码不能超过 50 位" };
  }
  if (/\s/.test(password)) {
    return { valid: false, message: "密码不能包含空格" };
  }
  return { valid: true };
}
