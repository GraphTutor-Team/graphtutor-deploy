/**
 * GraphTutor V3.0 - 错误处理工具测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleApiError,
  handleValidationError,
  handleNetworkError,
  handlePermissionError,
  extractApiData,
  createFieldError,
  mergeErrors,
} from '../errorHandler';
import { toast } from '../toast';

// Mock toast
vi.mock('../toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('应该从response.data.message提取错误消息', () => {
      const error = {
        response: {
          data: { message: '自定义错误消息' },
        },
      };

      const result = handleApiError(error);
      expect(result).toBe('自定义错误消息');
      expect(toast.error).toHaveBeenCalledWith('自定义错误消息');
    });

    it('应该从response.data.error提取错误消息', () => {
      const error = {
        response: {
          data: { error: '错误信息' },
        },
      };

      const result = handleApiError(error);
      expect(result).toBe('错误信息');
    });

    it('应该从error.message提取错误消息', () => {
      const error = { message: '错误消息' };

      const result = handleApiError(error);
      expect(result).toBe('错误消息');
    });

    it('应该根据HTTP状态码提供友好提示', () => {
      const error = {
        response: { status: 401 },
      };

      const result = handleApiError(error);
      expect(result).toBe('未授权，请重新登录');
    });

    it('应该使用默认消息当无法提取错误时', () => {
      const error = {};

      const result = handleApiError(error, '默认错误');
      expect(result).toBe('默认错误');
    });

    it('应该支持禁用toast显示', () => {
      const error = { message: '错误' };

      handleApiError(error, '默认', { showToast: false });
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('应该支持禁用错误日志', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = { message: '错误' };

      handleApiError(error, '默认', { logError: false });
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('handleValidationError', () => {
    it('应该处理空错误对象', () => {
      const result = handleValidationError({});
      expect(result).toBeUndefined();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('应该显示第一个错误（默认）', () => {
      const errors = {
        email: '邮箱格式错误',
        password: '密码不能为空',
      };

      handleValidationError(errors);
      expect(toast.error).toHaveBeenCalledWith('邮箱格式错误');
    });

    it('应该显示所有错误当showFirstOnly为false时', () => {
      const errors = {
        email: '邮箱格式错误',
        password: '密码不能为空',
      };

      handleValidationError(errors, { showFirstOnly: false });
      expect(toast.error).toHaveBeenCalledWith('email: 邮箱格式错误; password: 密码不能为空');
    });

    it('应该支持禁用toast显示', () => {
      const errors = { email: '邮箱格式错误' };

      const result = handleValidationError(errors, { showToast: false });
      expect(toast.error).not.toHaveBeenCalled();
      expect(result).toEqual(errors);
    });
  });

  describe('handleNetworkError', () => {
    it('应该处理请求超时错误', () => {
      const error = { code: 'ECONNABORTED' };

      handleNetworkError(error);
      expect(toast.error).toHaveBeenCalledWith('请求超时，请稍后再试');
    });

    it('应该处理网络错误', () => {
      const error = { message: 'Network Error' };

      handleNetworkError(error);
      expect(toast.error).toHaveBeenCalledWith('网络连接失败，请检查网络设置');
    });

    it('应该降级到handleApiError处理其他错误', () => {
      const error = { response: { status: 500 } };

      handleNetworkError(error);
      expect(toast.error).toHaveBeenCalledWith('服务器错误，请稍后再试');
    });
  });

  describe('handlePermissionError', () => {
    it('应该处理401未授权错误', () => {
      const error = { response: { status: 401 } };
      const onUnauthorized = vi.fn();

      handlePermissionError(error, onUnauthorized);
      expect(toast.error).toHaveBeenCalledWith('权限不足，请检查您的角色权限');
      expect(onUnauthorized).toHaveBeenCalled();
    });

    it('应该处理403禁止访问错误', () => {
      const error = { response: { status: 403 } };
      const onUnauthorized = vi.fn();

      handlePermissionError(error, onUnauthorized);
      expect(toast.error).toHaveBeenCalledWith('权限不足，请检查您的角色权限');
      expect(onUnauthorized).toHaveBeenCalled();
    });

    it('应该降级到handleApiError处理其他错误', () => {
      const error = { response: { status: 500 } };

      handlePermissionError(error);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('extractApiData', () => {
    it('应该从response.data提取数据', () => {
      const response = { data: { data: [1, 2, 3] } };
      const result = extractApiData(response);
      expect(result).toEqual([1, 2, 3]);
    });

    it('应该从response.items提取数据', () => {
      const response = { data: { items: [1, 2, 3] } };
      const result = extractApiData(response);
      expect(result).toEqual([1, 2, 3]);
    });

    it('应该从response.result提取数据', () => {
      const response = { data: { result: { id: 1 } } };
      const result = extractApiData(response);
      expect(result).toEqual({ id: 1 });
    });

    it('应该使用dataPath提取嵌套数据', () => {
      const response = { data: { user: { profile: { name: 'John' } } } };
      const result = extractApiData(response, 'user.profile');
      expect(result).toEqual({ name: 'John' });
    });

    it('应该返回null当路径不存在时', () => {
      const response = { data: { user: {} } };
      const result = extractApiData(response, 'user.profile.name');
      expect(result).toBeNull();
    });

    it('应该返回null当response为null时', () => {
      const result = extractApiData(null);
      expect(result).toBeNull();
    });
  });

  describe('createFieldError', () => {
    it('应该创建字段错误对象', () => {
      const result = createFieldError('email', '邮箱格式错误');
      expect(result).toEqual({ email: '邮箱格式错误' });
    });
  });

  describe('mergeErrors', () => {
    it('应该合并多个错误对象', () => {
      const error1 = { email: '邮箱错误' };
      const error2 = { password: '密码错误' };
      const result = mergeErrors(error1, error2);

      expect(result).toEqual({
        email: '邮箱错误',
        password: '密码错误',
      });
    });

    it('应该过滤null和undefined', () => {
      const error1 = { email: '邮箱错误' };
      const result = mergeErrors(error1, null, undefined);

      expect(result).toEqual({ email: '邮箱错误' });
    });

    it('应该返回空对象当没有错误时', () => {
      const result = mergeErrors();
      expect(result).toEqual({});
    });
  });
});

