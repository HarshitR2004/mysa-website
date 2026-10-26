import { chromium } from 'playwright';
import fs from 'node:fs';
export async function launch() {
  const candidates = [
    process.env.CHROME_PATH,
    `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1248/chrome-win64/chrome.exe`,
    chromium.executablePath(),
  ].filter(Boolean);
  const executablePath = candidates.find((p) => fs.existsSync(p));
  return chromium.launch({ executablePath, headless: true });
}
export const blockedHosts =
  /googletagmanager|google-analytics|googleadservices|doubleclick|clarity\.ms|factors\.ai|apollo\.io|ahrefs|leadpipe|leadsy|claydar|mdb\.tools|licdn|liadm|zapier|vercel\.app|challenges\.cloudflare|facebook|6sense|adsrvr|adnxs/;
