import { describe, it, expect } from 'vitest';
import { create } from '../../src/actions/tar.js';

describe('tar', () => {
  describe('create', () => {
    it('should create a valid tarball buffer', () => {
      const files = {
        'package/index.js': 'console.log("hello");',
        'package/package.json': '{"name":"test"}',
      };

      const tarball = create(files);

      expect(tarball).toBeInstanceOf(Buffer);
      expect(tarball.length).toBeGreaterThan(0);
    });

    it('should include file content in tarball', () => {
      const content = 'test content 12345';
      const files = {
        'package/test.txt': content,
      };

      const tarball = create(files);

      expect(tarball.includes(Buffer.from(content))).toBe(true);
    });

    it('should handle multiple files', () => {
      const files = {
        'package/a.js': 'a',
        'package/b.js': 'b',
        'package/c.js': 'c',
      };

      const tarball = create(files);

      expect(tarball.includes(Buffer.from('package/a.js'))).toBe(true);
      expect(tarball.includes(Buffer.from('package/b.js'))).toBe(true);
      expect(tarball.includes(Buffer.from('package/c.js'))).toBe(true);
    });

    it('should create tarball with ustar format', () => {
      const files = {
        'package/index.js': 'test',
      };

      const tarball = create(files);

      const ustarMagic = tarball.subarray(257, 262).toString();
      expect(ustarMagic).toBe('ustar');
    });
  });
});
