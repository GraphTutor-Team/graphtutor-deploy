import { describe, it, expect } from 'vitest';
import { validatePasswordFormat, checkPasswordRequirements, getPasswordRequirements } from '../passwordValidation';

describe('passwordValidation', () => {
  describe('validatePasswordFormat', () => {
    it('应该验证强密码', () => {
      const result = validatePasswordFormat('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('应该验证中等密码', () => {
      const result = validatePasswordFormat('Medium123');
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('medium');
    });

    it('应该拒绝弱密码', () => {
      const result = validatePasswordFormat('weak');
      expect(result.valid).toBe(false);
      expect(result.strength).toBe('weak');
    });

    it('应该拒绝过短密码', () => {
      const result = validatePasswordFormat('12345');
      expect(result.valid).toBe(false);
    });
  });

  describe('checkPasswordRequirements', () => {
    it('应该检查密码要求', () => {
      const result = checkPasswordRequirements('ValidPass123!');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝不符合要求的密码', () => {
      const result = checkPasswordRequirements('short');
      expect(result.valid).toBe(false);
    });
  });

  describe('getPasswordRequirements', () => {
    it('应该返回密码要求列表', () => {
      const requirements = getPasswordRequirements();
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
    });
  });
});

