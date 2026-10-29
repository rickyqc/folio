// Folio's own addresses, and the "make it yours" links a new owner needs.

export const FOLIO_SITE = 'https://folio-rouge-kappa-88.vercel.app';
export const BUILDER_URL = `${FOLIO_SITE}/#build`;
export const GUIDE_URL = 'https://github.com/rickyqc/folio/blob/main/docs/GETTING_STARTED.md';
export const FOLIO_REPO = 'rickyqc/folio';

/** The name in the sample config. While a page still has it, the owner hasn't started editing. */
export const SAMPLE_NAME = 'Jane Park';

export interface SetupInfo {
  /** Opens folio.config.yaml in GitHub's editor, when the host says which repo built the page. */
  editUrl?: string;
}

/** The owner/repo and branch this page was built from, as reported by the host. */
export function sourceRepo(env: NodeJS.ProcessEnv): { repo: string; branch: string } | undefined {
  if (env['VERCEL_GIT_REPO_OWNER'] && env['VERCEL_GIT_REPO_SLUG']) {
    return {
      repo: `${env['VERCEL_GIT_REPO_OWNER']}/${env['VERCEL_GIT_REPO_SLUG']}`,
      branch: env['VERCEL_GIT_COMMIT_REF'] || 'main',
    };
  }
  const netlify =
    env['NETLIFY'] === 'true' && env['REPOSITORY_URL']?.match(/github\.com[/:]([^/]+\/[^/.]+)/);
  if (netlify && netlify[1]) return { repo: netlify[1], branch: env['BRANCH'] || 'main' };
  if (env['GITHUB_REPOSITORY']) {
    return { repo: env['GITHUB_REPOSITORY'], branch: env['GITHUB_REF_NAME'] || 'main' };
  }
  return undefined;
}

/**
 * Whether to show the "your page is live, make it yours" note, and where it should link.
 * Shown only while the page still has the sample name, never on Folio's own demo, and never
 * when FOLIO_SETUP_BANNER=0.
 */
export function setupInfo(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): SetupInfo | undefined {
  if (name.trim() !== SAMPLE_NAME || env['FOLIO_SETUP_BANNER'] === '0') return undefined;
  const source = sourceRepo(env);
  if (source?.repo.toLowerCase() === FOLIO_REPO) return undefined;
  return source
    ? { editUrl: `https://github.com/${source.repo}/edit/${source.branch}/folio.config.yaml` }
    : {};
}
