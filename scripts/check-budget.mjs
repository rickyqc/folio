// Enforces the Quality bar on the built site: zero JavaScript and under 50 KB before images.
// Usage: node scripts/check-budget.mjs <dist-dir> [--allow-js] [--max-kb <n>]
// The flags are for Folio's own website, which isn't a published Folio page.
import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PAGE_BUDGET_BYTES = 50 * 1024;
const PAGE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs']);
const JS_EXTENSIONS = new Set(['.js', '.mjs']);

/** @param {string} dir */
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isFile());
}

/**
 * @param {string} distDir
 * @returns {{ pageBytes: number, jsFiles: string[], errors: string[] }}
 */
export function checkBudget(distDir, { allowJs = false, maxBytes = PAGE_BUDGET_BYTES } = {}) {
  const files = listFiles(distDir);
  const pageFiles = files.filter((f) => PAGE_EXTENSIONS.has(extname(f)));
  const pageBytes = pageFiles.reduce((sum, f) => sum + statSync(f).size, 0);
  const jsFiles = files
    .filter((f) => JS_EXTENSIONS.has(extname(f)))
    .map((f) => relative(distDir, f));

  const errors = [];
  if (jsFiles.length > 0 && !allowJs) {
    errors.push(
      `Found JavaScript in the published page (${jsFiles.join(', ')}). Folio ships 0 KB JS unless an enabled feature needs it.`,
    );
  }
  if (pageBytes > maxBytes) {
    errors.push(
      `Page weighs ${(pageBytes / 1024).toFixed(1)} KB before images; the budget is ${maxBytes / 1024} KB.`,
    );
  }
  return { pageBytes, jsFiles, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const distDir =
    args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--max-kb') ?? 'dist';
  const allowJs = args.includes('--allow-js');
  const maxKb = args.includes('--max-kb') ? Number(args[args.indexOf('--max-kb') + 1]) : undefined;
  const { pageBytes, jsFiles, errors } = checkBudget(distDir, {
    allowJs,
    ...(maxKb && { maxBytes: maxKb * 1024 }),
  });
  if (errors.length > 0) {
    for (const error of errors) console.error(`✗ ${error}`);
    process.exit(1);
  }
  const js = jsFiles.length ? `${jsFiles.length} script file(s)` : '0 KB JavaScript';
  console.log(`✓ ${(pageBytes / 1024).toFixed(1)} KB before images, ${js}.`);
}
