// Exercises the validation / TXT-export logic from the spec's 7 test cases.
// Bundles the real source modules with esbuild so the checked code is the
// same code Chrome runs. Run with: node scripts/verify-logic.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const bundle = await build({
  entryPoints: [resolve(ROOT, 'scripts/logic-entry.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
});

const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
const {
  canSave,
  buildTxt,
  buildFilename,
  formatTimestamp,
  normalizeSelection,
  buildLeadRow,
  toIsoWithOffset,
  isConfigured,
  DEFAULT_SETTINGS,
} = mod;

const session = (fields) => ({ active: true, source: 'WhatsApp', ...fields });
const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push(['PASS', name]);
  } catch (error) {
    results.push(['FAIL', `${name} :: ${error.message}`]);
  }
};

check('Test 1 - Name + Number => STOP enabled', () => {
  assert.equal(canSave(session({ name: 'John Fernando', number: '+94 77 123 4567' })), true);
});
check('Test 2 - Name + Instagram => STOP enabled', () => {
  assert.equal(canSave(session({ name: 'John Fernando', instagramName: '@johnfernando' })), true);
});
check('Test 3 - Number only => STOP enabled', () => {
  assert.equal(canSave(session({ number: '+94 77 123 4567' })), true);
});
check('Test 4 - Instagram only => STOP enabled', () => {
  assert.equal(canSave(session({ instagramName: '@johnfernando' })), true);
});
check('Test 5 - Name only => STOP disabled', () => {
  assert.equal(canSave(session({ name: 'John Fernando' })), false);
});
check('Test 6 - nothing captured => STOP disabled', () => {
  assert.equal(canSave(session({})), false);
  assert.equal(canSave(null), false);
});
check('Test 7 - all fields => STOP enabled and all three in TXT', () => {
  const s = session({
    name: 'John Fernando',
    number: '+94 77 123 4567',
    instagramName: '@johnfernando',
    source: 'Instagram',
  });
  assert.equal(canSave(s), true);
  const txt = buildTxt(s, new Date(2026, 8, 16, 9, 45, 31));
  assert.equal(
    txt,
    'Name: John Fernando\n' +
      'Number: +94 77 123 4567\n' +
      'Instagram Name: @johnfernando\n' +
      'Source: Instagram\n' +
      'Captured At: 2026-09-16 09:45:31\n',
  );
});

check('Whitespace-only values do not unlock STOP', () => {
  assert.equal(canSave(session({ number: '   ' })), false);
  assert.equal(canSave(session({ name: 'X', instagramName: '  ' })), false);
});
check('Inactive session can never save', () => {
  assert.equal(canSave({ active: false, source: 'WhatsApp', number: '+94 77 123 4567' }), false);
});

check('TXT - missing Instagram Name', () => {
  const txt = buildTxt(
    session({ name: 'John Fernando', number: '+94 77 123 4567' }),
    new Date(2026, 8, 16, 9, 45, 31),
  );
  assert.match(txt, /^Instagram Name: Not captured$/m);
  assert.match(txt, /^Source: WhatsApp$/m);
});
check('TXT - missing Number', () => {
  const txt = buildTxt(
    session({ name: 'John Fernando', instagramName: '@johnfernando', source: 'Instagram' }),
    new Date(2026, 8, 16, 9, 45, 31),
  );
  assert.match(txt, /^Number: Not captured$/m);
});
check('TXT - missing Name is still valid output', () => {
  const txt = buildTxt(session({ number: '+94 77 123 4567' }), new Date(2026, 8, 16, 9, 45, 31));
  assert.equal(
    txt,
    'Name: Not captured\n' +
      'Number: +94 77 123 4567\n' +
      'Instagram Name: Not captured\n' +
      'Source: WhatsApp\n' +
      'Captured At: 2026-09-16 09:45:31\n',
  );
});

check('Filename format lead-YYYY-MM-DD-HH-mm-ss.txt', () => {
  assert.equal(buildFilename(new Date(2026, 8, 16, 9, 45, 31)), 'lead-2026-09-16-09-45-31.txt');
  assert.equal(buildFilename(new Date(2026, 0, 2, 3, 4, 5)), 'lead-2026-01-02-03-04-05.txt');
  assert.equal(formatTimestamp(new Date(2026, 8, 16, 9, 45, 31)), '2026-09-16 09:45:31');
});

check('Selection normalisation stays minimal', () => {
  assert.equal(normalizeSelection('name', '  John   Fernando \n'), 'John Fernando');
  assert.equal(normalizeSelection('number', ' +94 77 123 4567 '), '+94 77 123 4567');
  assert.equal(normalizeSelection('instagramName', '@johnfernando'), '@johnfernando');
  assert.equal(normalizeSelection('instagramName', 'johnfernando'), 'johnfernando');
  assert.equal(
    normalizeSelection('instagramName', 'https://www.instagram.com/johnfernando/'),
    '@johnfernando',
  );
  assert.equal(normalizeSelection('name', '   '), '');
});

check('Sheet row carries an unambiguous ISO timestamp', () => {
  const iso = toIsoWithOffset(new Date(2026, 8, 29, 13, 52, 56));
  // Local offset varies by machine; assert shape and the local wall-clock part.
  assert.match(iso, /^2026-09-29T13:52:56(Z|[+-]\d{2}:\d{2})$/);
  assert.equal(new Date(iso).getTime(), new Date(2026, 8, 29, 13, 52, 56).getTime());
});

check('Sheet row maps every field, blanks for missing', () => {
  const row = buildLeadRow(
    session({ name: 'John Fernando', instagramName: '@johnfernando', source: 'Instagram' }),
    new Date(2026, 8, 29, 13, 52, 56),
    'Reception PC',
  );
  assert.equal(row.name, 'John Fernando');
  assert.equal(row.number, '');
  assert.equal(row.instagramName, '@johnfernando');
  assert.equal(row.source, 'Instagram');
  assert.equal(row.device, 'Reception PC');
  assert.equal(row.capturedAtLocal, '2026-09-29 13:52:56');
});

check('Only a real Apps Script /exec URL counts as configured', () => {
  assert.equal(isConfigured(DEFAULT_SETTINGS), false);
  assert.equal(isConfigured({ ...DEFAULT_SETTINGS, webAppUrl: 'https://example.com/exec' }), false);
  assert.equal(
    isConfigured({ ...DEFAULT_SETTINGS, webAppUrl: 'http://script.google.com/macros/s/AK/exec' }),
    false,
  );
  assert.equal(
    isConfigured({ ...DEFAULT_SETTINGS, webAppUrl: 'https://script.google.com/macros/s/AKfy123/exec' }),
    true,
  );
});

for (const [status, name] of results) console.log(`${status}  ${name}`);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
