import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_VERSION, REPO_URL, getBuildInfo } from './buildInfo';

describe('getBuildInfo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports dev when no deploy SHA is baked in', () => {
    vi.stubEnv('NEXT_PUBLIC_GIT_COMMIT_SHA', '');
    vi.stubEnv('NEXT_PUBLIC_GIT_COMMIT_REF', '');
    const info = getBuildInfo();
    expect(info.version).toBe(APP_VERSION);
    expect(info.shortSha).toBe('dev');
    expect(info.isProductionBuild).toBe(false);
    expect(info.commitUrl).toBe(REPO_URL);
  });

  it('shortens a full SHA and links to the GitHub commit', () => {
    const sha = '150bdb0abcdef0123456789abcdef0123456789a';
    vi.stubEnv('NEXT_PUBLIC_GIT_COMMIT_SHA', sha);
    vi.stubEnv('NEXT_PUBLIC_GIT_COMMIT_REF', 'main');
    const info = getBuildInfo();
    expect(info.shortSha).toBe('150bdb0');
    expect(info.ref).toBe('main');
    expect(info.isProductionBuild).toBe(true);
    expect(info.commitUrl).toBe(`${REPO_URL}/commit/${sha}`);
  });
});
