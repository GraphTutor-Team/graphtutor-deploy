/**
 * GraphTutor V3.0 - 表单验证工具测试
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateQuestionContent,
  validateQuestionOptions,
  validateAnswerIndex,
  validateSubjectCode,
  validateBankName,
  validateDifficulty,
  validateRequiredFields,
} from '../formValidation';

describe('formValidation', () => {
  describe('validateEmail', () => {
    it('应该验证有效邮箱', () => {
      expect(validateEmail('test@example.com')).toEqual({ valid: true, message: '' });
      expect(validateEmail('user.name@domain.co.uk')).toEqual({ valid: true, message: '' });
    });

    it('应该拒绝空邮箱', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('邮箱不能为空');
    });

    it('应该拒绝无效邮箱格式', () => {
      expect(validateEmail('invalid')).toEqual({ valid: false, message: '邮箱格式不正确' });
      expect(validateEmail('@example.com')).toEqual({ valid: false, message: '邮箱格式不正确' });
      expect(validateEmail('test@')).toEqual({ valid: false, message: '邮箱格式不正确' });
    });
  });

  describe('validatePassword', () => {
    it('应该验证有效密码', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('medium');
    });

    it('应该拒绝空密码', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('密码不能为空');
    });

    it('应该检查最小长度', () => {
      const result = validatePassword('12345', { minLength: 6 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少需要 6 个字符');
    });

    it('应该检查最大长度', () => {
      const longPassword = 'a'.repeat(51);
      const result = validatePassword(longPassword, { maxLength: 50 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能超过 50 个字符');
    });

    it('应该评估密码强度', () => {
      expect(validatePassword('password').strength).toBe('weak');
      expect(validatePassword('Password1').strength).toBe('strong');
      expect(validatePassword('Password').strength).toBe('medium');
    });

    it('应该检查必需的大写字母', () => {
      const result = validatePassword('password123', { requireUppercase: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少包含一个大写字母');
    });

    it('应该检查必需的小写字母', () => {
      const result = validatePassword('PASSWORD123', { requireLowercase: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少包含一个小写字母');
    });

    it('应该检查必需的数字', () => {
      const result = validatePassword('Password', { requireNumber: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少包含一个数字');
    });

    it('应该检查必需的特殊字符', () => {
      const result = validatePassword('Password123', { requireSpecial: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少包含一个特殊字符');
    });
  });

  describe('validateQuestionContent', () => {
    it('应该验证有效题目内容', () => {
      const result = validateQuestionContent('这是一个有效的题目内容');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空内容', () => {
      const result = validateQuestionContent('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('题干不能为空');
    });

    it('应该检查最小长度', () => {
      const result = validateQuestionContent('短', { minLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少需要 5 个字符');
    });

    it('应该检查最大长度', () => {
      const longContent = 'a'.repeat(2001);
      const result = validateQuestionContent(longContent, { maxLength: 2000 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能超过 2000 个字符');
    });
  });

  describe('validateQuestionOptions', () => {
    it('应该验证有效选项数组', () => {
      const options = ['选项A', '选项B', '选项C'];
      const result = validateQuestionOptions(options);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝非数组输入', () => {
      const result = validateQuestionOptions('not an array');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('选项必须是数组');
    });

    it('应该检查最小选项数量', () => {
      const result = validateQuestionOptions(['选项A'], { minCount: 2 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少需要 2 个选项');
    });

    it('应该检查最大选项数量', () => {
      const options = Array(11).fill('选项');
      const result = validateQuestionOptions(options, { maxCount: 10 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能超过 10 个选项');
    });

    it('应该拒绝空选项', () => {
      const result = validateQuestionOptions(['选项A', '', '选项C']);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('选项不能为空');
    });

    it('应该检查选项长度', () => {
      const result = validateQuestionOptions(['选项A', 'a'], { minLength: 2 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('选项 2 至少需要 2 个字符');
    });
  });

  describe('validateAnswerIndex', () => {
    it('应该验证有效答案索引', () => {
      expect(validateAnswerIndex(0, 4)).toEqual({ valid: true, message: '' });
      expect(validateAnswerIndex(3, 4)).toEqual({ valid: true, message: '' });
    });

    it('应该拒绝非数字索引', () => {
      const result = validateAnswerIndex('0', 4);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('答案索引必须是数字');
    });

    it('应该拒绝负数索引', () => {
      const result = validateAnswerIndex(-1, 4);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('答案索引超出范围');
    });

    it('应该拒绝超出范围的索引', () => {
      const result = validateAnswerIndex(5, 4);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('答案索引超出范围');
    });
  });

  describe('validateSubjectCode', () => {
    it('应该验证有效学科代码', () => {
      const result = validateSubjectCode('CS');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空学科代码', () => {
      const result = validateSubjectCode('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('学科代码不能为空');
    });

    it('应该检查最大长度', () => {
      const longCode = 'A'.repeat(51);
      const result = validateSubjectCode(longCode);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能超过 50 个字符');
    });
  });

  describe('validateBankName', () => {
    it('应该验证有效题库名称', () => {
      const result = validateBankName('计算机科学题库');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空名称', () => {
      const result = validateBankName('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('题库名称不能为空');
    });

    it('应该检查最小长度', () => {
      const result = validateBankName('A');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('至少需要 2 个字符');
    });

    it('应该检查最大长度', () => {
      const longName = 'A'.repeat(101);
      const result = validateBankName(longName);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能超过 100 个字符');
    });
  });

  describe('validateDifficulty', () => {
    it('应该验证有效难度值', () => {
      expect(validateDifficulty(1)).toEqual({ valid: true, message: '' });
      expect(validateDifficulty(3)).toEqual({ valid: true, message: '' });
      expect(validateDifficulty(5)).toEqual({ valid: true, message: '' });
    });

    it('应该拒绝非数字值', () => {
      const result = validateDifficulty('3');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('难度必须是数字');
    });

    it('应该检查最小值', () => {
      const result = validateDifficulty(0, { min: 1 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('必须在 1-5 之间');
    });

    it('应该检查最大值', () => {
      const result = validateDifficulty(6, { max: 5 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('必须在 1-5 之间');
    });
  });

  describe('validateRequiredFields', () => {
    it('应该验证所有必填字段都存在', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const result = validateRequiredFields(data, ['name', 'email']);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('应该返回缺失字段的错误', () => {
      const data = { name: 'John' };
      const result = validateRequiredFields(data, ['name', 'email']);
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('email 不能为空');
    });

    it('应该处理空字符串', () => {
      const data = { name: '', email: 'john@example.com' };
      const result = validateRequiredFields(data, ['name', 'email']);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('name 不能为空');
    });

    it('应该处理空数组', () => {
      const data = { tags: [] };
      const result = validateRequiredFields(data, ['tags']);
      expect(result.valid).toBe(false);
      expect(result.errors.tags).toBe('tags 不能为空');
    });
  });
});

