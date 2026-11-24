// Run hourly by .github/workflows/schedule.yml: says whether a block's from or until date has just
// started, so the page should be rebuilt. Plain Node with no packages, so the workflow skips
// npm install and stays a few seconds long.
import { appendFileSync, readFileSync } from 'node:fs';
import { scheduleDue } from '../src/lib/schedule.ts';

const file = process.env['FOLIO_CONFIG'] ?? 'folio.config.yaml';
const due = scheduleDue(readFileSync(file, 'utf8'), Date.now());

console.log(
  due
    ? `A from or until date in ${file} just started, so the page needs a rebuild.`
    : `No from or until dates in ${file} started in the last two hours.`,
);
const output = process.env['GITHUB_OUTPUT'];
if (output) appendFileSync(output, `due=${due}\n`);
