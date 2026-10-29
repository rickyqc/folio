import { describe, expect, it } from 'vitest';
import { setupInfo, sourceRepo } from '../src/lib/links.ts';

describe('sourceRepo', () => {
  it('reads Vercel, Netlify and GitHub Actions', () => {
    expect(
      sourceRepo({
        VERCEL_GIT_REPO_OWNER: 'jane',
        VERCEL_GIT_REPO_SLUG: 'my-folio',
        VERCEL_GIT_COMMIT_REF: 'main',
      }),
    ).toEqual({ repo: 'jane/my-folio', branch: 'main' });
    expect(
      sourceRepo({
        NETLIFY: 'true',
        REPOSITORY_URL: 'https://github.com/jane/my-folio',
        BRANCH: 'main',
      }),
    ).toEqual({ repo: 'jane/my-folio', branch: 'main' });
    expect(sourceRepo({ GITHUB_REPOSITORY: 'jane/my-folio', GITHUB_REF_NAME: 'main' })).toEqual({
      repo: 'jane/my-folio',
      branch: 'main',
    });
    expect(sourceRepo({})).toBeUndefined();
  });
});

describe('setupInfo', () => {
  const vercel = {
    VERCEL_GIT_REPO_OWNER: 'jane',
    VERCEL_GIT_REPO_SLUG: 'my-folio',
    VERCEL_GIT_COMMIT_REF: 'main',
  };

  it('links a fresh copy straight to its config in the GitHub editor', () => {
    expect(setupInfo('Jane Park', vercel)).toEqual({
      editUrl: 'https://github.com/jane/my-folio/edit/main/folio.config.yaml',
    });
  });

  it('still shows, with the guide, when the host is unknown', () => {
    expect(setupInfo('Jane Park', {})).toEqual({});
  });

  it('goes away once the owner changes the name', () => {
    expect(setupInfo('Riley Chen', vercel)).toBeUndefined();
  });

  it('never shows on Folio’s own demo, or when turned off', () => {
    expect(setupInfo('Jane Park', { GITHUB_REPOSITORY: 'rickyqc/folio' })).toBeUndefined();
    expect(setupInfo('Jane Park', { ...vercel, FOLIO_SETUP_BANNER: '0' })).toBeUndefined();
  });
});
