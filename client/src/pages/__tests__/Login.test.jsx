import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    token: null,
    loading: false,
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock API
vi.mock('../../api/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({ email: 'test@example.com' });
  });

  it('应该渲染登录表单', () => {
    renderWithRouter(<Login />);
    
    expect(screen.getByText('登录 GraphTutor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('至少 6 位')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument();
  });

  it('应该显示邮箱验证错误', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Login />);
    
    const emailInput = screen.getByPlaceholderText('your@email.com');
    const submitButton = screen.getByRole('button', { name: /登录/ });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('请输入有效邮箱')).toBeInTheDocument();
    });
  });

  it('应该显示密码长度错误', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Login />);
    
    const emailInput = screen.getByPlaceholderText('your@email.com');
    const passwordInput = screen.getByPlaceholderText('至少 6 位');
    const submitButton = screen.getByRole('button', { name: /登录/ });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '12345');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('密码至少 6 位')).toBeInTheDocument();
    });
  });

  it('应该切换密码显示/隐藏', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Login />);
    
    const passwordInput = screen.getByPlaceholderText('至少 6 位');
    const toggleButton = screen.getByText('显示');
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByText('隐藏')).toBeInTheDocument();
  });

  it('应该有注册链接', () => {
    renderWithRouter(<Login />);
    
    const registerLink = screen.getByText('去注册');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });
});

