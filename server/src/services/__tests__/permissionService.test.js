/**
 * GraphTutor V3.0 - 权限服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionService, PermissionResult } from '../permissionService.js';

describe('PermissionService', () => {
  describe('isOwner', () => {
    it('应该识别资源所有者（通过ownerId）', () => {
      const userId = 'user123';
      const resource = { ownerId: 'user123', name: '资源' };
      expect(PermissionService.isOwner(userId, resource)).toBe(true);
    });

    it('应该识别资源所有者（通过createdBy）', () => {
      const userId = 'user123';
      const resource = { createdBy: 'user123', name: '资源' };
      expect(PermissionService.isOwner(userId, resource)).toBe(true);
    });

    it('应该识别资源所有者（通过userId）', () => {
      const userId = 'user123';
      const resource = { userId: 'user123', name: '资源' };
      expect(PermissionService.isOwner(userId, resource)).toBe(true);
    });

    it('应该拒绝非所有者', () => {
      const userId = 'user123';
      const resource = { ownerId: 'user456', name: '资源' };
      expect(PermissionService.isOwner(userId, resource)).toBe(false);
    });

    it('应该处理null资源', () => {
      expect(PermissionService.isOwner('user123', null)).toBe(false);
    });

    it('应该处理null用户ID', () => {
      const resource = { ownerId: 'user123' };
      expect(PermissionService.isOwner(null, resource)).toBe(false);
    });

    it('应该处理字符串和ObjectId转换', () => {
      const userId = 'user123';
      const resource = { ownerId: { toString: () => 'user123' } };
      expect(PermissionService.isOwner(userId, resource)).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('应该识别管理员（通过isAdmin）', () => {
      const user = { isAdmin: true, role: 'student' };
      expect(PermissionService.isAdmin(user)).toBe(true);
    });

    it('应该识别管理员（通过role）', () => {
      const user = { role: 'admin' };
      expect(PermissionService.isAdmin(user)).toBe(true);
    });

    it('应该拒绝非管理员', () => {
      const user = { role: 'student' };
      expect(PermissionService.isAdmin(user)).toBe(false);
    });

    it('应该处理null用户', () => {
      expect(PermissionService.isAdmin(null)).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('应该检查单个角色', () => {
      const user = { role: 'student' };
      expect(PermissionService.hasRole(user, 'student')).toBe(true);
      expect(PermissionService.hasRole(user, 'admin')).toBe(false);
    });

    it('应该检查多个角色（数组）', () => {
      const user = { role: 'student' };
      expect(PermissionService.hasRole(user, ['student', 'admin'])).toBe(true);
      expect(PermissionService.hasRole(user, ['admin', 'teacher'])).toBe(false);
    });

    it('应该处理null用户', () => {
      expect(PermissionService.hasRole(null, 'student')).toBe(false);
    });

    it('应该处理没有role的用户', () => {
      const user = {};
      expect(PermissionService.hasRole(user, 'student')).toBe(false);
    });
  });

  describe('PermissionResult', () => {
    it('应该创建允许结果', () => {
      const result = PermissionResult.allow();
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('应该创建拒绝结果', () => {
      const result = PermissionResult.deny('权限不足');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('权限不足');
    });
  });
});

