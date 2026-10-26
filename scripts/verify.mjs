import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { launch } from './browser.mjs';
const origin = process.env.STUDY_ORIGIN || 'http://127.0.0.1:4321';
const routes = JSON.parse(await fs.readFile('src/data/routes.json', 'utf8'));
const selected = process.env.VERIFY_ROUTES
  ? routes.filter((r) => process.env.VERIFY_ROUTES.split(',').includes(r.path))
  : routes;
await fs.mkdir('reports/screenshots', { recursive: true });
const browser = await launch();
const results = process.env.VERIFY_ROUTES
  ? JSON.parse(await fs.readFile('reports/route-verification.json', 'utf8')).filter(
      (r) => !selected.some((s) => s.path === r.path),
    )
  : [];
for (const route of selected) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [],
    badResponses = [],
    external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status() });
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) external.push(r.url());
  });
  try {
    const response = await page.goto(origin + route.path, { waitUntil: 'load', timeout: 45000 });
    assert.equal(response.status(), 200);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
      scrollTo(0, 0);
      document.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
      await Promise.race([
        Promise.allSettled([...document.images].map((img) => img.decode())),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
    });
    await page.waitForTimeout(200);
    const details = await page.evaluate(() => ({
      title: document.title,
      robots: document.querySelector('meta[name=robots]')?.getAttribute('content'),
      dom: document.querySelectorAll('*').length,
      brokenImages: [...document.images]
        .filter(
          (e) =>
            e.complete && !e.naturalWidth && e.getAttribute('src') && e.getClientRects().length > 0,
        )
        .map((e) => e.getAttribute('src')),
      internalLinks: [
        ...new Set(
          [...document.querySelectorAll('a[href^="/"]')].map(
            (e) => e.getAttribute('href').split(/[?#]/)[0],
          ),
        ),
      ],
      headings: [...document.querySelectorAll('h1')].map((e) => e.textContent),
    }));
    const widths = [];
    for (const width of [1440, 390, 768, 1920, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      widths.push(
        await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        })),
      );
      if (width !== 320)
        await page.screenshot({
          path: `reports/screenshots/${route.key}-${width}.png`,
          fullPage: true,
        });
    }
    const invalidLinks = details.internalLinks.filter(
      (p) => p && !routes.some((r) => r.path === p) && p !== '/project-info',
    );
    results.push({
      path: route.path,
      ...details,
      widths,
      errors,
      badResponses,
      external,
      invalidLinks,
      status:
        !errors.length &&
        !badResponses.length &&
        !external.length &&
        !invalidLinks.length &&
        !details.brokenImages.length &&
        widths.every((w) => w.document <= w.viewport + 1)
          ? 'pass'
          : 'review',
    });
  } catch (e) {
    results.push({
      path: route.path,
      status: 'failed',
      error: String(e),
      errors,
      badResponses,
      external,
    });
  }
  await context.close();
  await fs.writeFile('reports/route-verification.json', JSON.stringify(results, null, 2));
  console.log(
    route.path,
    results.at(-1).status,
    JSON.stringify({ errors: errors.length, bad: badResponses.length, external: external.length }),
  );
}
// Exercise core interactions separately from the route render sweep.
const checks = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, status: 'pass' });
  } catch (e) {
    checks.push({ name, status: 'failed', error: String(e) });
  }
}
await check('Desktop dropdown opens on hover, closes on Escape', async () => {
  await page.goto(origin);
  const t = page.locator('.w-dropdown-toggle').first();
  await t.hover();
  assert.equal(await t.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await t.getAttribute('aria-expanded'), 'false');
});
await check('Mobile navigation opens by keyboard', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  const button = page.locator('.w-nav-button').first();
  await button.focus();
  await page.keyboard.press('Enter');
  assert.equal(await button.getAttribute('aria-expanded'), 'true');
  assert.ok(await page.locator('.study-nav-open').isVisible());
  await page.keyboard.press('Escape');
});
await check('Demo modal traps focus, closes with Escape, restores trigger', async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const trigger = page.locator('.hero-v5-demo-btn');
  await page.locator('#hero-work-email').fill('student@example.com');
  await trigger.click();
  const modal = page.locator('.prototype-modal');
  assert.ok(await modal.isVisible());
  await page.keyboard.press('Escape');
  assert.ok(await modal.isHidden());
  assert.ok(await trigger.evaluate((e) => e === document.activeElement));
});
await check('Booking form validates and submits locally', async () => {
  await page.goto(origin + '/book-a-demo');
  const form = page.locator('form').first();
  await form.locator('input').evaluateAll((inputs) =>
    inputs.forEach((input) => {
      if (input.type === 'hidden' || input.type === 'submit') return;
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = true;
        return;
      }
      input.value =
        input.type === 'email'
          ? 'student@example.com'
          : input.type === 'tel'
            ? '9999999999'
            : input.placeholder?.toLowerCase().includes('phone')
              ? '9999999999'
              : 'Prototype Student';
    }),
  );
  await form.evaluate((f) => f.requestSubmit());
  await page.waitForTimeout(100);
  assert.match(await form.locator('.prototype-status').textContent(), /not been sent or saved/);
});
await check('Reduced motion leaves background videos paused', async () => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(origin);
  await page.waitForTimeout(500);
  assert.ok(await page.locator('video').evaluateAll((videos) => videos.every((v) => v.paused)));
});
await check('200% zoom equivalent reflow at 720 CSS pixels', async () => {
  await page.setViewportSize({ width: 720, height: 450 });
  await page.goto(origin);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
});
await check('FAQ expands and collapses with keyboard', async () => {
  await page.goto(origin + '/accounts-payable');
  const q = page.locator('.faqv2_question,.faqv2_question-2').first();
  await q.focus();
  assert.equal(await q.getAttribute('aria-expanded'), 'false');
  await page.keyboard.press('Enter');
  assert.equal(await q.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Space');
  assert.equal(await q.getAttribute('aria-expanded'), 'false');
});
await check('Capability carousel next control moves the track', async () => {
  await page.goto(origin);
  const control = page.locator('.capabilities-nav-btn:not(.left)').first();
  await control.scrollIntoViewIfNeeded();
  const track = page.locator('.capabilities-track-1').first();
  const initial = await track.getAttribute('style');
  await control.click();
  await page.waitForTimeout(700);
  assert.notEqual(await track.getAttribute('style'), initial);
});
await check('Blog pagination uses local frozen content', async () => {
  await page.goto(origin + '/blogs');
  await page.waitForResponse((r) => r.url().endsWith('/content/blogs.json')).catch(() => null);
  const list = page.locator('.blogs-collection-list-wrapper > .w-dyn-items');
  const first = await list.textContent();
  await page.locator('.blogs-collection-list-wrapper .w-pagination-next').click();
  assert.notEqual(await list.textContent(), first);
});
await check('Glossary search filters terms', async () => {
  await page.goto(origin + '/glossary');
  await page.waitForTimeout(300);
  const search = page.locator('input[fs-cmsfilter-field="name"]');
  await search.fill('zzzz-no-such-term');
  assert.equal(await page.locator('.tr-list > .w-dyn-item:visible').count(), 0);
});
await check('Glossary alphabet filter uses category metadata', async () => {
  await page.goto(origin + '/glossary');
  await page.waitForTimeout(300);
  const label = page.locator('.formblock label').filter({ hasText: /^B$/ }).first();
  await label.click();
  assert.ok(
    await page
      .locator('.tr-list > .w-dyn-item:visible')
      .evaluateAll((items) =>
        items.every((item) => item.querySelector('.tr-category')?.textContent?.trim() === 'B'),
      ),
  );
});
await page.close();
await browser.close();
await fs.writeFile('reports/interaction-verification.json', JSON.stringify(checks, null, 2));
console.log('INTERACTIONS', JSON.stringify(checks));
console.log(
  'SUMMARY',
  JSON.stringify({
    pages: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    review: results.filter((r) => r.status !== 'pass').length,
    checks: checks.length,
    checksPassed: checks.filter((c) => c.status === 'pass').length,
  }),
);
if (results.some((r) => r.status !== 'pass') || checks.some((c) => c.status !== 'pass'))
  process.exitCode = 1;
