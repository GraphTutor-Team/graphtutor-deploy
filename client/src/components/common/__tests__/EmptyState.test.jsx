/**
 * GraphTutor V3.0 - EmptyState 组件单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmptyState from '../EmptyState';

vi.mock('../Icon', () => ({
  default: ({ name }) => <span data-testid="icon" data-icon={name}>icon</span>,
}));

const renderWithRouter = (props = {}) =>
  render(
    <BrowserRouter>
      <EmptyState {...props} />
    </BrowserRouter>
  );

describe('EmptyState', () => {
  it('应渲染默认标题「暂无数据」', () => {
    renderWithRouter();
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('应渲染 title 文案', () => {
    renderWithRouter({ title: '暂无群组' });
    expect(screen.getByText('暂无群组')).toBeInTheDocument();
  });

  it('应兼容 message 作为 title', () => {
    renderWithRouter({ message: '暂无会话' });
    expect(screen.getByText('暂无会话')).toBeInTheDocument();
  });

  it('应渲染 description', () => {
    renderWithRouter({ title: '空', description: '这里还没有内容，去添加吧。' });
    expect(screen.getByText('这里还没有内容，去添加吧。')).toBeInTheDocument();
  });

  it('应渲染操作按钮并响应 onClick', async () => {
    const onAction = vi.fn();
    renderWithRouter({
      title: '空',
      actionLabel: '创建',
      onAction,
    });
    const btn = screen.getByRole('button', { name: /创建/ });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('应渲染 actionLink 为链接', () => {
    renderWithRouter({
      title: '空',
      actionLink: '/friends/discover',
      actionLabel: '去发现好友',
    });
    const link = screen.getByRole('link', { name: /去发现好友/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/friends/discover');
  });

  it('无 action 且无 actionLink 时不渲染按钮', () => {
    renderWithRouter({ title: '空' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
