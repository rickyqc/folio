// Enforces the Quality bar on the built site: zero JavaScript and under 50 KB before images.
// Usage: node scripts/check-budget.mjs <dist-dir>
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
export function checkBudget(distDir) {
  const files = listFiles(distDir);
  const pageFiles = files.filter((f) => PAGE_EXTENSIONS.has(extname(f)));
  const pageBytes = pageFiles.reduce((sum, f) => sum + statSync(f).size, 0);
  const jsFiles = files
    .filter((f) => JS_EXTENSIONS.has(extname(f)))
    .map((f) => relative(distDir, f));

  const errors = [];
  if (jsFiles.length > 0) {
    errors.push(
      `Found JavaScript in the published page (${jsFiles.join(', ')}). Folio ships 0 KB JS unless an enabled feature needs it.`,
    );
  }
  if (pageBytes > PAGE_BUDGET_BYTES) {
    errors.push(
      `Page weighs ${(pageBytes / 1024).toFixed(1)} KB before images; the budget is ${PAGE_BUDGET_BYTES / 1024} KB.`,
    );
  }
  return { pageBytes, jsFiles, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distDir = process.argv[2] ?? 'dist';
  const { pageBytes, errors } = checkBudget(distDir);
  if (errors.length > 0) {
    for (const error of errors) console.error(`✗ ${error}`);
    process.exit(1);
  }
  console.log(`✓ ${(pageBytes / 1024).toFixed(1)} KB before images, 0 KB JavaScript.`);
}
