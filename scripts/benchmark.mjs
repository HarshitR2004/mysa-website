import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { launch } from './browser.mjs';
const origin = process.env.STUDY_ORIGIN || 'http://127.0.0.1:4321';
const count = Number(process.env.RUNS) || 5;
const filter = process.env.BENCH_VARIANT;
const variants = [
  { key: 'reference', url: origin + '/reference/' },
  { key: 'improved', url: origin + '/' },
  { key: 'live', url: 'https://www.mysa.io/' },
].filter((v) => !filter || v.key === filter);
await fs.mkdir('reports/performance', { recursive: true });
const chromePath =
  process.env.CHROME_PATH ||
  `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1248/chrome-win64/chrome.exe`;
const results = [];
const valid = (lhr) =>
  !!lhr &&
  !lhr.runtimeError &&
  [
    'first-contentful-paint',
    'largest-contentful-paint',
    'total-blocking-time',
    'cumulative-layout-shift',
  ].every(
    (key) =>
      typeof lhr.audits?.[key]?.numericValue === 'number' &&
      lhr.audits[key].scoreDisplayMode !== 'error',
  );
for (const variant of process.env.SKIP_AUDITS ? [] : variants) {
  for (let run = 1; run <= count; run++) {
    const report = `reports/performance/${variant.key}-${run}.json`;
    let lhr;
    const existing = await fs.readFile(report, 'utf8').catch(() => null);
    if (existing) lhr = JSON.parse(existing);
    for (let attempt = 1; !valid(lhr) && attempt <= 3; attempt++) {
      if (lhr) await fs.rename(report, report.replace('.json', `-invalid-${Date.now()}.json`));
      try {
        console.log('START', variant.key, run, new Date().toISOString());
        await new Promise((resolve, reject) => {
          const worker = spawn(
            process.execPath,
            ['scripts/lighthouse-worker.mjs', variant.url, report, chromePath],
            { stdio: 'inherit' },
          );
          worker.on('exit', (code) =>
            code === 0 ? resolve() : reject(new Error(`Audit worker exited ${code}`)),
          );
          worker.on('error', reject);
        });
        lhr = JSON.parse(await fs.readFile(report, 'utf8'));
      } catch (e) {
        lhr = { runtimeError: { message: String(e) } };
        await fs.writeFile(report, JSON.stringify(lhr, null, 2));
      }
    }
    const a = lhr.audits || {};
    const metrics = {
      variant: variant.key,
      run,
      score:
        lhr.categories?.performance?.score !== undefined
          ? Math.round(lhr.categories.performance.score * 100)
          : null,
      fcp: a['first-contentful-paint']?.numericValue,
      lcp: a['largest-contentful-paint']?.numericValue,
      tbt: a['total-blocking-time']?.numericValue,
      cls: a['cumulative-layout-shift']?.numericValue,
      bytes: a['total-byte-weight']?.numericValue,
      mainThread: a['mainthread-work-breakdown']?.numericValue,
      dom: a['dom-size-insight']?.details?.debugData?.totalElements,
      error:
        lhr.runtimeError ||
        (!valid(lhr)
          ? { message: 'Incomplete Lighthouse core metrics; see audit errors in raw report.' }
          : undefined),
    };
    results.push(metrics);
    console.log('RESULT', JSON.stringify(metrics));
    await fs.writeFile('reports/performance/runs.json', JSON.stringify(results, null, 2));
  }
}
// Separate network observations: a fixed 10-second initial window, then a full scroll.
for (const variant of variants) {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const requests = new Map(),
    errors = [];
  let total = 0;
  cdp.on('Network.responseReceived', (e) =>
    requests.set(e.requestId, { url: e.response.url, mime: e.response.mimeType }),
  );
  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId);
    if (r) {
      r.bytes = e.encodedDataLength;
      total += e.encodedDataLength;
    }
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__study = { shifts: [], longTasks: [] };
    new PerformanceObserver((l) =>
      l.getEntries().forEach((e) => {
        if (!e.hadRecentInput) window.__study.shifts.push({ time: e.startTime, value: e.value });
      }),
    ).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) =>
      l
        .getEntries()
        .forEach((e) => window.__study.longTasks.push({ time: e.startTime, duration: e.duration })),
    ).observe({ type: 'longtask', buffered: true });
  });
  try {
    await page.goto(variant.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000);
    const initial = { bytes: total, requests: requests.size, dom: await page.locator('*').count() };
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    const browserData = await page.evaluate(() => ({
      nav: performance.getEntriesByType('navigation')[0].toJSON(),
      ...window.__study,
    }));
    await fs.writeFile(
      `reports/performance/${variant.key}-network.json`,
      JSON.stringify(
        {
          initial,
          afterScroll: { bytes: total, requests: requests.size },
          resources: [...requests.values()].sort((a, b) => (b.bytes || 0) - (a.bytes || 0)),
          errors,
          ...browserData,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await fs.writeFile(
      `reports/performance/${variant.key}-network.json`,
      JSON.stringify({ error: String(e), errors }, null, 2),
    );
  }
  await browser.close();
}
if (process.env.SKIP_AUDITS) {
  for (const variant of variants)
    for (let run = 1; run <= count; run++) {
      const text = await fs
        .readFile(`reports/performance/${variant.key}-${run}.json`, 'utf8')
        .catch(() => null);
      if (!text) continue;
      const d = JSON.parse(text),
        a = d.audits || {};
      results.push({
        variant: variant.key,
        run,
        score: Math.round((d.categories?.performance?.score || 0) * 100),
        fcp: a['first-contentful-paint']?.numericValue,
        lcp: a['largest-contentful-paint']?.numericValue,
        tbt: a['total-blocking-time']?.numericValue,
        cls: a['cumulative-layout-shift']?.numericValue,
        bytes: a['total-byte-weight']?.numericValue,
        mainThread: a['mainthread-work-breakdown']?.numericValue,
        dom: a['dom-size-insight']?.details?.debugData?.totalElements,
        error: valid(d) ? undefined : { message: 'Incomplete core metrics — excluded' },
      });
    }
  await fs.writeFile('reports/performance/runs.json', JSON.stringify(results, null, 2));
}
const summary = {
  date: new Date().toISOString(),
  requestedRuns: count,
  viewport: '1440×900',
  lighthouseVersion: (await import('lighthouse/package.json', { with: { type: 'json' } })).default
    .version,
  node: process.version,
  method:
    'Sequential desktop Lighthouse simulated throttling. Requested five fresh Chrome processes per variant; actual valid counts below. Local pair uses the same gzip server and CSP; live has different hosting/integrations. Two reference traces lacked LCP metrics, and the original long-lived audit runner exhausted its memory on the last live run. Extended retries were stopped at the user’s request; future runs use isolated Node workers. Network observations are separate unthrottled 10-second/scroll sessions.',
  variants: {},
};
for (const key of [...new Set(results.map((r) => r.variant))]) {
  const rows = results.filter((r) => r.variant === key && !r.error);
  summary.variants[key] = { validRuns: rows.length };
  for (const metric of ['score', 'fcp', 'lcp', 'tbt', 'cls', 'bytes', 'mainThread', 'dom']) {
    const values = rows
      .map((r) => r[metric])
      .filter((v) => typeof v === 'number')
      .sort((a, b) => a - b);
    if (values.length)
      summary.variants[key][metric] = {
        median:
          values.length % 2
            ? values[Math.floor(values.length / 2)]
            : (values[values.length / 2 - 1] + values[values.length / 2]) / 2,
        min: values[0],
        max: values.at(-1),
      };
  }
}
await fs.writeFile('reports/performance/summary.json', JSON.stringify(summary, null, 2));
console.log('COMPLETE', JSON.stringify(summary));
