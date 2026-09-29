// Re-exports the pure logic under test for scripts/verify-logic.mjs.
export { canSave, createSession } from '../src/types/capture';
export { buildTxt, buildFilename, formatTimestamp } from '../src/utils/txtExporter';
export { normalizeSelection } from '../src/utils/normalize';
export { platformFromHostname, platformFromUrl } from '../src/utils/platform';
export { buildLead, toIsoWithOffset } from '../src/types/lead';
export { isConfigured, DEFAULT_SETTINGS } from '../src/storage/settings';
export { getDestination, DESTINATIONS } from '../src/destinations';
export { originPatternFor } from '../src/utils/push';
