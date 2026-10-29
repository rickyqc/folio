import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { parseConfig } from '../../src/config/load.ts';

const publicDir = resolve(import.meta.dirname, '../../public');

test.beforeEach(async ({ page, context }) => {
  await page.route(/^(?!http:\/\/localhost:4401\/)/, (route) => route.abort());
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://localhost:4401',
  });
  await page.goto('http://localhost:4401/#build');
});

test('the config builder makes a file Folio accepts, with a live preview', async ({ page }) => {
  const builder = page.locator('.builder');
  const preview = builder.locator('[data-preview]');
  const copy = builder.getByRole('button', { name: 'Copy my config' });

  // Nothing filled in yet: placeholders in the preview, and no scolding before anyone types.
  await expect(preview).toContainText('Your name');
  await expect(builder.getByText('Add your name.')).toBeHidden();
  await copy.click();
  await expect(builder.getByText('Add your name.')).toBeVisible();
  await expect(builder.getByLabel('Name', { exact: true })).toBeFocused();

  await builder.getByLabel('Name', { exact: true }).fill('Riley Chen');
  await builder.getByLabel(/One line about you/).fill('Barista: latte art & #coffee');
  await expect(preview).toContainText('Riley Chen');
  // Starts on an emoji; initials and other emoji are one tap away.
  await expect(preview.locator('.bp-avatar')).toHaveText('👩‍🎨');
  await builder.getByRole('radio', { name: 'Your initials' }).check({ force: true });
  await expect(preview.locator('.bp-avatar')).toHaveText('RC');
  await builder.getByRole('radio', { name: 'Cook 👨‍🍳' }).check({ force: true });
  await expect(preview.locator('.bp-avatar')).toHaveText('👨‍🍳');

  await builder.getByRole('radio', { name: 'Dark' }).check({ force: true });
  await builder.getByRole('radio', { name: 'Pill' }).check({ force: true });
  await builder.getByRole('radio', { name: '#ff375f' }).check({ force: true });

  await builder.getByLabel('Username or link').first().fill('@rileymakes');
  await builder.getByRole('button', { name: '+ Add an account' }).click();
  await builder.getByLabel('Username or link').nth(1).fill('riley@example.com');
  await builder.getByLabel('Platform').nth(1).selectOption('email');
  await expect(preview.locator('.bp-socials svg')).toHaveCount(2);

  const titles = builder.getByLabel('Button text');
  const links = builder.getByLabel('Link', { exact: true });
  await titles.nth(0).fill('Book a class');
  await links.nth(0).fill('example.com/book');
  await links.nth(0).blur();
  await expect(links.nth(0)).toHaveValue('https://example.com/book');
  await titles.nth(1).fill('Shop beans');
  await links.nth(1).fill('not a link');
  await links.nth(1).blur();
  await expect(builder.getByText('That doesn’t look like a web address.')).toBeVisible();
  await links.nth(1).fill('https://example.com/beans');
  await expect(builder.getByText('That doesn’t look like a web address.')).toBeHidden();

  // Highlight the second link and add a heading above it.
  await builder.getByRole('button', { name: 'Highlight this link' }).nth(1).click();
  await builder.getByRole('button', { name: '+ Add a section heading' }).click();
  await builder.getByLabel('Section heading').fill('Shop');
  await builder.getByRole('button', { name: 'Move up' }).last().click();
  await expect(preview.locator('.bp-blocks > *')).toHaveText([
    'Book a class',
    'Shop',
    'Shop beans',
  ]);
  await expect(preview.locator('.bp-link.is-featured')).toHaveText('Shop beans');
  await expect(preview).toHaveAttribute('data-mode', 'dark');

  await copy.click();
  await expect(builder.getByText(/Copied/)).toBeVisible();
  const yaml = await page.evaluate(() => navigator.clipboard.readText());

  const config = parseConfig(yaml, { publicDir });
  expect(config.profile).toMatchObject({
    name: 'Riley Chen',
    bio: 'Barista: latte art & #coffee',
    emoji: '👨‍🍳',
  });
  expect(config.theme).toEqual({ mode: 'dark', accent: '#ff375f', buttons: 'pill' });
  expect(config.socials.map((s) => s.url)).toEqual([
    'https://instagram.com/rileymakes',
    'mailto:riley@example.com',
  ]);
  expect(config.blocks).toMatchObject([
    { type: 'link', title: 'Book a class', url: 'https://example.com/book', featured: false },
    { type: 'header', title: 'Shop' },
    { type: 'link', title: 'Shop beans', featured: true },
  ]);

  // The draft survives a reload.
  await page.reload();
  await expect(builder.getByLabel('Name', { exact: true })).toHaveValue('Riley Chen');
});

test.describe('on a phone', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('the menu jumps to a section and closes', async ({ page }) => {
    await page.goto('http://localhost:4401/');
    await expect(page.locator('.nav-links')).toBeHidden();
    const menu = page.locator('.nav-menu');
    await menu.locator('summary[aria-label="Menu"]').click();
    await expect(menu.getByRole('link', { name: 'FAQ' })).toBeVisible();
    await menu.getByRole('link', { name: 'FAQ' }).click();
    await expect(page).toHaveURL(/#faq$/);
    await expect(menu).not.toHaveAttribute('open', '');
  });

  test('the builder preview opens in a sheet while filling in the form', async ({ page }) => {
    await page.goto('http://localhost:4401/');
    const fab = page.getByRole('button', { name: 'Preview' });
    await expect(fab).not.toHaveClass(/is-shown/);

    await page.getByLabel('Name', { exact: true }).scrollIntoViewIfNeeded();
    await page.getByLabel('Name', { exact: true }).fill('Riley Chen');
    // Out of the way while typing, back once the field is left.
    await expect(fab).not.toHaveClass(/is-shown/);
    await page.getByLabel('Name', { exact: true }).blur();
    await expect(fab).toHaveClass(/is-shown/);

    await fab.click();
    const sheet = page.getByRole('dialog', { name: 'Preview of your page' });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.bp-name')).toHaveText('Riley Chen');

    await sheet.getByRole('button', { name: 'Keep editing' }).click();
    await expect(sheet).toBeHidden();
    // The preview is back in its place below the form.
    await expect(page.locator('.output .preview-phone')).toHaveCount(1);
  });

  test('desktop never shows the floating button or the menu', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:4401/#build');
    await expect(page.getByRole('button', { name: 'Preview' })).toBeHidden();
    await expect(page.locator('.nav-menu')).toBeHidden();
  });
});

test('the FAQ opens and closes without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:4401/#faq');
  const faq = page.locator('.faq');
  const question = faq.getByText('Is it really free?');
  const answer = faq.getByText(/open source under the MIT license/);
  await expect(answer).toBeHidden();
  await question.click();
  await expect(answer).toBeVisible();
  await context.close();
});

test('the website screenshots', async ({ page }) => {
  for (const [scheme, width] of [
    ['light', 1280],
    ['dark', 390],
  ] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://localhost:4401/');
    await page.locator('#build').scrollIntoViewIfNeeded();
    await page
      .locator('#build')
      .screenshot({ path: `test-results/screenshots/website-builder-${scheme}.png` });
  }
});
