// Generates a stable extension identity.
//
// Chrome derives an extension ID from its public key. Without a key in the
// manifest, an unpacked extension gets an ID derived from its folder path -
// which changes per machine, so IT cannot allowlist it. This writes a private
// key (keep it safe, never commit it) and injects the matching public key into
// public/manifest.json so the ID is fixed everywhere.
import { generateKeyPairSync, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILE = resolve(ROOT, 'key.pem');
const MANIFEST = resolve(ROOT, 'public', 'manifest.json');

let privatePem;
if (existsSync(KEY_FILE)) {
  privatePem = readFileSync(KEY_FILE, 'utf8');
  console.log('[key] reusing existing key.pem');
} else {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  writeFileSync(KEY_FILE, privatePem);
  console.log('[key] wrote key.pem (private - do not commit or share)');
}

const { createPrivateKey, createPublicKey } = await import('node:crypto');
const spki = createPublicKey(createPrivateKey(privatePem)).export({ type: 'spki', format: 'der' });
const base64Key = spki.toString('base64');

// Extension ID: first 16 bytes of SHA-256(SPKI), each nibble mapped 0-f -> a-p.
const digest = createHash('sha256').update(spki).digest();
const id = [...digest.subarray(0, 16)]
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')
  .replace(/[0-9a-f]/g, (c) => 'abcdefghijklmnop'[parseInt(c, 16)]);

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
manifest.key = base64Key;
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log('[key] manifest.json updated with "key"');
console.log('\nExtension ID: ' + id + '\n');
