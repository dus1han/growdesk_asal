// Builds the unpacked extension into dist/.
//
// The service worker and the content script are bundled separately because MV3
// loads both as classic scripts - a shared-chunk ES module build would not run.
// Each Vite pass therefore emits one self-contained IIFE.
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DIST = resolve(ROOT, 'dist');

const watch = process.argv.includes('--watch');
const cleanOnly = process.argv.includes('--clean-only');

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0 || (watch && code === null)) resolvePromise();
      else rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

const vite = (configFile) =>
  run('npx', ['vite', 'build', '--config', configFile, ...(watch ? ['--watch'] : [])]);

async function copyStatic() {
  await mkdir(DIST, { recursive: true });
  await cp(resolve(ROOT, 'public'), DIST, { recursive: true });
  console.log('[build] copied manifest.json + icons into dist/');

  // Where installed copies look for updates. Defaults to the local test server; a build for
  // GrowDesk to host sets GROWDESK_UPDATE_URL=https://<growdesk>/capture/update.xml.
  const updateUrl = process.env.GROWDESK_UPDATE_URL?.trim();
  if (updateUrl) {
    const file = resolve(DIST, 'manifest.json');
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    manifest.update_url = updateUrl;
    await writeFile(file, JSON.stringify(manifest, null, 2) + '
');
    console.log(`[build] update_url -> ${updateUrl}`);
  }
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  if (cleanOnly) {
    console.log('[build] dist/ removed');
    return;
  }

  await run('node', [resolve(HERE, 'generate-icons.mjs')]);
  await copyStatic();

  if (watch) {
    console.log('[build] watching src/ - reload the extension in Chrome after each rebuild');
    await Promise.all([
      vite('vite.background.config.ts'),
      vite('vite.config.ts'),
      vite('vite.options.config.ts'),
    ]);
    return;
  }

  await vite('vite.background.config.ts');
  await vite('vite.config.ts');
  await vite('vite.options.config.ts');
  console.log(`[build] done -> ${DIST}`);
}

main().catch((error) => {
  console.error('[build] failed:', error.message);
  process.exit(1);
});
