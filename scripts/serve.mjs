// Serves deploy/ over http://localhost:<port> with the MIME types Chrome's
// extension updater expects. Single-machine testing only: Chrome fetches the
// update manifest at startup and every few hours, so this must be running
// whenever Chrome starts, or the extension will not install/update.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(ROOT, 'deploy');
const PORT = Number(process.argv[2] ?? process.env.CRM_CAPTURE_PORT ?? 8787);

const TYPES = {
  '.crx': 'application/x-chrome-extension',
  '.xml': 'text/xml',
  '.md': 'text/markdown; charset=utf-8',
  '.reg': 'text/plain; charset=utf-8',
  '.config': 'text/xml',
};

if (!existsSync(DIR)) {
  console.error('[serve] deploy/ is missing - run "npm run deploy" first.');
  process.exit(1);
}

const server = createServer((req, res) => {
  const requested = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const name = requested === '/' ? '/index' : requested;

  // Resolve inside deploy/ only - reject anything that escapes it.
  const target = normalize(join(DIR, name));
  if (target !== DIR && !target.startsWith(DIR + sep)) {
    res.writeHead(403).end('Forbidden');
    console.log(`  403  ${requested}`);
    return;
  }

  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404).end('Not found');
    console.log(`  404  ${requested}`);
    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream',
    'Content-Length': statSync(target).size,
    'Cache-Control': 'no-cache',
  });
  createReadStream(target).pipe(res);
  console.log(`  200  ${requested}`);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[serve] ${DIR}`);
  console.log(`[serve] http://localhost:${PORT}/update.xml`);
  console.log('[serve] Leave this running while Chrome starts. Ctrl+C to stop.\n');
});
