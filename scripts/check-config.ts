// Checks folio.config.yaml and the images it names, without building the page.
// In GitHub Actions, problems also appear as notes on the right lines of the file, so an owner
// who edits on GitHub sees what broke next to their commit, not deep in a build log.
import { FolioConfigError, githubAnnotations } from '../src/config/errors.ts';
import { CONFIG_FILE, loadConfig } from '../src/config/load.ts';

try {
  loadConfig();
  console.log(`✓ ${CONFIG_FILE} looks good.`);
} catch (error) {
  if (!(error instanceof FolioConfigError)) throw error;
  console.error(`✗ ${error.message}`);
  if (process.env['GITHUB_ACTIONS'] === 'true') {
    console.log(githubAnnotations(error.problems, CONFIG_FILE));
  }
  process.exit(1);
}
