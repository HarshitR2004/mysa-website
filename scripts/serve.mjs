import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const root = process.cwd();
const cache = new Map();
const assets = JSON.parse(await fs.readFile('src/data/assets.json', 'utf8'));
const pages = JSON.parse(await fs.readFile('src/data/routes.json', 'utf8'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
};
const csp =
  "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com; form-action 'none'; base-uri 'self';";
export async function startServer(port = 4321) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      let file,
        reference = false;
      if (pathname.startsWith('/reference')) {
        const route = pathname.replace(/^\/reference/, '') || '/';
        const page = pages.find((p) => p.path === route);
        if (!page) throw new Error('Missing reference route');
        file = path.join(root, 'reference/local', page.key + '.html');
        reference = true;
      } else {
        const base = path.resolve(root, 'dist');
        const requested = path.resolve(base, '.' + pathname);
        if (!requested.startsWith(base + path.sep) && requested !== base)
          throw new Error('Invalid path');
        const candidates = [requested, requested + '.html', path.join(requested, 'index.html')];
        for (const c of candidates)
          if ((await fs.stat(c).catch(() => null))?.isFile()) {
            file = c;
            break;
          }
        if (!file && pathname.startsWith('/assets/')) {
          const referenceAsset = path.resolve(root, 'reference/assets', path.basename(pathname));
          if ((await fs.stat(referenceAsset).catch(() => null))?.isFile()) file = referenceAsset;
        }
        if (!file) throw new Error('Not found');
      }
      const ext = path.extname(file);
      const key = file + ':' + (await fs.stat(file)).mtimeMs;
      let payload = cache.get(key);
      if (!payload) {
        let body = await fs.readFile(file);
        // Original CSS/JS is retained separately and only rewritten for local URL resolution.
        if (file.includes(path.sep + 'assets' + path.sep) && ['.css', '.js'].includes(ext)) {
          let text = body.toString();
          for (const [url, local] of Object.entries(assets).sort(
            (a, b) => b[0].length - a[0].length,
          ))
            text = text.split(url).join(local);
          body = Buffer.from(text);
        }
        const compress = ['.html', '.css', '.js', '.mjs', '.json', '.svg'].includes(ext);
        payload = { body, gzip: compress ? gzipSync(body) : null };
        cache.set(key, payload);
      }
      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Cache-Control', 'no-cache');
      if (req.headers.range && ['.mp4', '.webm'].includes(ext)) {
        const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range);
        if (match) {
          const start = Number(match[1]),
            end = Math.min(
              match[2] ? Number(match[2]) : payload.body.length - 1,
              payload.body.length - 1,
            );
          if (start >= payload.body.length) {
            res.writeHead(416);
            res.end();
            return;
          }
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${payload.body.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
          });
          res.end(payload.body.subarray(start, end + 1));
          return;
        }
      }
      if (payload.gzip && req.headers['accept-encoding']?.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.end(payload.gzip);
      } else res.end(payload.body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/serve.mjs')) {
  await startServer(Number(process.env.PORT) || 4321);
  console.log('Production study server: http://127.0.0.1:4321 | original: /reference/');
}
