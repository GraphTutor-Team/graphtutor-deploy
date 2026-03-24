// 密码验证工具函数

/**
 * 验证密码格式
 * @param {string} password - 待验证的密码
 * @returns {{valid: boolean, message: string, strength: string|null}}
 */
export function validatePasswordFormat(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: "密码不能为空", strength: null };
  }

  // 最小长度：6位
  if (password.length < 6) {
    return { valid: false, message: "密码至少需要 6 位", strength: null };
  }

  // 最大长度：50位（防止过长）
  if (password.length > 50) {
    return { valid: false, message: "密码不能超过 50 位", strength: null };
  }

  // 检查是否包含空格
  if (/\s/.test(password)) {
    return { valid: false, message: "密码不能包含空格", strength: null };
  }

  // 密码强度评估
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);

  // 计算强度
  let strength = "weak";
  let message = "密码强度：弱";

  if (password.length >= 8) {
    if (hasNumber && hasLetter && hasSpecial && (hasUpper || hasLower)) {
      strength = "strong";
      message = "密码强度：强 ✓";
    } else if ((hasNumber && hasLetter) || (hasLetter && hasSpecial) || (hasNumber && hasSpecial)) {
      strength = "medium";
      message = "密码强度：中";
    } else {
      message = "密码强度：弱（建议包含字母、数字和特殊字符）";
    }
  } else {
    message = "密码强度：弱（建议至少 8 位）";
  }

  return { valid: true, message, strength };
}

/**
 * 获取密码格式要求说明
 * @returns {string[]} 格式要求列表
 */
export function getPasswordRequirements() {
  return [
    "至少 6 位字符（建议 8 位以上）",
    "不能包含空格",
    "建议包含字母和数字",
    "建议包含大小写字母",
    "建议包含特殊字符（!@#$%^&*等）",
  ];
}

/**
 * 检查密码是否符合所有要求（用于提交前的最终验证）
 * @param {string} password - 待验证的密码
 * @returns {{valid: boolean, message: string}}
 */
export function checkPasswordRequirements(password) {
  if (!password || password.length < 6) {
    return { valid: false, message: "密码至少需要 6 位" };
  }

  if (password.length > 50) {
    return { valid: false, message: "密码不能超过 50 位" };
  }

  if (/\s/.test(password)) {
    return { valid: false, message: "密码不能包含空格" };
  }

  return { valid: true, message: "" };
}

