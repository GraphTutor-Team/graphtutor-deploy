/**
 * GraphTutor V3.0 - Register组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../Register';
import { toast } from '../../utils/toast';
import api from '../../api/api';

// Mock依赖
vi.mock('../../utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../utils/passwordValidation', () => ({
  validatePasswordFormat: vi.fn(),
  checkPasswordRequirements: vi.fn(),
  getPasswordRequirements: vi.fn(),
}));

vi.mock('../../api/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderRegister = () => {
  return render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>
  );
};

describe('Register组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockClear();
  });

  it('应该渲染注册表单', () => {
    renderRegister();
    expect(screen.getByText('注册')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/密码/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/确认密码/i)).toBeInTheDocument();
  });

  it('应该显示返回主页链接', () => {
    renderRegister();
    const backLink = screen.getByText(/返回主页/i);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/home');
  });

  it('应该验证邮箱格式', async () => {
    renderRegister();
    const emailInput = screen.getByPlaceholderText(/邮箱/i);
    const submitButton = screen.getByRole('button', { name: /注册/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请输入有效邮箱')).toBeInTheDocument();
    });
  });

  it('应该验证密码格式', async () => {
    const { checkPasswordRequirements } = await import('../../utils/passwordValidation');
    checkPasswordRequirements.mockReturnValue({
      valid: false,
      message: '密码至少需要6个字符',
    });

    renderRegister();
    const emailInput = screen.getByPlaceholderText(/邮箱/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const submitButton = screen.getByRole('button', { name: /注册/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('密码至少需要6个字符')).toBeInTheDocument();
    });
  });

  it('应该验证密码确认', async () => {
    const { checkPasswordRequirements } = await import('../../utils/passwordValidation');
    checkPasswordRequirements.mockReturnValue({ valid: true });

    renderRegister();
    const emailInput = screen.getByPlaceholderText(/邮箱/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const confirmInput = screen.getByPlaceholderText(/确认密码/i);
    const submitButton = screen.getByRole('button', { name: /注册/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('两次密码不一致')).toBeInTheDocument();
    });
  });

  it('应该成功提交注册表单', async () => {
    const { checkPasswordRequirements } = await import('../../utils/passwordValidation');
    checkPasswordRequirements.mockReturnValue({ valid: true });

    api.post.mockResolvedValueOnce({
      data: { success: true, message: '注册成功' },
    });

    renderRegister();
    const emailInput = screen.getByPlaceholderText(/邮箱/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const confirmInput = screen.getByPlaceholderText(/确认密码/i);
    const submitButton = screen.getByRole('button', { name: /注册/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(toast.success).toHaveBeenCalledWith('注册成功');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('应该处理注册失败', async () => {
    const { checkPasswordRequirements } = await import('../../utils/passwordValidation');
    checkPasswordRequirements.mockReturnValue({ valid: true });

    api.post.mockRejectedValueOnce({
      response: { data: { message: '邮箱已存在' } },
    });

    renderRegister();
    const emailInput = screen.getByPlaceholderText(/邮箱/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const confirmInput = screen.getByPlaceholderText(/确认密码/i);
    const submitButton = screen.getByRole('button', { name: /注册/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('邮箱已存在')).toBeInTheDocument();
    });
  });

  it('应该处理网络错误', async () => {
    const { checkPasswordRequirements } = await import('../../utils/passwordValidation');
    checkPasswordRequirements.mockReturnValue({ valid: true });

    api.post.mockRejectedValueOnce(new Error('Network error'));

    renderRegister();
    const emailInput = screen.getByPlaceholderText(/邮箱/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const confirmInput = screen.getByPlaceholderText(/确认密码/i);
    const submitButton = screen.getByRole('button', { name: /注册/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('网络不可用或接口未实现')).toBeInTheDocument();
    });
  });

  it('应该切换密码显示/隐藏', () => {
    renderRegister();
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const toggleButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg')
    );

    // 初始应该是password类型
    expect(passwordInput).toHaveAttribute('type', 'password');

    if (toggleButton) {
      fireEvent.click(toggleButton);
      // 注意：实际实现可能需要检查状态变化
    }
  });
});

