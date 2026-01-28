import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatRelativeDate,
  formatDownloads,
  truncate,
  calculateNextMajor,
} from '../../src/utils/format.js';

describe('format', () => {
  describe('formatDate', () => {
    it('should format date as ISO date string', () => {
      const date = new Date('2024-06-15T10:30:00Z');
      expect(formatDate(date)).toBe('2024-06-15');
    });
  });

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format today', () => {
      const date = new Date('2024-06-15T10:00:00Z');
      expect(formatRelativeDate(date)).toBe('today');
    });

    it('should format yesterday', () => {
      const date = new Date('2024-06-14T10:00:00Z');
      expect(formatRelativeDate(date)).toBe('yesterday');
    });

    it('should format days ago', () => {
      const date = new Date('2024-06-10T10:00:00Z');
      expect(formatRelativeDate(date)).toBe('5 days ago');
    });

    it('should format weeks ago', () => {
      const date = new Date('2024-06-01T10:00:00Z');
      expect(formatRelativeDate(date)).toBe('2 weeks ago');
    });

    it('should format months ago', () => {
      const date = new Date('2024-03-15T10:00:00Z');
      expect(formatRelativeDate(date)).toBe('3 months ago');
    });

    it('should format years ago', () => {
      const date = new Date('2022-06-15T10:00:00Z');
      expect(formatRelativeDate(date)).toBe('2 years ago');
    });
  });

  describe('formatDownloads', () => {
    it('should format small numbers', () => {
      expect(formatDownloads(0)).toBe('0');
      expect(formatDownloads(999)).toBe('999');
    });

    it('should format thousands', () => {
      expect(formatDownloads(1000)).toBe('1.0K');
      expect(formatDownloads(1500)).toBe('1.5K');
      expect(formatDownloads(999999)).toBe('1000.0K');
    });

    it('should format millions', () => {
      expect(formatDownloads(1000000)).toBe('1.0M');
      expect(formatDownloads(2500000)).toBe('2.5M');
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long strings', () => {
      expect(truncate('hello world', 8)).toBe('hello w…');
    });

    it('should handle exact length', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });
  });

  describe('calculateNextMajor', () => {
    it('should calculate next major version', () => {
      expect(calculateNextMajor('1.2.3')).toBe('2.0.0');
      expect(calculateNextMajor('0.5.0')).toBe('1.0.0');
    });

    it('should return 99.0.0 for invalid versions', () => {
      expect(calculateNextMajor('invalid')).toBe('99.0.0');
    });
  });
});
