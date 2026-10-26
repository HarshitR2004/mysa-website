import fs from 'node:fs/promises';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
const [url, report, chromePath] = process.argv.slice(2);
const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: ['--headless', '--no-first-run', '--no-default-browser-check'],
});
try {
  const result = await lighthouse(url, {
    ...desktopConfig.settings,
    port: chrome.port,
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance'],
    screenEmulation: {
      mobile: false,
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      disabled: false,
    },
    maxWaitForLoad: 45000,
  });
  await fs.writeFile(report, JSON.stringify(result.lhr, null, 2));
} catch (e) {
  await fs.writeFile(report, JSON.stringify({ runtimeError: { message: String(e) } }));
} finally {
  await chrome.kill();
}
process.exit(0);
