import { describe, it, expect } from 'vitest';
import { validRange, satisfies, parseVersion, getNextMajor } from '../../src/actions/semver.js';

describe('semver', () => {
  describe('validRange', () => {
    it('should accept wildcard', () => {
      expect(validRange('*')).toBe('*');
    });

    it('should accept exact versions', () => {
      expect(validRange('1.2.3')).toBe('1.2.3');
      expect(validRange('0.0.1')).toBe('0.0.1');
      expect(validRange('10.20.30')).toBe('10.20.30');
    });

    it('should accept comparison ranges', () => {
      expect(validRange('<=1.0.0')).toBe('<=1.0.0');
      expect(validRange('>=2.0.0')).toBe('>=2.0.0');
      expect(validRange('<3.0.0')).toBe('<3.0.0');
      expect(validRange('>0.5.0')).toBe('>0.5.0');
    });

    it('should accept major.x ranges', () => {
      expect(validRange('1.x')).toBe('1.x');
      expect(validRange('2.x')).toBe('2.x');
    });

    it('should accept major.minor.x ranges', () => {
      expect(validRange('1.2.x')).toBe('1.2.x');
    });

    it('should convert single major to major.x', () => {
      expect(validRange('1')).toBe('1.x');
      expect(validRange('2')).toBe('2.x');
    });

    it('should reject invalid ranges', () => {
      expect(validRange('invalid')).toBeNull();
      expect(validRange('1.2')).toBeNull();
      expect(validRange('a.b.c')).toBeNull();
    });
  });

  describe('parseVersion', () => {
    it('should parse valid versions', () => {
      expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(parseVersion('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
      expect(parseVersion('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30 });
    });

    it('should return null for invalid versions', () => {
      expect(parseVersion('invalid')).toBeNull();
      expect(parseVersion('1.2')).toBeNull();
      expect(parseVersion('1.x')).toBeNull();
    });
  });

  describe('satisfies', () => {
    it('should match wildcard', () => {
      expect(satisfies('1.0.0', '*')).toBe(true);
      expect(satisfies('99.99.99', '*')).toBe(true);
    });

    it('should match exact versions', () => {
      expect(satisfies('1.0.0', '1.0.0')).toBe(true);
      expect(satisfies('1.0.0', '1.0.1')).toBe(false);
    });

    it('should match <= ranges', () => {
      expect(satisfies('1.0.0', '<=1.0.0')).toBe(true);
      expect(satisfies('0.9.9', '<=1.0.0')).toBe(true);
      expect(satisfies('1.0.1', '<=1.0.0')).toBe(false);
    });

    it('should match >= ranges', () => {
      expect(satisfies('1.0.0', '>=1.0.0')).toBe(true);
      expect(satisfies('1.0.1', '>=1.0.0')).toBe(true);
      expect(satisfies('0.9.9', '>=1.0.0')).toBe(false);
    });

    it('should match major.x ranges', () => {
      expect(satisfies('1.0.0', '1.x')).toBe(true);
      expect(satisfies('1.9.9', '1.x')).toBe(true);
      expect(satisfies('2.0.0', '1.x')).toBe(false);
    });
  });

  describe('getNextMajor', () => {
    it('should increment major version', () => {
      expect(getNextMajor('1.2.3')).toBe('2.0.0');
      expect(getNextMajor('0.0.1')).toBe('1.0.0');
      expect(getNextMajor('99.5.3')).toBe('100.0.0');
    });

    it('should return 99.0.0 for invalid versions', () => {
      expect(getNextMajor('invalid')).toBe('99.0.0');
    });
  });
});
