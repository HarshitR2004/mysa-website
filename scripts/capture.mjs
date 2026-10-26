import fs from 'node:fs/promises';
import { launch, blockedHosts } from './browser.mjs';
const routes = JSON.parse(await fs.readFile('src/data/routes.json', 'utf8'));
const browser = await launch();
const context = await browser.newContext();
await context.route('**/*', (route) =>
  blockedHosts.test(new URL(route.request().url()).hostname) ? route.abort() : route.continue(),
);
const results = [];
for (const item of routes) {
  const page = await context.newPage();
  const directory = `reference/screenshots/${item.key}`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`https://www.mysa.io${item.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1800);
    const styles = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyClass: document.body.className,
      sections: [...document.body.children]
        .filter((e) => e.tagName !== 'SCRIPT')
        .map((e) => ({ tag: e.tagName, class: e.className })),
      samples: [...document.querySelectorAll('h1,h2,p,.navbar_component')].slice(0, 35).map((e) => {
        const c = getComputedStyle(e);
        return {
          tag: e.tagName,
          class: e.className,
          text: e.textContent?.slice(0, 180),
          font: c.fontFamily,
          size: c.fontSize,
          weight: c.fontWeight,
          lineHeight: c.lineHeight,
          color: c.color,
          background: c.backgroundColor,
          width: e.getBoundingClientRect().width,
        };
      }),
    }));
    await fs.writeFile(`${directory}/computed.json`, JSON.stringify(styles, null, 2));
    // Scroll through to trigger native lazy images before the full-page capture.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 850) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      scrollTo(0, 0);
    });
    for (const width of [1440, 390, 768, 1920]) {
      if (await fs.stat(`${directory}/${width}.png`).catch(() => false)) continue;
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${directory}/${width}.png`, fullPage: true, timeout: 30000 });
    }
    results.push({ path: item.path, status: 'captured' });
  } catch (e) {
    results.push({ path: item.path, status: 'failed', error: String(e) });
  }
  await page.close();
  await fs.writeFile('reference/screenshots/status.json', JSON.stringify(results, null, 2));
  console.log(item.path, results.at(-1).status);
}
await browser.close();
