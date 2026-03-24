/**
 * GraphTutor V3.0 - 后端错误处理测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../errorHandler.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('应该创建应用错误', () => {
      const error = new AppError('错误消息', 500, 'ERROR_CODE');
      expect(error.message).toBe('错误消息');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('ERROR_CODE');
      expect(error.name).toBe('AppError');
    });

    it('应该使用默认值', () => {
      const error = new AppError('错误消息');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeNull();
    });
  });

  describe('ValidationError', () => {
    it('应该创建验证错误', () => {
      const errors = ['字段1错误', '字段2错误'];
      const error = new ValidationError('验证失败', errors);
      expect(error.message).toBe('验证失败');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('UnauthorizedError', () => {
    it('应该创建未授权错误', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('未授权，请重新登录');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('应该支持自定义消息', () => {
      const error = new UnauthorizedError('请登录');
      expect(error.message).toBe('请登录');
    });
  });

  describe('ForbiddenError', () => {
    it('应该创建禁止访问错误', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('权限不足');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
    });
  });

  describe('NotFoundError', () => {
    it('应该创建未找到错误', () => {
      const error = new NotFoundError('资源不存在');
      expect(error.message).toBe('资源不存在');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('ConflictError', () => {
    it('应该创建冲突错误', () => {
      const error = new ConflictError('数据冲突');
      expect(error.message).toBe('数据冲突');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });
  });
});

