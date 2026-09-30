// Re-exports the pure logic under test for scripts/verify-logic.mjs.
export { buildRequest, canSave, createSession, displayValue, enabledFields, fieldKind, missingRequired, saveBlocker } from '../src/types/capture';
export { mergeHighlight, normalizeSelection } from '../src/utils/normalize';
export { platformFromHostname, platformFromUrl } from '../src/utils/platform';
export { pickedText } from '../src/utils/pageText';
export { isConfigured, normalizeServer, originPattern, DEFAULT_SETTINGS } from '../src/storage/settings';
