import { expect, test, type Page } from '@playwright/test';

// Keep runs deterministic and offline: only our own server is reachable. The sample page's
// YouTube and Spotify players are third-party, so they're blocked here (and checked by URL).
test.beforeEach(async ({ page }) => {
  await page.route(/^(?!http:\/\/localhost:4400\/)/, (route) => route.abort());
});

/** Collects console errors and any JavaScript files the page requests. */
function watch(page: Page) {
  const errors: string[] = [];
  const scripts: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()));
  return { errors, scripts };
}

const ownErrors = (errors: string[]) => errors.filter((e) => !e.includes('net::ERR_FAILED'));

test.describe('sample page', () => {
  test('renders the profile, links and sections from the config', async ({ page }) => {
    const { errors, scripts } = watch(page);
    await page.goto('/sample/');

    await expect(page).toHaveTitle('Jane Park');
    await expect(page.getByRole('heading', { level: 1, name: 'Jane Park' })).toBeVisible();
    await expect(page.getByText('San Francisco, CA')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Jane Park' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Social profiles' }).getByRole('link')).toHaveCount(
      4,
    );
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Work', 'Watch and listen']);

    const portfolio = page.getByRole('link', { name: /Portfolio/ });
    await expect(portfolio).toHaveAttribute('href', 'https://example.com/work');
    await expect(portfolio).toHaveAttribute('target', '_blank');
    await expect(portfolio).toHaveAttribute('rel', /noopener/);

    expect(scripts).toEqual([]);
    expect(await page.locator('script').count()).toBe(0);
    expect(ownErrors(errors)).toEqual([]);
  });

  test('loads YouTube (no-cookie) and Spotify players with the page', async ({ page }) => {
    await page.goto('/sample/');
    const frames = page.locator('iframe');
    await expect(frames).toHaveCount(2);
    await expect(frames.nth(0)).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/,
    );
    await expect(frames.nth(1)).toHaveAttribute(
      'src',
      /^https:\/\/open\.spotify\.com\/embed\/playlist\//,
    );
    await expect(frames.nth(0)).toHaveAttribute('title', 'Big Buck Bunny');
  });

  for (const [scheme, background] of [
    ['light', 'rgb(251, 251, 253)'],
    ['dark', 'rgb(0, 0, 0)'],
  ] as const) {
    test(`auto theme follows a ${scheme} device`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/sample/');
      await expect(page.locator('body')).toHaveCSS('background-color', background);
    });
  }

  test('is fully usable from the keyboard with a visible focus ring', async ({ page }) => {
    await page.goto('/sample/');
    await page.keyboard.press('Tab');
    const first = page.locator(':focus');
    await expect(first).toHaveAttribute('href', 'https://instagram.com/');
    await expect(first).toHaveCSS('outline-style', 'solid');
  });

  test('turns off motion for people who ask for less', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/sample/');
    await expect(page.locator('.enter').first()).toHaveCSS('animation-name', 'none');
  });

  test('fits a small phone without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/sample/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('serves the contact card', async ({ request }) => {
    const card = await (await request.get('/sample/contact.vcf')).text();
    expect(card).toContain('FN:Jane Park');
  });
});

test.describe('every option switched on', () => {
  test('applies the dark theme, pill buttons and readable text on a light accent', async ({
    page,
  }) => {
    await page.goto('/full/');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    const featured = page.getByRole('link', { name: /Shop the spring batch/ });
    await expect(featured).toHaveCSS('background-color', 'rgb(255, 214, 10)');
    await expect(featured).toHaveCSS('color', 'rgb(29, 29, 31)');
    await expect(featured).toHaveCSS('border-radius', /^(999px|9\d\dpx)$/);
  });

  test('loads embeds only when tapped', async ({ page }) => {
    await page.goto('/full/');
    const frame = page.locator('iframe');
    await expect(frame).not.toHaveAttribute('src', /.+/);
    await expect(frame).toHaveAttribute('srcdoc', /Tap to load from YouTube/);
    await expect(frame).toHaveAttribute(
      'srcdoc',
      /youtube-nocookie\.com\/embed\/aqz-KE-bpKQ\?autoplay=1/,
    );
  });

  test('shows an image card with alt text and a caption', async ({ page }) => {
    await page.goto('/full/');
    await expect(page.getByRole('img', { name: 'Sam in the studio' })).toBeVisible();
    await expect(page.getByText('In the studio')).toBeVisible();
  });

  test('Share copies the page link where there is no share sheet', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'http://localhost:4400',
    });
    await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }));
    await page.goto('/full/');
    // Located by attribute: the button's name changes to "Link copied" after the click.
    const share = page.locator('button[data-share]');
    await expect(share).toHaveAccessibleName('Share');
    await share.click();
    await expect(share).toHaveAccessibleName('Link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'http://localhost:4400/full/',
    );
  });

  test('Share opens the share sheet where there is one', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        value: (data: ShareData) => {
          (window as unknown as { shared: ShareData }).shared = data;
          return Promise.resolve();
        },
      });
    });
    await page.goto('/full/');
    await page.getByRole('button', { name: 'Share' }).click();
    const shared = await page.evaluate(() => (window as unknown as { shared: ShareData }).shared);
    expect(shared).toEqual({ title: 'Sam Rivera · Ceramics', url: 'http://localhost:4400/full/' });
  });

  test('publishes the share card and QR codes', async ({ page, request }) => {
    await page.goto('/full/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'http://localhost:4400/full/og.png',
    );
    for (const file of ['og.png', 'qr.png', 'qr.svg']) {
      expect((await request.get(`/full/${file}`)).status(), file).toBe(200);
    }
  });

  test('hides the credit when turned off', async ({ page }) => {
    await page.goto('/full/');
    await expect(page.getByText('Made with Folio')).toHaveCount(0);
  });
});

// Screenshots for review, saved as a CI artifact: each theme at phone and desktop widths.
test.describe('screenshots', () => {
  for (const [name, path] of [
    ['sample', '/sample/'],
    ['full', '/full/'],
  ] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      for (const [device, width] of [
        ['phone', 390],
        ['desktop', 1280],
      ] as const) {
        test(`${name} ${scheme} ${device}`, async ({ page }) => {
          await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
          await page.setViewportSize({ width, height: 900 });
          await page.goto(path);
          await page.screenshot({
            path: `test-results/screenshots/${name}-${scheme}-${device}.png`,
            fullPage: true,
          });
        });
      }
    }
  }
});
