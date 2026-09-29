// Re-exports the pure logic under test for scripts/verify-logic.mjs.
export { canSave, createSession } from '../src/types/capture';
export { buildTxt, buildFilename, formatTimestamp } from '../src/utils/txtExporter';
export { normalizeSelection } from '../src/utils/normalize';
export { platformFromHostname, platformFromUrl } from '../src/utils/platform';
export { buildLeadRow, toIsoWithOffset } from '../src/utils/sheets';
export { isConfigured, DEFAULT_SETTINGS } from '../src/storage/settings';
