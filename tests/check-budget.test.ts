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

  it('does not count images toward the budget', () => {
    writeFileSync(join(dist, 'index.html'), '<h1>Hi</h1>');
    writeFileSync(join(dist, 'avatar.jpg'), Buffer.alloc(PAGE_BUDGET_BYTES * 2));
    expect(checkBudget(dist).errors).toEqual([]);
  });
});
