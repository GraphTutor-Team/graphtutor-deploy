import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PageHeader from '../PageHeader';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('PageHeader Component', () => {
  it('应该渲染标题', () => {
    renderWithRouter(<PageHeader title="测试页面" />);
    expect(screen.getByText('测试页面')).toBeInTheDocument();
  });

  it('应该渲染描述', () => {
    renderWithRouter(
      <PageHeader title="测试页面" desc="这是测试描述" />
    );
    expect(screen.getByText('这是测试描述')).toBeInTheDocument();
  });

  it('应该有返回按钮', () => {
    renderWithRouter(<PageHeader title="测试页面" />);
    const backButton = screen.getByText('← 返回');
    expect(backButton).toBeInTheDocument();
  });

  it('应该渲染操作按钮', () => {
    const actions = [
      { label: '新增', onClick: vi.fn() },
      { label: '删除', to: '/delete' },
    ];
    
    renderWithRouter(
      <PageHeader title="测试页面" actions={actions} />
    );
    
    expect(screen.getByText('新增')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });
});

