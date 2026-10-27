// @ts-check
import { defineConfig } from 'astro/config';
import { CONFIG_FILE, loadConfig } from './src/config/load.ts';
import { FolioConfigError } from './src/config/errors.ts';

/**
 * Checks folio.config.yaml before anything builds, so a mistake prints one friendly
 * message instead of a stack trace. In dev, saving the config reloads the page.
 * @returns {import('astro').AstroIntegration}
 */
function folio() {
  return {
    name: 'folio',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        if (command === 'build') {
          try {
            loadConfig();
          } catch (error) {
            if (!(error instanceof FolioConfigError)) throw error;
            console.error(`\n\u001b[31m✗\u001b[0m ${error.message}\n`);
            process.exit(1);
          }
        }
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'folio-config-reload',
                configureServer(server) {
                  server.watcher.add(CONFIG_FILE);
                  server.watcher.on('change', (file) => {
                    if (file.endsWith(CONFIG_FILE)) server.ws.send({ type: 'full-reload' });
                  });
                },
              },
            ],
          },
        });
      },
    },
  };
}

export default defineConfig({
  output: 'static',
  integrations: [folio()],
  build: {
    // Inline all CSS so the page is a single request (see Quality bar: under 50 KB).
    inlineStylesheets: 'always',
  },
});
