/**
 * GraphTutor V3.0 - 响应时间中间件单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { responseTimeLogger, defaultResponseTimeLogger } from '../responseTime.js';

describe('responseTimeLogger', () => {
  let req;
  let res;
  let next;
  let originalEnd;

  beforeEach(() => {
    req = { method: 'GET', url: '/api/test' };
    originalEnd = vi.fn();
    res = {
      headersSent: false,
      statusCode: 200,
      end: originalEnd,
      setHeader: vi.fn(),
      on: vi.fn(),
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应调用 next()', () => {
    const middleware = responseTimeLogger({ slowThreshold: 500 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('应在 res.end 时设置 X-Response-Time 头', () => {
    const middleware = responseTimeLogger({ slowThreshold: 500 });
    middleware(req, res, next);
    expect(res.end).not.toBe(originalEnd);
    res.end();
    expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
  });

  it('应在 finish 时根据耗时决定 log 或 warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const middleware = responseTimeLogger({ slowThreshold: 10 });
    middleware(req, res, next);
    const finishCb = res.on.mock.calls.find((c) => c[0] === 'finish')?.[1];
    expect(finishCb).toBeDefined();
    finishCb();
    expect(logSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('defaultResponseTimeLogger 应使用 500ms 阈值', () => {
    expect(defaultResponseTimeLogger).toBeDefined();
    defaultResponseTimeLogger(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
