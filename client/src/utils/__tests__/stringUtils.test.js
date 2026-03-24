/**
 * GraphTutor V3.0 - 字符串工具函数测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  truncate,
  capitalize,
  camelToKebab,
  kebabToCamel,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  randomString,
  isEmpty,
  getFileExtension,
} from '../stringUtils';

describe('stringUtils', () => {
  describe('truncate', () => {
    it('应该截断长字符串', () => {
      const str = '这是一个很长的字符串需要被截断';
      expect(truncate(str, 10)).toBe('这是一个很长的字符串需...');
    });

    it('应该不截断短字符串', () => {
      const str = '短字符串';
      expect(truncate(str, 10)).toBe('短字符串');
    });

    it('应该使用自定义后缀', () => {
      const str = '长字符串';
      expect(truncate(str, 2, '***')).toBe('长***');
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(truncate(null)).toBe('');
      expect(truncate(undefined)).toBe('');
      expect(truncate(123)).toBe('');
    });
  });

  describe('capitalize', () => {
    it('应该首字母大写', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(capitalize(null)).toBe('');
      expect(capitalize(undefined)).toBe('');
      expect(capitalize('')).toBe('');
    });
  });

  describe('camelToKebab', () => {
    it('应该转换驼峰命名为短横线命名', () => {
      expect(camelToKebab('camelCase')).toBe('camel-case');
      expect(camelToKebab('myVariableName')).toBe('my-variable-name');
    });

    it('应该处理数字', () => {
      expect(camelToKebab('test123Value')).toBe('test123-value');
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(camelToKebab(null)).toBe('');
      expect(camelToKebab('')).toBe('');
    });
  });

  describe('kebabToCamel', () => {
    it('应该转换短横线命名为驼峰命名', () => {
      expect(kebabToCamel('kebab-case')).toBe('kebabCase');
      expect(kebabToCamel('my-variable-name')).toBe('myVariableName');
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(kebabToCamel(null)).toBe('');
      expect(kebabToCamel('')).toBe('');
    });
  });

  describe('stripHtml', () => {
    beforeEach(() => {
      // 设置DOM环境
      global.document = {
        createElement: vi.fn(() => ({
          innerHTML: '',
          textContent: '',
          innerText: '',
        })),
      };
    });

    it('应该移除HTML标签', () => {
      const html = '<div>Hello <strong>World</strong></div>';
      const element = {
        innerHTML: html,
        textContent: 'Hello World',
        innerText: 'Hello World',
      };
      global.document.createElement = vi.fn(() => element);

      expect(stripHtml(html)).toBe('Hello World');
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('应该转义HTML特殊字符', () => {
      expect(escapeHtml('<div>Hello</div>')).toBe('&lt;div&gt;Hello&lt;/div&gt;');
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("'single'")).toBe('&#039;single&#039;');
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('unescapeHtml', () => {
    it('应该反转义HTML特殊字符', () => {
      expect(unescapeHtml('&lt;div&gt;Hello&lt;/div&gt;')).toBe('<div>Hello</div>');
      expect(unescapeHtml('Tom &amp; Jerry')).toBe('Tom & Jerry');
      expect(unescapeHtml('&quot;quoted&quot;')).toBe('"quoted"');
      expect(unescapeHtml('&#039;single&#039;')).toBe("'single'");
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(unescapeHtml(null)).toBe('');
      expect(unescapeHtml(undefined)).toBe('');
    });
  });

  describe('randomString', () => {
    it('应该生成指定长度的随机字符串', () => {
      const str = randomString(10);
      expect(str.length).toBe(10);
    });

    it('应该使用默认长度8', () => {
      const str = randomString();
      expect(str.length).toBe(8);
    });

    it('应该只包含字母和数字', () => {
      const str = randomString(100);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('应该生成不同的字符串', () => {
      const str1 = randomString(20);
      const str2 = randomString(20);
      // 虽然理论上可能相同，但概率极低
      expect(str1).not.toBe(str2);
    });
  });

  describe('isEmpty', () => {
    it('应该判断null和undefined为空', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('应该判断空字符串为空', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
    });

    it('应该判断空数组为空', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('应该判断空对象为空', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('应该判断非空值为非空', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('应该提取文件扩展名', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('image.JPG')).toBe('jpg');
    });

    it('应该处理多个点的文件名', () => {
      expect(getFileExtension('file.backup.txt')).toBe('txt');
    });

    it('应该返回空字符串当没有扩展名时', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('')).toBe('');
    });

    it('应该返回空字符串当输入无效时', () => {
      expect(getFileExtension(null)).toBe('');
      expect(getFileExtension(undefined)).toBe('');
    });
  });
});

