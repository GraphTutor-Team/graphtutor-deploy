/**
 * GraphTutor V3.0 - 日期工具函数测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  formatRelativeTime,
  getDateRange,
  getThisWeekRange,
  getThisMonthRange,
  isSameDay,
  daysBetween,
  addDays,
  getWeekStart,
} from '../dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    // 固定当前时间为 2024-01-15 12:00:00 (周一)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDate', () => {
    it('应该格式化日期为YYYY-MM-DD', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('应该格式化日期为YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date('2024-01-15T14:30:45');
      expect(formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 14:30:45');
    });

    it('应该处理字符串日期', () => {
      expect(formatDate('2024-01-15')).toBe('2024-01-15');
    });

    it('应该处理时间戳', () => {
      const timestamp = new Date('2024-01-15').getTime();
      expect(formatDate(timestamp)).toBe('2024-01-15');
    });

    it('应该返回空字符串当日期无效时', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    it('应该显示"刚刚"当时间小于1分钟', () => {
      const date = new Date(Date.now() - 30 * 1000);
      expect(formatRelativeTime(date)).toBe('刚刚');
    });

    it('应该显示"X分钟前"', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('5分钟前');
    });

    it('应该显示"X小时前"', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('3小时前');
    });

    it('应该显示"X天前"', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('2天前');
    });

    it('应该显示"X周前"', () => {
      const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('2周前');
    });

    it('应该显示"X个月前"', () => {
      const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('2个月前');
    });

    it('应该显示"X年前"', () => {
      const date = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('1年前');
    });

    it('应该返回空字符串当日期无效时', () => {
      expect(formatRelativeTime(null)).toBe('');
      expect(formatRelativeTime('invalid')).toBe('');
    });
  });

  describe('getDateRange', () => {
    it('应该获取过去7天的日期范围', () => {
      const range = getDateRange(-7);
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    it('应该获取未来7天的日期范围', () => {
      const range = getDateRange(7);
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });

    it('应该确保start早于end', () => {
      const range = getDateRange(-7);
      expect(range.start.getTime()).toBeLessThanOrEqual(range.end.getTime());
    });
  });

  describe('getThisWeekRange', () => {
    it('应该返回本周的日期范围', () => {
      const range = getThisWeekRange();
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getDay()).toBe(1); // 周一
    });

    it('应该返回周一到周日', () => {
      const range = getThisWeekRange();
      const daysDiff = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(6);
    });
  });

  describe('getThisMonthRange', () => {
    it('应该返回本月的日期范围', () => {
      const range = getThisMonthRange();
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getDate()).toBe(1); // 月初
    });
  });

  describe('isSameDay', () => {
    it('应该判断两个日期是同一天', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-15T20:00:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('应该判断两个日期不是同一天', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('应该处理字符串日期', () => {
      expect(isSameDay('2024-01-15', '2024-01-15')).toBe(true);
      expect(isSameDay('2024-01-15', '2024-01-16')).toBe(false);
    });

    it('应该返回false当日期无效时', () => {
      expect(isSameDay(null, new Date())).toBe(false);
      expect(isSameDay(new Date(), null)).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('应该计算两个日期之间的天数差', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it('应该返回绝对值', () => {
      const date1 = new Date('2024-01-20');
      const date2 = new Date('2024-01-15');
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it('应该返回0当日期无效时', () => {
      expect(daysBetween(null, new Date())).toBe(0);
      expect(daysBetween(new Date(), null)).toBe(0);
    });
  });

  describe('addDays', () => {
    it('应该添加天数', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('应该支持负数（减去天数）', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });

    it('应该处理字符串日期', () => {
      const result = addDays('2024-01-15', 5);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('getWeekStart', () => {
    it('应该返回周一日期', () => {
      const date = new Date('2024-01-15'); // 周一
      const result = getWeekStart(date);
      expect(result.getDay()).toBe(1);
    });

    it('应该返回本周周一当输入是周日时', () => {
      const date = new Date('2024-01-14'); // 周日
      const result = getWeekStart(date);
      expect(result.getDay()).toBe(1);
    });

    it('应该设置时间为00:00:00', () => {
      const date = new Date('2024-01-15T15:30:45');
      const result = getWeekStart(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });
});

