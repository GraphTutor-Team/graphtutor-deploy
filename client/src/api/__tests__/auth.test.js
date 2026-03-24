/**
 * GraphTutor V3.0 - 认证API测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, register } from '../auth';
import api from '../api';

// Mock api
vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('应该调用登录API', async () => {
      const mockResponse = { data: { success: true, token: 'test-token' } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await login({ email: 'test@example.com', password: 'password123' });

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该处理登录错误', async () => {
      const mockError = { response: { data: { error: '登录失败' } } };
      api.post.mockRejectedValueOnce(mockError);

      await expect(login({ email: 'test@example.com', password: 'wrong' })).rejects.toEqual(
        mockError
      );
    });
  });

  describe('register', () => {
    it('应该调用注册API', async () => {
      const mockResponse = { data: { success: true, message: '注册成功' } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await register({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该处理注册错误', async () => {
      const mockError = { response: { data: { error: '邮箱已存在' } } };
      api.post.mockRejectedValueOnce(mockError);

      await expect(
        register({ email: 'existing@example.com', password: 'password123' })
      ).rejects.toEqual(mockError);
    });
  });
});

