import { describe, it, expect } from 'vitest';
import { parseRepoUrl } from '../../src/providers/github.js';

describe('parseRepoUrl', () => {
  it('should parse owner/repo format', () => {
    const result = parseRepoUrl('facebook/react');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('should parse HTTPS GitHub URL', () => {
    const result = parseRepoUrl('https://github.com/facebook/react');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('should parse HTTPS GitHub URL with .git suffix', () => {
    const result = parseRepoUrl('https://github.com/facebook/react.git');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('should parse SSH GitHub URL', () => {
    const result = parseRepoUrl('git@github.com:facebook/react.git');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('should parse git+https URL', () => {
    const result = parseRepoUrl('git+https://github.com/facebook/react.git');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('should return null for invalid URL', () => {
    const result = parseRepoUrl('invalid');
    expect(result).toBeNull();
  });

  it('should return null for non-GitHub URL', () => {
    const result = parseRepoUrl('https://gitlab.com/owner/repo');
    expect(result).toBeNull();
  });

  it('should handle URL with trailing slash', () => {
    const result = parseRepoUrl('https://github.com/owner/repo/');
    expect(result).toBeNull();
  });
});
