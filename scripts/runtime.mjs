import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const supported = major > 22 || (major === 22 && (minor > 23 || (minor === 23 && patch >= 4)));
let executable = process.execPath;
if (!supported) {
  const bundled = path.join(
    os.homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'node',
    'bin',
    'node.exe',
  );
  if (process.platform === 'win32' && fs.existsSync(bundled)) executable = bundled;
  else {
    console.error('This project requires Node 24 LTS or Node >=22.23.4. See README.md.');
    process.exit(1);
  }
}
const [entry, ...args] = process.argv.slice(2);
const script =
  entry === 'astro'
    ? path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs')
    : path.resolve(root, entry);
const child = spawn(executable, [script, ...args], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
