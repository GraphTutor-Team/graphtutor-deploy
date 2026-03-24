import { describe, it, expect } from 'vitest';
import { SpacedRepetition, getTodayReviewQuestions, updateReviewPlan } from '../smartReview';

describe('SpacedRepetition', () => {
  describe('calculateNextReview', () => {
    it('应该正确计算下次复习时间（高质量回答）', () => {
      const result = SpacedRepetition.calculateNextReview({
        easinessFactor: 2.5,
        interval: 1,
        repetitions: 0,
        quality: 5,
      });

      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.easinessFactor).toBeGreaterThan(2.5);
    });

    it('应该重置间隔（低质量回答）', () => {
      const result = SpacedRepetition.calculateNextReview({
        easinessFactor: 2.5,
        interval: 10,
        repetitions: 5,
        quality: 2,
      });

      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });

    it('应该限制简易因子最小值', () => {
      const result = SpacedRepetition.calculateNextReview({
        easinessFactor: 1.3,
        interval: 1,
        repetitions: 0,
        quality: 0,
      });

      expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('calculatePriority', () => {
    it('应该为高错误次数题目分配高优先级', () => {
      const wrongQuestion = {
        errorCount: 10,
        mastery: 0.2,
      };

      const priority = SpacedRepetition.calculatePriority(wrongQuestion);
      expect(priority).toBeGreaterThan(50);
    });

    it('应该为低掌握度题目分配高优先级', () => {
      const wrongQuestion = {
        errorCount: 1,
        mastery: 0.1,
      };

      const priority = SpacedRepetition.calculatePriority(wrongQuestion);
      expect(priority).toBeGreaterThan(20);
    });
  });

  describe('getTodayReviewQuestions', () => {
    it('应该返回今日需要复习的题目', () => {
      const wrongQuestions = [
        {
          _id: '1',
          nextReviewDate: new Date(Date.now() - 86400000), // 昨天
        },
        {
          _id: '2',
          nextReviewDate: new Date(Date.now() + 86400000), // 明天
        },
        {
          _id: '3',
          // 没有复习计划
        },
      ];

      const todayQuestions = getTodayReviewQuestions(wrongQuestions);
      expect(todayQuestions.length).toBe(2);
      expect(todayQuestions.some(q => q._id === '1')).toBe(true);
      expect(todayQuestions.some(q => q._id === '3')).toBe(true);
    });

    it('应该按优先级排序', () => {
      const wrongQuestions = [
        {
          _id: '1',
          errorCount: 1,
          mastery: 0.9,
        },
        {
          _id: '2',
          errorCount: 10,
          mastery: 0.1,
        },
      ];

      const todayQuestions = getTodayReviewQuestions(wrongQuestions);
      expect(todayQuestions[0]._id).toBe('2'); // 高优先级在前
    });
  });

  describe('updateReviewPlan', () => {
    it('应该更新复习计划', () => {
      const wrongQuestion = {
        reviewPlan: {
          easinessFactor: 2.5,
          interval: 1,
          repetitions: 0,
        },
      };

      const updated = updateReviewPlan(wrongQuestion, 5);
      expect(updated.interval).toBeGreaterThan(0);
      expect(updated.repetitions).toBe(1);
      expect(updated.lastReviewAt).toBeInstanceOf(Date);
    });
  });
});

