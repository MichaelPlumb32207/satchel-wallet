/**
 * Deploy / source transparency — public, non-secret build metadata.
 * Commit SHA is injected at build time from Vercel (see next.config.ts).
 */

/** Keep in sync with package.json "version". */
export const APP_VERSION = '0.2.0';

export const REPO_URL = 'https://github.com/MichaelPlumb32207/satchel-wallet';

export interface BuildInfo {
  version: string;
  /** Full 40-char SHA when built on Vercel; empty in local dev. */
  sha: string;
  /** First 7 chars, or "dev" when no SHA was baked in. */
  shortSha: string;
  /** Branch/ref when known (e.g. "main"). */
  ref: string;
  repoUrl: string;
  /** Deep link to this exact commit on GitHub, or the repo root if unknown. */
  commitUrl: string;
  isProductionBuild: boolean;
}

export function getBuildInfo(): BuildInfo {
  const sha = (process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ?? '').trim();
  const ref = (process.env.NEXT_PUBLIC_GIT_COMMIT_REF ?? '').trim();
  return {
    version: APP_VERSION,
    sha,
    shortSha: sha ? sha.slice(0, 7) : 'dev',
    ref,
    repoUrl: REPO_URL,
    commitUrl: sha ? `${REPO_URL}/commit/${sha}` : REPO_URL,
    isProductionBuild: sha.length > 0,
  };
}
