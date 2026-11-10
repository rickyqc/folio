import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PAGE_BUDGET_BYTES, checkBudget } from '../scripts/check-budget.mjs';

describe('checkBudget', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), 'folio-dist-'));
  });

  afterEach(() => {
    rmSync(dist, { recursive: true, force: true });
  });

  it('passes a small page with no JavaScript', () => {
    writeFileSync(join(dist, 'index.html'), '<h1>Hi</h1>');
    expect(checkBudget(dist).errors).toEqual([]);
  });

  it('fails when any JavaScript is published, including in subfolders', () => {
    mkdirSync(join(dist, '_astro'));
    writeFileSync(join(dist, 'index.html'), '<h1>Hi</h1>');
    writeFileSync(join(dist, '_astro', 'island.js'), 'console.log(1)');
    const result = checkBudget(dist);
    expect(result.jsFiles).toEqual([join('_astro', 'island.js')]);
    expect(result.errors[0]).toMatch(/JavaScript/);
  });

  it('fails when HTML and CSS exceed the page budget', () => {
    writeFileSync(join(dist, 'index.html'), 'x'.repeat(PAGE_BUDGET_BYTES + 1));
    expect(checkBudget(dist).errors[0]).toMatch(/budget is 50 KB/);
  });

  it('lets Folio’s own website opt in to scripts and a larger budget', () => {
    writeFileSync(join(dist, 'index.html'), 'x'.repeat(PAGE_BUDGET_BYTES + 1));
    writeFileSync(join(dist, 'app.js'), 'console.log(1)');
    expect(checkBudget(dist, { allowJs: true, maxBytes: 100 * 1024 }).errors).toEqual([]);
  });

  it('does not count images toward the budget', () => {
    writeFileSync(join(dist, 'index.html'), '<h1>Hi</h1>');
    writeFileSync(join(dist, 'avatar.jpg'), Buffer.alloc(PAGE_BUDGET_BYTES * 2));
    expect(checkBudget(dist).errors).toEqual([]);
  });

  it('can weigh each page with the scripts it loads, instead of the whole folder', () => {
    mkdirSync(join(dist, 'build'));
    mkdirSync(join(dist, '_astro'));
    writeFileSync(join(dist, '_astro', 'builder.js'), 'x'.repeat(30 * 1024));
    writeFileSync(join(dist, 'index.html'), 'x'.repeat(40 * 1024));
    writeFileSync(
      join(dist, 'build', 'index.html'),
      `<script src="/_astro/builder.js"></script>${'x'.repeat(30 * 1024)}`,
    );
    const options = { allowJs: true, maxBytes: 50 * 1024 };
    expect(checkBudget(dist, options).errors).toHaveLength(1);
    const perPage = checkBudget(dist, { ...options, perPage: true });
    expect(perPage.errors).toHaveLength(1);
    expect(perPage.heaviest).toBe(join('build', 'index.html'));
    expect(perPage.errors[0]).toMatch(/^build\/index\.html weighs 60\.\d KB/);
    writeFileSync(join(dist, '_astro', 'builder.js'), 'x');
    expect(checkBudget(dist, { ...options, perPage: true }).errors).toEqual([]);
  });
});
